import {
  DocumentData,
  DocumentReference,
  QueryDocumentSnapshot,
  WriteBatch,
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  limit as fsLimit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { BoardTemplate } from '../../data/templates';
import { ActivityLog, BoardData, CardItemData, ListConfig, UserGoal } from '../../types';
import { SEMANTIC_CARD_FIELDS } from './cardDiff';
import { chunk, stripUndefined } from './firestoreUtils';
import { hydrateBoard } from './hydrate';
import { planInsert, positionAtIndex } from './position';
import { BoardDoc, BoardSummary, CardDoc, ListDoc } from './types';
import {
  CreateBoardInput,
  CreateCardInput,
  CreateListInput,
  Unsubscribe,
  WorkspaceRepository,
} from './workspaceRepository';

function withId<T>(snap: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...(snap.data() as object) } as T;
}

function toSummary(board: BoardDoc): BoardSummary {
  return {
    id: board.id,
    name: board.name,
    description: board.description,
    icon: board.icon,
    category: board.category,
    theme: board.theme,
  };
}

function goalDocToItem(item: { id: string; ownerUid?: string } & Record<string, unknown>): UserGoal {
  const { ownerUid: _ownerUid, ...rest } = item;
  return rest as unknown as UserGoal;
}

function templateDocToItem(item: { id: string; ownerUid?: string } & Record<string, unknown>): BoardTemplate {
  const { ownerUid: _ownerUid, ...rest } = item;
  return rest as unknown as BoardTemplate;
}

function activityDocToItem(item: { id: string; ownerUid?: string; createdAt?: unknown } & Record<string, unknown>): ActivityLog {
  const { ownerUid: _ownerUid, createdAt: _createdAt, ...rest } = item;
  return rest as unknown as ActivityLog;
}

/**
 * Firestore-backed WorkspaceRepository. Card/list ordering uses a float
 * `position` field with 1024-unit gaps (see ./position.ts); this
 * implementation reads the current siblings, computes an insertion point via
 * `planInsert`, and renormalizes the whole sibling set in a batch when the
 * target gap has collapsed. That read-then-write is not transactional across
 * concurrent writers — acceptable at the single-user scale this app targets,
 * but a known limitation if multiple clients insert into the same list at
 * the exact same moment.
 */
export function createFirestoreRepository(uid: string): WorkspaceRepository {
  const boardsCol = collection(db, 'boards');
  const listsCol = collection(db, 'lists');
  const cardsCol = collection(db, 'cards');
  const goalsCol = collection(db, 'goals');
  const templatesCol = collection(db, 'templates');
  const activityCol = collection(db, 'activity');
  const userRef = doc(db, 'users', uid);

  async function commitInChunks<T>(items: T[], apply: (batch: WriteBatch, item: T) => void): Promise<void> {
    for (const group of chunk(items)) {
      const batch = writeBatch(db);
      group.forEach(item => apply(batch, item));
      await batch.commit();
    }
  }

  async function createListDoc(boardId: string, fields: Omit<ListConfig, 'id' | 'cards'>, position: number): Promise<string> {
    const ref = await addDoc(
      listsCol,
      stripUndefined({
        ...fields,
        ownerUid: uid,
        boardId,
        position,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    return ref.id;
  }

  async function createCardDoc(
    boardId: string,
    listId: string,
    fields: Omit<CardItemData, 'id' | 'createdAt' | 'updatedAt'>,
    position: number
  ): Promise<string> {
    const ref = await addDoc(
      cardsCol,
      stripUndefined({
        ...fields,
        ownerUid: uid,
        boardId,
        listId,
        position,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    return ref.id;
  }

  async function writeListWithCards(boardId: string, list: ListConfig, index: number): Promise<void> {
    const { id: _id, cards, ...listFields } = list;
    const listId = await createListDoc(boardId, listFields, positionAtIndex(index));
    if (cards && cards.length > 0) {
      for (let i = 0; i < cards.length; i++) {
        const { id: _cardId, createdAt: _createdAt, updatedAt: _updatedAt, ...cardFields } = cards[i];
        await createCardDoc(boardId, listId, cardFields, positionAtIndex(i));
      }
    }
  }

  return {
    kind: 'firestore',

    subscribeAllBoards(cb): Unsubscribe {
      let boardDocs: BoardDoc[] = [];
      let listDocs: ListDoc[] = [];
      let cardDocs: CardDoc[] = [];
      let haveBoards = false;
      let haveLists = false;
      let haveCards = false;

      const emit = () => {
        if (!haveBoards || !haveLists || !haveCards) return;
        const sortedBoards = [...boardDocs].sort((a, b) => a.position - b.position);
        cb(
          sortedBoards.map(b =>
            hydrateBoard(
              b,
              listDocs.filter(l => l.boardId === b.id),
              cardDocs.filter(c => c.boardId === b.id)
            )
          )
        );
      };

      const unsubBoards = onSnapshot(query(boardsCol, where('ownerUid', '==', uid)), snap => {
        boardDocs = snap.docs.map(d => withId<BoardDoc>(d));
        haveBoards = true;
        emit();
      });
      const unsubLists = onSnapshot(query(listsCol, where('ownerUid', '==', uid)), snap => {
        listDocs = snap.docs.map(d => withId<ListDoc>(d));
        haveLists = true;
        emit();
      });
      const unsubCards = onSnapshot(query(cardsCol, where('ownerUid', '==', uid)), snap => {
        cardDocs = snap.docs.map(d => withId<CardDoc>(d));
        haveCards = true;
        emit();
      });

      return () => {
        unsubBoards();
        unsubLists();
        unsubCards();
      };
    },

    subscribeBoardSummaries(cb): Unsubscribe {
      return onSnapshot(query(boardsCol, where('ownerUid', '==', uid)), snap => {
        const boards = snap.docs.map(d => withId<BoardDoc>(d)).sort((a, b) => a.position - b.position);
        cb(boards.map(toSummary));
      });
    },

    subscribeBoard(boardId, cb): Unsubscribe {
      let boardDoc: BoardDoc | null = null;
      let listDocs: ListDoc[] = [];
      let cardDocs: CardDoc[] = [];

      const emit = () => {
        if (!boardDoc) {
          cb(null);
          return;
        }
        cb(hydrateBoard(boardDoc, listDocs, cardDocs));
      };

      const unsubBoard = onSnapshot(doc(db, 'boards', boardId), snap => {
        boardDoc = snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as BoardDoc) : null;
        emit();
      });
      const unsubLists = onSnapshot(
        query(listsCol, where('ownerUid', '==', uid), where('boardId', '==', boardId)),
        snap => {
          listDocs = snap.docs.map(d => withId<ListDoc>(d));
          emit();
        }
      );
      const unsubCards = onSnapshot(
        query(cardsCol, where('ownerUid', '==', uid), where('boardId', '==', boardId)),
        snap => {
          cardDocs = snap.docs.map(d => withId<CardDoc>(d));
          emit();
        }
      );

      return () => {
        unsubBoard();
        unsubLists();
        unsubCards();
      };
    },

    subscribeGoals(cb): Unsubscribe {
      return onSnapshot(query(goalsCol, where('ownerUid', '==', uid)), snap => {
        const goals = snap.docs.map(d => goalDocToItem(withId(d)));
        goals.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        cb(goals);
      });
    },

    subscribeActivity(limitCount, cb): Unsubscribe {
      const q = query(activityCol, where('ownerUid', '==', uid), orderBy('createdAt', 'desc'), fsLimit(limitCount));
      return onSnapshot(q, snap => {
        cb(snap.docs.map(d => activityDocToItem(withId(d))));
      });
    },

    subscribeTemplates(cb): Unsubscribe {
      return onSnapshot(query(templatesCol, where('ownerUid', '==', uid)), snap => {
        cb(snap.docs.map(d => templateDocToItem(withId(d))));
      });
    },

    subscribeTagColors(cb): Unsubscribe {
      return onSnapshot(userRef, snap => {
        const data = snap.data();
        cb((data?.tagColors as Record<string, string>) ?? {});
      });
    },

    async createBoard(input: CreateBoardInput) {
      const existing = await getDocs(query(boardsCol, where('ownerUid', '==', uid)));
      const sorted = [...existing.docs].sort((a, b) => (a.data() as BoardDoc).position - (b.data() as BoardDoc).position);
      const positions = sorted.map(d => (d.data() as BoardDoc).position);
      const plan = planInsert(positions, positions.length);

      if (plan.renormalizedPositions) {
        await commitInChunks(
          sorted.map((d, i) => ({ ref: d.ref, position: plan.renormalizedPositions![i] })),
          (batch, u) => batch.update(u.ref, { position: u.position })
        );
      }

      const ref = await addDoc(
        boardsCol,
        stripUndefined({
          ownerUid: uid,
          name: input.name,
          description: input.description ?? 'Custom KB3.0 workspace created by user.',
          icon: input.icon ?? 'Layers',
          category: input.category,
          rbacRole: input.rbacRole ?? 'admin',
          feedForwardConnections: [],
          position: plan.position,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );

      if (input.lists && input.lists.length > 0) {
        for (let i = 0; i < input.lists.length; i++) {
          await writeListWithCards(ref.id, input.lists[i], i);
        }
      }

      return ref.id;
    },

    async updateBoard(boardId, patch) {
      await updateDoc(doc(db, 'boards', boardId), stripUndefined({ ...patch, updatedAt: serverTimestamp() }));
    },

    async deleteBoard(boardId) {
      const [listsSnap, cardsSnap] = await Promise.all([
        getDocs(query(listsCol, where('ownerUid', '==', uid), where('boardId', '==', boardId))),
        getDocs(query(cardsCol, where('ownerUid', '==', uid), where('boardId', '==', boardId))),
      ]);
      const refs: DocumentReference[] = [...listsSnap.docs.map(d => d.ref), ...cardsSnap.docs.map(d => d.ref)];
      await commitInChunks(refs, (batch, ref) => batch.delete(ref));
      await deleteDoc(doc(db, 'boards', boardId));
    },

    async createList(boardId, input: CreateListInput, at = 'end') {
      const existing = await getDocs(query(listsCol, where('ownerUid', '==', uid), where('boardId', '==', boardId)));
      const sorted = [...existing.docs].sort((a, b) => (a.data() as ListDoc).position - (b.data() as ListDoc).position);
      const positions = sorted.map(d => (d.data() as ListDoc).position);
      const index = at === 'start' ? 0 : positions.length;
      const plan = planInsert(positions, index);

      if (plan.renormalizedPositions) {
        await commitInChunks(
          sorted.map((d, i) => ({ ref: d.ref, position: plan.renormalizedPositions![i] })),
          (batch, u) => batch.update(u.ref, { position: u.position })
        );
      }

      const { cards, ...listFields } = input;
      const listId = await createListDoc(boardId, listFields, plan.position);

      if (cards && cards.length > 0) {
        for (let i = 0; i < cards.length; i++) {
          const { id: _cardId, createdAt: _createdAt, updatedAt: _updatedAt, ...cardFields } = cards[i];
          await createCardDoc(boardId, listId, cardFields, positionAtIndex(i));
        }
      }

      return listId;
    },

    async updateList(listId, patch) {
      await updateDoc(doc(db, 'lists', listId), stripUndefined({ ...patch, updatedAt: serverTimestamp() }));
    },

    async deleteList(listId) {
      const cardsSnap = await getDocs(query(cardsCol, where('ownerUid', '==', uid), where('listId', '==', listId)));
      await commitInChunks(cardsSnap.docs.map(d => d.ref), (batch, ref) => batch.delete(ref));
      await deleteDoc(doc(db, 'lists', listId));
    },

    async createCard(boardId, listId, input: CreateCardInput) {
      const existing = await getDocs(query(cardsCol, where('ownerUid', '==', uid), where('boardId', '==', boardId)));
      const listCards = existing.docs
        .filter(d => (d.data() as CardDoc).listId === listId)
        .sort((a, b) => (a.data() as CardDoc).position - (b.data() as CardDoc).position);
      const positions = listCards.map(d => (d.data() as CardDoc).position);
      const plan = planInsert(positions, positions.length);

      if (plan.renormalizedPositions) {
        await commitInChunks(
          listCards.map((d, i) => ({ ref: d.ref, position: plan.renormalizedPositions![i] })),
          (batch, u) => batch.update(u.ref, { position: u.position })
        );
      }

      return createCardDoc(
        boardId,
        listId,
        {
          status: 'todo',
          progress: 0,
          tags: [],
          widgets: [],
          prompt: '',
          subtasks: [],
          ...input,
        },
        plan.position
      );
    },

    async updateCard(cardId, patch) {
      const bumpRevision = Object.keys(patch).some(key => (SEMANTIC_CARD_FIELDS as string[]).includes(key));
      const data: Record<string, unknown> = stripUndefined({ ...patch, updatedAt: serverTimestamp() });
      if (bumpRevision) data.revision = increment(1);
      await updateDoc(doc(db, 'cards', cardId), data);
    },

    async moveCard(cardId, targetListId, index) {
      const targetListSnap = await getDoc(doc(db, 'lists', targetListId));
      if (!targetListSnap.exists()) return;
      const targetBoardId = (targetListSnap.data() as Omit<ListDoc, 'id'>).boardId;

      const cardsSnap = await getDocs(query(cardsCol, where('ownerUid', '==', uid), where('boardId', '==', targetBoardId)));
      const siblings = cardsSnap.docs
        .filter(d => (d.data() as CardDoc).listId === targetListId && d.id !== cardId)
        .sort((a, b) => (a.data() as CardDoc).position - (b.data() as CardDoc).position);
      const positions = siblings.map(d => (d.data() as CardDoc).position);
      const plan = planInsert(positions, index);

      const batch = writeBatch(db);
      if (plan.renormalizedPositions) {
        siblings.forEach((d, i) => batch.update(d.ref, { position: plan.renormalizedPositions![i] }));
      }
      batch.update(doc(db, 'cards', cardId), {
        listId: targetListId,
        boardId: targetBoardId,
        position: plan.position,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    },

    async deleteCard(cardId) {
      await deleteDoc(doc(db, 'cards', cardId));
    },

    async saveGoal(goal) {
      const { id, ...rest } = goal;
      await setDoc(doc(db, 'goals', id), stripUndefined({ ...rest, ownerUid: uid }), { merge: true });
      return id;
    },

    async deleteGoal(goalId) {
      await deleteDoc(doc(db, 'goals', goalId));
    },

    async saveTemplate(template) {
      const { id, ...rest } = template;
      await setDoc(doc(db, 'templates', id), stripUndefined({ ...rest, ownerUid: uid }));
      return id;
    },

    async updateTagColor(tag, colorKey) {
      const norm = tag.trim().toLowerCase();
      await setDoc(userRef, { tagColors: { [norm]: colorKey } }, { merge: true });
    },

    async renameTag(oldTag, newTag) {
      const oldNorm = oldTag.trim().toLowerCase();
      const newNorm = newTag.trim().toLowerCase();
      if (!newNorm || oldNorm === newNorm) return;

      const cardsSnap = await getDocs(query(cardsCol, where('ownerUid', '==', uid)));
      const updates: { ref: DocumentReference; tags: string[] }[] = [];
      cardsSnap.docs.forEach(d => {
        const data = d.data() as CardDoc;
        if (!data.tags || data.tags.length === 0) return;
        if (!data.tags.some(t => t.trim().toLowerCase() === oldNorm)) return;
        updates.push({
          ref: d.ref,
          tags: data.tags.map(t => (t.trim().toLowerCase() === oldNorm ? newTag.trim() : t)),
        });
      });
      await commitInChunks(updates, (batch, u) => batch.update(u.ref, { tags: u.tags, updatedAt: serverTimestamp() }));

      const userSnap = await getDoc(userRef);
      const tagColors = (userSnap.data()?.tagColors as Record<string, string>) ?? {};
      if (tagColors[oldNorm] !== undefined) {
        await updateDoc(userRef, {
          [`tagColors.${newNorm}`]: tagColors[oldNorm],
          [`tagColors.${oldNorm}`]: deleteField(),
        });
      }
    },

    async deleteTag(tag) {
      const norm = tag.trim().toLowerCase();
      const cardsSnap = await getDocs(query(cardsCol, where('ownerUid', '==', uid)));
      const updates: { ref: DocumentReference; tags: string[] }[] = [];
      cardsSnap.docs.forEach(d => {
        const data = d.data() as CardDoc;
        if (!data.tags || data.tags.length === 0) return;
        if (!data.tags.some(t => t.trim().toLowerCase() === norm)) return;
        updates.push({ ref: d.ref, tags: data.tags.filter(t => t.trim().toLowerCase() !== norm) });
      });
      await commitInChunks(updates, (batch, u) => batch.update(u.ref, { tags: u.tags, updatedAt: serverTimestamp() }));
    },

    async logActivity(entry) {
      await addDoc(activityCol, stripUndefined({ ...entry, ownerUid: uid, createdAt: serverTimestamp() }));
    },
  };
}
