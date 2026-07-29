import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ApiClientError } from '../../lib/api/client';
import { useAgents } from '../../state/AgentProvider';
import { useUiState } from '../../state/UiStateProvider';
import { useAutonomy } from '../runs/AutonomyContext';
import { useWorkspace } from '../../state/WorkspaceProvider';
import { buildOrchestratorContext } from '../../lib/orchestrator/context';
import { findSupersededByNewProposal } from '../../lib/orchestrator/proposals';
import { createThreadStore, type ThreadStore } from '../../lib/orchestrator/threadStore';
import type { HistoryEntry, OrchestratorMessage, OrchestratorThread } from '../../lib/orchestrator/types';
import { newId } from '../../shared/ids';
import type { PlanProposal } from '../../shared/contracts/goalPlan';
import type { UserGoal } from '../../types';
import { sendOrchestratorMessage } from './api';

const ACTIVE_THREAD_STORAGE_KEY = 'kb_orchestrator_active_thread';
const MAX_HISTORY_MESSAGES = 16;
const MAX_SUMMARY_CHARS = 500;

function buildGoalFromThread(thread: OrchestratorThread): UserGoal {
  const now = new Date().toISOString();
  return {
    id: newId('goal'),
    title: thread.title,
    description: '',
    outcome: `Successfully complete: ${thread.title}`,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    boardIds: [],
    boardId: null,
    planStatus: 'none',
    plan: null,
    appliedRefs: null,
    agentIds: [],
    progress: 0,
    progressDetail: null,
  };
}

export interface OrchestratorApi {
  threads: OrchestratorThread[];
  activeThread: OrchestratorThread | null;
  messages: OrchestratorMessage[];
  sending: boolean;
  applying: boolean;
  error: string | null;
  selectThread(threadId: string): void;
  createThread(): void;
  setThreadGoal(goalId: string | null): void;
  send(text: string): Promise<void>;
  /** Goal-first flow: opens a thread linked to the goal, reveals the dock, and
   *  sends the initial planning message so a proposal is waiting for review. */
  startGoalThread(goal: UserGoal): Promise<void>;
  /** Applies a pending proposal. `andRun` also enables goal autonomy (Phase 4 reads goal.autonomy). */
  applyProposal(message: OrchestratorMessage, plan: PlanProposal, andRun: boolean): Promise<void>;
  discardProposal(message: OrchestratorMessage): Promise<void>;
  refineProposal(message: OrchestratorMessage): Promise<void>;
}

/**
 * State engine for the OrchestratorDock: thread/messages subscriptions plus
 * the confirm-before-mutate pipeline. send() only ever *proposes* — a
 * PlanProposal is persisted on the assistant message with state 'pending'
 * and nothing touches boards or goals until applyProposal runs.
 *
 * Consumed through OrchestratorProvider (a single shared instance — the dock
 * and GoalHome must see the same threads and the same in-flight turn).
 */
export function useOrchestratorState(): OrchestratorApi {
  const { user } = useAuth();
  const workspace = useWorkspace();
  const { agents } = useAgents();
  const autonomy = useAutonomy();
  const ui = useUiState();

  const store: ThreadStore = useMemo(() => createThreadStore(user?.uid ?? null), [user?.uid]);

  const [threads, setThreads] = useState<OrchestratorThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_THREAD_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [messages, setMessages] = useState<OrchestratorMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => store.subscribeThreads(setThreads), [store]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    return store.subscribeMessages(activeThreadId, setMessages);
  }, [store, activeThreadId]);

  // Keep the persisted selection pointed at a thread that still exists.
  useEffect(() => {
    if (activeThreadId && threads.length > 0 && !threads.some(t => t.id === activeThreadId)) {
      setActiveThreadId(null);
    }
  }, [threads, activeThreadId]);

  const activeThread = threads.find(t => t.id === activeThreadId) ?? null;

  // Refs so async send/apply callbacks always see the latest snapshots.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  const selectThread = useCallback((threadId: string) => {
    setActiveThreadId(threadId);
    try {
      localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, threadId);
    } catch {
      // Non-persistent selection still works for this session.
    }
  }, []);

  const createThread = useCallback(() => {
    setActiveThreadId(null);
    setError(null);
  }, []);

  const setThreadGoal = useCallback(
    (goalId: string | null) => {
      if (!activeThreadId) return;
      store.updateThread(activeThreadId, { goalId }).catch(err => console.error('Failed to link goal to thread:', err));
    },
    [store, activeThreadId]
  );

  const sendToThread = useCallback(
    async (threadId: string, text: string) => {
      setSending(true);
      setError(null);
      try {
        await store.addMessage(threadId, { role: 'user', text, proposal: null });

        const context = buildOrchestratorContext({
          boards: workspace.boards,
          activeBoardId: workspace.activeBoardId,
          goals: workspace.goals,
          agents,
          autonomy: {
            enabled: autonomy.policy.enabled,
            maxRunsTotal: autonomy.policy.budget.maxRunsTotal,
            runsUsed: autonomy.policy.budget.runsUsed,
          },
          runs: [...autonomy.runs]
            .sort((a, b) => b.queuedAt - a.queuedAt)
            .map(r => ({
              id: r.id,
              cardTitle: r.cardTitle,
              status: r.status,
              createdAt: new Date(r.queuedAt).toISOString(),
            })),
        });

        const thread = threadsRef.current.find(t => t.id === threadId) ?? null;
        const history: HistoryEntry[] = messagesRef.current
          .slice(-MAX_HISTORY_MESSAGES)
          .map(m => ({ role: m.role, text: m.text }));

        const response = await sendOrchestratorMessage({
          threadId,
          message: text,
          context,
          history,
          summary: thread?.summary ?? '',
        });

        // Supersede earlier pending proposals before the new pending one lands,
        // so only the newest plan in the thread remains applicable.
        for (const messageId of findSupersededByNewProposal(messagesRef.current).messageIds) {
          await store.setProposalState(threadId, messageId, 'superseded');
        }

        await store.addMessage(threadId, {
          role: 'assistant',
          text: response.summary,
          proposal: {
            id: newId('prop'),
            plan: response.proposal,
            state: 'pending',
            createdAt: new Date().toISOString(),
          },
        });

        // Rolling summary: heuristic only — no extra model call. Keeps the
        // thread's intent plus the latest plan summary within a small budget.
        const nextSummary = `Goal: ${thread?.title ?? text.slice(0, 60)}. Latest: ${response.summary}`.slice(
          0,
          MAX_SUMMARY_CHARS
        );
        await store.updateThread(threadId, { summary: nextSummary });

        workspace.logActivity(`Orchestrator proposed a plan: "${text.slice(0, 45)}"`);
      } catch (err) {
        // AUTH_REQUIRED defaults to true (Phase 4), so signed-out users get a
        // 401 from apiPost — say so plainly instead of showing a raw error.
        if (err instanceof ApiClientError && err.status === 401) {
          setError('Sign in to use the Orchestrator — the AI API requires authentication.');
        } else {
          setError(err instanceof Error ? err.message : 'Error communicating with the Orchestrator');
        }
      } finally {
        setSending(false);
      }
    },
    [store, workspace, agents, autonomy]
  );

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      let threadId = activeThreadId;
      if (!threadId) {
        threadId = await store.createThread({
          title: trimmed.slice(0, 48) + (trimmed.length > 48 ? '…' : ''),
          goalId: null,
        });
        selectThread(threadId);
      }

      await sendToThread(threadId, trimmed);
    },
    [store, activeThreadId, sending, selectThread, sendToThread]
  );

  const startGoalThread = useCallback(
    async (goal: UserGoal) => {
      const threadId = await store.createThread({ title: goal.title, goalId: goal.id });
      selectThread(threadId);
      ui.setDockOpen(true);
      const text = [
        `Goal: ${goal.title}`,
        goal.description.trim(),
        `Desired outcome: ${goal.outcome}`,
      ]
        .filter(Boolean)
        .join('\n');
      await sendToThread(threadId, text);
    },
    [store, selectThread, ui, sendToThread]
  );

  const applyProposal = useCallback(
    async (message: OrchestratorMessage, plan: PlanProposal, andRun: boolean) => {
      if (!activeThread || !message.proposal || message.proposal.state !== 'pending' || applying) return;

      setApplying(true);
      setError(null);
      try {
        let goal: UserGoal | null = activeThread.goalId
          ? workspace.goals.find(g => g.id === activeThread.goalId) ?? null
          : null;

        if (activeThread.goalId && !goal) {
          throw new Error('The goal linked to this thread no longer exists. Unlink it and try again.');
        }

        if (!goal) {
          // Threads start goal-less; applying is what anchors the plan to a
          // goal (and, via applyGoalPlan, to that goal's board — never the
          // incidentally-active one).
          goal = buildGoalFromThread(activeThread);
          workspace.handleSaveGoal(goal);
          await store.updateThread(activeThread.id, { goalId: goal.id });
        }

        // Apply & Run: opt this goal into autonomy — the per-goal override
        // read by src/lib/autonomy/eligibility.ts.
        const goalForApply = andRun
          ? { ...goal, plan, autonomy: { enabled: true } }
          : { ...goal, plan };

        await workspace.handleApplyGoalPlan(goalForApply);
        await store.setProposalState(activeThread.id, message.id, 'applied');
        workspace.logActivity(`Applied orchestrator plan for "${goal.title}"${andRun ? ' with autonomy enabled' : ''}`);
        ui.setAppMode('board');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply the proposed plan');
      } finally {
        setApplying(false);
      }
    },
    [activeThread, applying, store, ui, workspace]
  );

  const discardProposal = useCallback(
    async (message: OrchestratorMessage) => {
      if (!activeThread || message.proposal?.state !== 'pending') return;
      await store.setProposalState(activeThread.id, message.id, 'discarded');
    },
    [activeThread, store]
  );

  const refineProposal = useCallback(
    async (message: OrchestratorMessage) => {
      if (!activeThread || message.proposal?.state !== 'pending') return;
      // Mark refined now; the user's next message produces a fresh pending
      // proposal, leaving this one as a decision record in the thread.
      await store.setProposalState(activeThread.id, message.id, 'refined');
    },
    [activeThread, store]
  );

  return {
    threads,
    activeThread,
    messages,
    sending,
    applying,
    error,
    selectThread,
    createThread,
    setThreadGoal,
    send,
    startGoalThread,
    applyProposal,
    discardProposal,
    refineProposal,
  };
}
