import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AgentRun } from '../../lib/autonomy/types';
import type { BoardData, UserGoal } from '../../types';

/**
 * We3 guest sharing: a `goalShares/{token}` doc is the capability — anyone
 * holding the (unguessable) link can read it, plus its `comments/`
 * subcollection. The doc carries a denormalized snapshot of the goal's board
 * so guests never touch owner-scoped collections; the owner refreshes the
 * snapshot on demand. Revoking deletes the share and every guest loses
 * access (comments rules also require the parent share to exist).
 */

export interface ShareSnapshotCard {
  title: string;
  status: string;
  progress: number;
}

export interface ShareSnapshotList {
  title: string;
  cards: ShareSnapshotCard[];
}

export interface ShareSnapshotRun {
  cardTitle: string;
  status: string;
}

export interface ShareSnapshot {
  goalTitle: string;
  goalDescription: string;
  outcome: string;
  progress: number;
  lists: ShareSnapshotList[];
  recentRuns: ShareSnapshotRun[];
  updatedAt: string;
}

export interface ShareDoc {
  goalId: string;
  boardId: string | null;
  ownerUid: string;
  createdAt: string;
  snapshot: ShareSnapshot;
}

export interface ShareComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

const SHARE_URL_PREFIX = '#/share/';

export function shareUrl(token: string): string {
  return `${window.location.origin}/${SHARE_URL_PREFIX}${token}`;
}

export function parseShareHash(hash: string): string | null {
  const match = hash.match(/^#\/share\/([A-Za-z0-9_-]{10,})$/);
  return match ? match[1] : null;
}

function newShareToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildSnapshot(goal: UserGoal, board: BoardData | null, runs: AgentRun[]): ShareSnapshot {
  return {
    goalTitle: goal.title,
    goalDescription: goal.description,
    outcome: goal.outcome,
    progress: goal.progress,
    lists: (board?.lists ?? []).map(list => ({
      title: list.title,
      cards: list.cards.map(card => ({
        title: card.title,
        status: card.status,
        progress: card.progress ?? 0,
      })),
    })),
    recentRuns: runs
      .slice()
      .sort((a, b) => b.queuedAt - a.queuedAt)
      .slice(0, 10)
      .map(run => ({ cardTitle: run.cardTitle, status: run.status })),
    updatedAt: new Date().toISOString(),
  };
}

/** Creates a share link for a goal and returns the token. */
export async function createShare(goal: UserGoal, board: BoardData | null, runs: AgentRun[], uid: string): Promise<string> {
  const token = newShareToken();
  const share: ShareDoc = {
    goalId: goal.id,
    boardId: goal.boardId,
    ownerUid: uid,
    createdAt: new Date().toISOString(),
    snapshot: buildSnapshot(goal, board, runs),
  };
  await setDoc(doc(db, 'goalShares', token), share);
  return token;
}

export async function refreshShareSnapshot(token: string, snapshot: ShareSnapshot): Promise<void> {
  await updateDoc(doc(db, 'goalShares', token), { snapshot });
}

export async function revokeShare(token: string): Promise<void> {
  await deleteDoc(doc(db, 'goalShares', token));
}

export async function getShare(token: string): Promise<ShareDoc | null> {
  const snap = await getDoc(doc(db, 'goalShares', token));
  return snap.exists() ? (snap.data() as ShareDoc) : null;
}

export function subscribeComments(token: string, cb: (comments: ShareComment[]) => void): () => void {
  const q = query(collection(db, 'goalShares', token, 'comments'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ShareComment, 'id'>) })));
  });
}

export async function postComment(token: string, author: string, text: string): Promise<void> {
  const commentsCol = collection(db, 'goalShares', token, 'comments');
  await setDoc(doc(commentsCol), {
    author: author.slice(0, 80),
    text: text.slice(0, 2000),
    createdAt: new Date().toISOString(),
  });
}
