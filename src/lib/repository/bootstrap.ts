import { collection, doc, runTransaction, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { BoardTemplate } from '../../data/templates';
import { INITIAL_BOARDS } from '../../data/initialData';
import { newId } from '../../shared/ids';
import { BoardData, UserGoal } from '../../types';
import { chunk, stripUndefined } from './firestoreUtils';
import { positionAtIndex } from './position';

const GOALS_STORAGE_KEY = 'evo_kanban_goals';
const TEMPLATES_STORAGE_KEY = 'evo_kanban_custom_templates';
const TAG_COLORS_STORAGE_KEY = 'kb3_custom_tag_colors';

export interface BootstrapResult {
  seeded: boolean;
  boardCount: number;
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Atomically claims the right to seed this user's workspace by checking and
 * setting `users/{uid}.seededAt` inside a transaction. React StrictMode
 * double-fires effects in dev, so a plain read-then-write guard would race
 * and seed twice; only one concurrent caller can win this transaction.
 *
 * Note: the claim itself is atomic, but the bulk seeding writes below happen
 * *after* it commits — if those writes fail partway (e.g. a dropped
 * connection), `seededAt` is already set and a retry will skip seeding
 * rather than duplicate it. Preferring "no duplicate boards" over "guaranteed
 * complete seed" is the intended tradeoff here.
 */
async function claimSeeding(uid: string): Promise<boolean> {
  const userRef = doc(db, 'users', uid);
  return runTransaction(db, async tx => {
    const snap = await tx.get(userRef);
    const data = snap.exists() ? snap.data() : undefined;
    if (data?.seededAt) return false;
    tx.set(
      userRef,
      {
        ownerUid: uid,
        seededAt: serverTimestamp(),
        tagColors: data?.tagColors ?? {},
      },
      { merge: true }
    );
    return true;
  });
}

export async function bootstrapWorkspace(uid: string, seedBoards: BoardData[] = INITIAL_BOARDS): Promise<BootstrapResult> {
  const claimed = await claimSeeding(uid);
  if (!claimed) return { seeded: false, boardCount: 0 };

  const boardsCol = collection(db, 'boards');
  const listsCol = collection(db, 'lists');
  const cardsCol = collection(db, 'cards');
  const goalsCol = collection(db, 'goals');
  const templatesCol = collection(db, 'templates');

  const ops: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = [];

  seedBoards.forEach((board, boardIndex) => {
    const boardId = newId('board');
    const { lists, id: _origBoardId, ...boardFields } = board;
    ops.push({
      ref: doc(boardsCol, boardId),
      data: stripUndefined({
        ...boardFields,
        ownerUid: uid,
        position: positionAtIndex(boardIndex),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    });

    lists.forEach((list, listIndex) => {
      const listId = newId('list');
      const { cards, id: _origListId, ...listFields } = list;
      ops.push({
        ref: doc(listsCol, listId),
        data: stripUndefined({
          ...listFields,
          ownerUid: uid,
          boardId,
          position: positionAtIndex(listIndex),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      });

      cards.forEach((card, cardIndex) => {
        const cardId = newId('card');
        const { id: _origCardId, createdAt: _createdAt, updatedAt: _updatedAt, ...cardFields } = card;
        ops.push({
          ref: doc(cardsCol, cardId),
          data: stripUndefined({
            ...cardFields,
            ownerUid: uid,
            boardId,
            listId,
            position: positionAtIndex(cardIndex),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        });
      });
    });
  });

  const goals = readLocalJson<UserGoal[]>(GOALS_STORAGE_KEY, []);
  goals.forEach(goal => {
    const { id, ...rest } = goal;
    ops.push({ ref: doc(goalsCol, id), data: stripUndefined({ ...rest, ownerUid: uid }) });
  });

  const templates = readLocalJson<BoardTemplate[]>(TEMPLATES_STORAGE_KEY, []);
  templates.forEach(template => {
    const { id, ...rest } = template;
    ops.push({ ref: doc(templatesCol, id), data: stripUndefined({ ...rest, ownerUid: uid }) });
  });

  for (const group of chunk(ops)) {
    const batch = writeBatch(db);
    group.forEach(op => batch.set(op.ref, op.data, { merge: true }));
    await batch.commit();
  }

  const tagColors = readLocalJson<Record<string, string>>(TAG_COLORS_STORAGE_KEY, {});
  if (Object.keys(tagColors).length > 0) {
    await setDoc(doc(db, 'users', uid), { tagColors }, { merge: true });
  }

  return { seeded: true, boardCount: seedBoards.length };
}
