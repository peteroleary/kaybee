import {
  Timestamp,
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { newId } from '../../shared/ids';
import { stripUndefined } from '../repository/firestoreUtils';
import type { Unsubscribe } from '../repository/workspaceRepository';
import type { OrchestratorMessage, OrchestratorThread, ProposalState } from './types';

/**
 * Persistence seam for orchestrator threads/messages, mirroring the
 * WorkspaceRepository pattern (see src/lib/repository/firestoreRepository.ts):
 * Firestore scoped by `ownerUid` when signed in, a localStorage-backed memory
 * store when signed out. Kept as its own module rather than new methods on
 * WorkspaceRepository because Phase 6's file ownership excludes
 * src/lib/repository/** — the shapes and conventions are identical, so
 * folding it into the repository later is mechanical.
 *
 * Layout (per the plan's data model): root `threads/{id}` collection with a
 * `messages/{id}` subcollection — the one sanctioned subcollection.
 */

export interface ThreadStore {
  subscribeThreads(cb: (threads: OrchestratorThread[]) => void): Unsubscribe;
  subscribeMessages(threadId: string, cb: (messages: OrchestratorMessage[]) => void): Unsubscribe;
  createThread(input: { title: string; goalId: string | null }): Promise<string>;
  updateThread(
    threadId: string,
    patch: Partial<Pick<OrchestratorThread, 'title' | 'goalId' | 'summary'>>
  ): Promise<void>;
  addMessage(threadId: string, message: Omit<OrchestratorMessage, 'id' | 'createdAt'>): Promise<string>;
  setProposalState(threadId: string, messageId: string, state: ProposalState): Promise<void>;
}

// ---------------------------------------------------------------------------
// Firestore-backed store (signed in)
// ---------------------------------------------------------------------------

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function createFirestoreThreadStore(uid: string): ThreadStore {
  const threadsCol = collection(db, 'threads');

  return {
    subscribeThreads(cb) {
      return onSnapshot(query(threadsCol, where('ownerUid', '==', uid)), snap => {
        const threads = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title ?? 'Untitled thread',
            goalId: data.goalId ?? null,
            summary: data.summary ?? '',
            createdAt: timestampToIso(data.createdAt),
            updatedAt: timestampToIso(data.updatedAt),
          } as OrchestratorThread;
        });
        threads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        cb(threads);
      });
    },

    subscribeMessages(threadId, cb) {
      const messagesCol = collection(db, 'threads', threadId, 'messages');
      // ownerUid-constrained (rules require it) and sorted client-side so no
      // composite index is needed.
      return onSnapshot(query(messagesCol, where('ownerUid', '==', uid)), snap => {
        const messages = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            role: data.role ?? 'user',
            text: data.text ?? '',
            proposal: data.proposal ?? null,
            createdAt: timestampToIso(data.createdAt),
          } as OrchestratorMessage;
        });
        messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        cb(messages);
      });
    },

    async createThread(input) {
      const id = newId('thread');
      await setDoc(doc(threadsCol, id), {
        ownerUid: uid,
        title: input.title,
        goalId: input.goalId,
        summary: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return id;
    },

    async updateThread(threadId, patch) {
      await updateDoc(doc(threadsCol, threadId), stripUndefined({ ...patch, updatedAt: serverTimestamp() }));
    },

    async addMessage(threadId, message) {
      const messagesCol = collection(db, 'threads', threadId, 'messages');
      const ref = await addDoc(messagesCol, {
        ownerUid: uid,
        role: message.role,
        text: message.text,
        proposal: message.proposal ?? null,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    },

    async setProposalState(threadId, messageId, state) {
      await updateDoc(doc(db, 'threads', threadId, 'messages', messageId), { 'proposal.state': state });
    },
  };
}

// ---------------------------------------------------------------------------
// localStorage-backed store (signed out) — mirrors memoryRepository's posture
// ---------------------------------------------------------------------------

const THREADS_STORAGE_KEY = 'kb_orchestrator_threads';
const MESSAGES_STORAGE_KEY = 'kb_orchestrator_messages';

type StoredThreads = Record<string, OrchestratorThread>;
type StoredMessages = Record<string, OrchestratorMessage[]>;

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persistJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full/unavailable — the in-memory copy still serves this session.
  }
}

function createMemoryThreadStore(): ThreadStore {
  let threads: StoredThreads = loadJson<StoredThreads>(THREADS_STORAGE_KEY, {});
  let messages: StoredMessages = loadJson<StoredMessages>(MESSAGES_STORAGE_KEY, {});

  const threadSubs = new Set<(t: OrchestratorThread[]) => void>();
  const messageSubs = new Map<string, Set<(m: OrchestratorMessage[]) => void>>();

  const sortedThreads = () =>
    Object.values(threads).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const emitThreads = () => threadSubs.forEach(cb => cb(sortedThreads()));
  const emitMessages = (threadId: string) =>
    messageSubs.get(threadId)?.forEach(cb => cb(messages[threadId] ?? []));

  const persist = () => {
    persistJson(THREADS_STORAGE_KEY, threads);
    persistJson(MESSAGES_STORAGE_KEY, messages);
  };

  return {
    subscribeThreads(cb) {
      threadSubs.add(cb);
      cb(sortedThreads());
      return () => threadSubs.delete(cb);
    },

    subscribeMessages(threadId, cb) {
      let subs = messageSubs.get(threadId);
      if (!subs) {
        subs = new Set();
        messageSubs.set(threadId, subs);
      }
      subs.add(cb);
      cb(messages[threadId] ?? []);
      return () => subs.delete(cb);
    },

    async createThread(input) {
      const now = new Date().toISOString();
      const id = newId('thread');
      threads[id] = { id, title: input.title, goalId: input.goalId, summary: '', createdAt: now, updatedAt: now };
      messages[id] = [];
      persist();
      emitThreads();
      return id;
    },

    async updateThread(threadId, patch) {
      const thread = threads[threadId];
      if (!thread) return;
      threads[threadId] = { ...thread, ...patch, updatedAt: new Date().toISOString() };
      persist();
      emitThreads();
    },

    async addMessage(threadId, message) {
      const id = newId('msg');
      const list = messages[threadId] ?? [];
      messages[threadId] = [...list, { ...message, id, createdAt: new Date().toISOString() }];
      const thread = threads[threadId];
      if (thread) threads[threadId] = { ...thread, updatedAt: new Date().toISOString() };
      persist();
      emitThreads();
      emitMessages(threadId);
      return id;
    },

    async setProposalState(threadId, messageId, state) {
      const list = messages[threadId] ?? [];
      messages[threadId] = list.map(m =>
        m.id === messageId && m.proposal ? { ...m, proposal: { ...m.proposal, state } } : m
      );
      persist();
      emitMessages(threadId);
    },
  };
}

export function createThreadStore(uid: string | null): ThreadStore {
  return uid ? createFirestoreThreadStore(uid) : createMemoryThreadStore();
}
