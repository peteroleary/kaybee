import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { stripUndefined } from '../lib/repository/firestoreUtils';
import { buildBuiltInAgents } from '../lib/agents/builtIns';
import { AgentAssignment, resolveAgentAssignment } from '../lib/agents/resolveAssignment';
import { AgentDoc } from '../lib/agents/types';
import { MODELS } from '../shared/models';
import { newId } from '../shared/ids';

export interface AgentApi {
  agents: AgentDoc[];
  loading: boolean;
  saveAgent(agent: Partial<AgentDoc> & { id?: string }): Promise<string>;
  deleteAgent(id: string): Promise<void>;
  resolveAssignment(hint: string | undefined): AgentAssignment;
}

const AgentContext = createContext<AgentApi | null>(null);

function withDefaults(ownerUid: string, input: Partial<AgentDoc> & { id?: string }): AgentDoc {
  const now = new Date().toISOString();
  return {
    id: input.id ?? newId('agent'),
    ownerUid,
    kind: input.kind ?? 'agent',
    slug: input.slug ?? newId('agent'),
    name: input.name ?? 'New Agent',
    description: input.description ?? '',
    avatar: input.avatar,
    entityType: input.entityType ?? (input.kind === 'human' ? 'human' : 'agent'),
    capabilities: input.capabilities ?? [],
    status: input.status ?? 'idle',
    autoExecute: input.autoExecute ?? false,
    requiresApproval: input.requiresApproval ?? true,
    model: input.model ?? MODELS.agentRun,
    systemPrompt: input.systemPrompt ?? '',
    isBuiltIn: input.isBuiltIn ?? false,
    lastExecutionAt: input.lastExecutionAt ?? null,
    runCount: input.runCount ?? 0,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * Atomically claims the right to seed this user's agent registry, mirroring
 * bootstrapWorkspace's claim-then-seed pattern so React StrictMode's double
 * effect fire (and multiple tabs) can't seed built-in agents twice.
 */
async function claimAgentSeeding(uid: string): Promise<boolean> {
  const userRef = doc(db, 'users', uid);
  return runTransaction(db, async tx => {
    const snap = await tx.get(userRef);
    const data = snap.exists() ? snap.data() : undefined;
    if (data?.agentsSeededAt) return false;
    tx.set(userRef, { ownerUid: uid, agentsSeededAt: serverTimestamp() }, { merge: true });
    return true;
  });
}

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [memoryAgents, setMemoryAgents] = useState<AgentDoc[]>(() => buildBuiltInAgents('local', 'You'));
  const [firestoreAgents, setFirestoreAgents] = useState<AgentDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const seedAttempted = useRef(false);

  useEffect(() => {
    if (!user) {
      setFirestoreAgents([]);
      seedAttempted.current = false;
      return;
    }

    setLoading(true);
    const agentsCol = collection(db, 'agents');
    const unsub = onSnapshot(query(agentsCol, where('ownerUid', '==', user.uid)), snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...(d.data() as object) } as AgentDoc));
      setFirestoreAgents(docs);
      setLoading(false);

      if (docs.length === 0 && !seedAttempted.current) {
        seedAttempted.current = true;
        claimAgentSeeding(user.uid)
          .then(async claimed => {
            if (!claimed) return;
            const builtIns = buildBuiltInAgents(user.uid, user.displayName);
            const batch = writeBatch(db);
            builtIns.forEach(agent => {
              const { id, ...rest } = agent;
              batch.set(doc(agentsCol, id), stripUndefined({ ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
            });
            await batch.commit();
          })
          .catch(err => console.error('Failed to seed built-in agents:', err));
      }
    });

    return () => unsub();
  }, [user?.uid]);

  const agents = user ? firestoreAgents : memoryAgents;

  const saveAgent = useCallback(
    async (input: Partial<AgentDoc> & { id?: string }): Promise<string> => {
      if (!user) {
        let savedId = input.id ?? '';
        setMemoryAgents(prev => {
          const idx = input.id ? prev.findIndex(a => a.id === input.id) : -1;
          if (idx >= 0) {
            const updated: AgentDoc = { ...prev[idx], ...input, updatedAt: new Date().toISOString() };
            savedId = updated.id;
            return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
          }
          const created = withDefaults('local', input);
          savedId = created.id;
          return [...prev, created];
        });
        return savedId;
      }

      const agentsCol = collection(db, 'agents');
      if (input.id) {
        const { id, ...rest } = input;
        await setDoc(doc(agentsCol, id), stripUndefined({ ...rest, ownerUid: user.uid, updatedAt: serverTimestamp() }), {
          merge: true,
        });
        return id;
      }

      const created = withDefaults(user.uid, input);
      const { id, ...rest } = created;
      await setDoc(doc(agentsCol, id), stripUndefined({ ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
      return id;
    },
    [user]
  );

  const deleteAgent = useCallback(
    async (id: string): Promise<void> => {
      if (!user) {
        setMemoryAgents(prev => prev.filter(a => a.id !== id));
        return;
      }
      await deleteDoc(doc(db, 'agents', id));
    },
    [user]
  );

  const resolveAssignmentFn = useCallback((hint: string | undefined) => resolveAgentAssignment(hint, agents), [agents]);

  const value: AgentApi = {
    agents,
    loading: user ? loading : false,
    saveAgent,
    deleteAgent,
    resolveAssignment: resolveAssignmentFn,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};

export function useAgents(): AgentApi {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgents must be used within AgentProvider');
  return ctx;
}
