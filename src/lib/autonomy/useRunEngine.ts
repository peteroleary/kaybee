import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { AgentDoc } from '../agents/types';
import type { BoardData, CardItemData, UserGoal } from '../../types';
import type { CreateCardInput } from '../repository/workspaceRepository';
import { createLocalRunCoordinator, type BlockedCard, type RunCoordinator } from './coordinator';
import { HttpAgentExecutor } from './executor';
import { createLeaderElection } from './leaderElection';
import { createFirestoreRunStore } from './runStore';
import { DEFAULT_AUTONOMY_POLICY, type AgentRun, type AutonomyPolicy } from './types';

export interface AutonomyEngineApi {
  /** False when signed out: runs/policy persist in Firestore, which requires auth. */
  available: boolean;
  isLeader: boolean;
  policy: AutonomyPolicy;
  runs: AgentRun[];
  runningCount: number;
  queuedCount: number;
  /** Cards the last evaluation declined, with the reason ("why isn't this running?"). */
  blocked: BlockedCard[];
  setAutonomyEnabled(enabled: boolean): Promise<void>;
  savePolicy(patch: Partial<AutonomyPolicy>): Promise<void>;
  runCardNow(cardId: string): Promise<string | null>;
  cancelRun(runId: string): Promise<void>;
}

const DISABLED_API: AutonomyEngineApi = {
  available: false,
  isLeader: false,
  policy: DEFAULT_AUTONOMY_POLICY,
  runs: [],
  runningCount: 0,
  queuedCount: 0,
  blocked: [],
  setAutonomyEnabled: async () => undefined,
  savePolicy: async () => undefined,
  runCardNow: async () => null,
  cancelRun: async () => undefined,
};

export interface UseRunEngineArgs {
  uid: string | null;
  boards: BoardData[];
  goals: UserGoal[];
  routeCard: (targetBoardId: string, targetListId: string, input: CreateCardInput, sourceCard: CardItemData) => void;
  logActivity: (action: string, cardTitle?: string) => void;
}

/**
 * Mounts the client-side run engine for the signed-in user.
 *
 * === SERVER SWAP POINT ===
 * The future server-side engine replaces the next two statements with a
 * `ServerRunCoordinator` whose requestEvaluation is a no-op and whose
 * runCardNow just enqueues; a Cloud Function claims/executes/settles runs
 * through the same RunStore + AgentExecutor contracts. The UI only reads
 * `runs` and card executionStatus — it does not change.
 */
export function useRunEngine(args: UseRunEngineArgs): AutonomyEngineApi {
  const { uid, boards, goals } = args;

  const [policy, setPolicy] = useState<AutonomyPolicy>(DEFAULT_AUTONOMY_POLICY);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [agents, setAgents] = useState<AgentDoc[]>([]);
  const [blocked, setBlocked] = useState<BlockedCard[]>([]);
  const [isLeader, setIsLeader] = useState(false);

  const clientId = useMemo(() => `tab_${Math.random().toString(36).slice(2, 10)}`, []);

  // Callback refs so the coordinator never needs re-creating when the
  // provider re-renders with fresh closures.
  const routeCardRef = useRef(args.routeCard);
  const logActivityRef = useRef(args.logActivity);
  useEffect(() => {
    routeCardRef.current = args.routeCard;
    logActivityRef.current = args.logActivity;
  });

  const store = useMemo(() => (uid ? createFirestoreRunStore(uid) : null), [uid]);

  const election = useMemo(
    () => (uid ? createLeaderElection(`kaybee-autonomy-${uid}`, clientId) : null),
    [uid, clientId],
  );
  const electionRef = useRef(election);
  useEffect(() => {
    electionRef.current = election;
  }, [election]);

  const coordinator: RunCoordinator | null = useMemo(() => {
    if (!store || !uid) return null;
    return createLocalRunCoordinator({
      store,
      executor: new HttpAgentExecutor(),
      clientId,
      ownerUid: uid,
      isLeader: () => electionRef.current?.isLeader() ?? true,
      routeCard: (boardId, listId, input, card) => routeCardRef.current(boardId, listId, input, card),
      logActivity: (action, title) => logActivityRef.current(action, title),
      onEvaluated: info => setBlocked(info.blocked),
    });
  }, [store, uid, clientId]);

  // Engine lifecycle — idempotent start/stop so React StrictMode's dev
  // double-invoke mounts cleanly and tears down for real.
  useEffect(() => {
    if (!coordinator || !election) return;
    election.start();
    coordinator.start();
    const leaderPoll = setInterval(() => setIsLeader(election.isLeader()), 2_000);
    setIsLeader(election.isLeader());
    return () => {
      clearInterval(leaderPoll);
      coordinator.stop();
      election.stop();
      setIsLeader(false);
    };
  }, [coordinator, election]);

  // Data subscriptions — pushed into both React state (for the UI) and the
  // coordinator snapshot (for decisions).
  useEffect(() => {
    if (!store) return;
    const unsubRuns = store.subscribeRuns(setRuns);
    const unsubPolicy = store.subscribePolicy(setPolicy);
    return () => {
      unsubRuns();
      unsubPolicy();
    };
  }, [store]);

  useEffect(() => {
    if (!uid) {
      setAgents([]);
      return;
    }
    return onSnapshot(query(collection(db, 'agents'), where('ownerUid', '==', uid)), snap => {
      setAgents(snap.docs.map(d => ({ id: d.id, ...(d.data() as object) }) as AgentDoc));
    });
  }, [uid]);

  useEffect(() => {
    coordinator?.updateSnapshot({ boards });
  }, [coordinator, boards]);
  useEffect(() => {
    coordinator?.updateSnapshot({ goals });
  }, [coordinator, goals]);
  useEffect(() => {
    coordinator?.updateSnapshot({ agents });
  }, [coordinator, agents]);
  useEffect(() => {
    coordinator?.updateSnapshot({ policy });
  }, [coordinator, policy]);
  useEffect(() => {
    coordinator?.updateSnapshot({ runs });
  }, [coordinator, runs]);

  const api = useMemo<AutonomyEngineApi>(() => {
    if (!store || !coordinator) return DISABLED_API;
    return {
      available: true,
      isLeader,
      policy,
      runs,
      runningCount: runs.filter(r => r.status === 'running').length,
      queuedCount: runs.filter(r => r.status === 'queued').length,
      blocked,
      setAutonomyEnabled: enabled => store.savePolicy({ enabled }),
      savePolicy: patch => store.savePolicy(patch),
      runCardNow: cardId => coordinator.runCardNow(cardId),
      cancelRun: runId => coordinator.cancelRun(runId),
    };
  }, [store, coordinator, isLeader, policy, runs, blocked]);

  return api;
}
