import type { AgentDoc } from '../agents/types';
import type { BoardData, UserGoal } from '../../types';

/**
 * Capped orchestrator context builder. Replaces the old "POST the entire
 * nested board" payload (every widget, comment, time log) with an explicit,
 * budgeted text block the model actually reads. Section sizes are capped
 * (lists, card titles, goals, agents, runs) and the whole block is assembled
 * line-by-line against MAX_CONTEXT_CHARS — a line that would overflow the
 * budget ends the block with a truncation marker, so the cap is a real,
 * reachable guard rather than a theoretical one.
 */

export const MAX_LISTS = 12;
export const MAX_CARD_TITLES_PER_LIST = 5;
export const MAX_GOALS = 10;
export const MAX_AGENTS = 20;
export const MAX_RUNS = 5;
export const MAX_CONTEXT_CHARS = 12_000;

const TRUNCATION_MARKER = '\n… [context truncated to fit budget]';

/** Minimal autonomy shape — Phase 4 owns the real AutonomyPolicy type. */
export interface ContextAutonomy {
  enabled: boolean;
  maxRunsTotal?: number;
  runsUsed?: number;
}

/** Minimal run shape — Phase 4 owns the real AgentRun record. */
export interface ContextRun {
  id: string;
  cardTitle?: string;
  status: string;
  createdAt?: string;
}

export interface OrchestratorContextInput {
  boards: BoardData[];
  activeBoardId: string | null;
  goals: UserGoal[];
  agents: AgentDoc[];
  autonomy?: ContextAutonomy | null;
  runs?: ContextRun[];
}

export function buildOrchestratorContext(input: OrchestratorContextInput): string {
  const { boards, activeBoardId, goals, agents, autonomy, runs } = input;
  const activeBoard = boards.find(b => b.id === activeBoardId) ?? null;

  const totalLists = boards.reduce((n, b) => n + b.lists.length, 0);
  const totalCards = boards.reduce((n, b) => n + b.lists.reduce((m, l) => m + l.cards.length, 0), 0);
  const activeGoals = goals.filter(g => g.status === 'active');

  const lines: string[] = [];

  lines.push(
    `Workspace: ${boards.length} boards, ${totalLists} lists, ${totalCards} cards, ${activeGoals.length} active goals, ${agents.length} agents`
  );

  if (activeBoard) {
    lines.push(
      `Active board: "${activeBoard.name}" (${activeBoard.lists.length} lists, ${activeBoard.lists.reduce((n, l) => n + l.cards.length, 0)} cards)`
    );
    const shownLists = activeBoard.lists.slice(0, MAX_LISTS);
    for (const list of shownLists) {
      const titles = list.cards.slice(0, MAX_CARD_TITLES_PER_LIST).map(c => `"${c.title}"`);
      const moreCards = list.cards.length - titles.length;
      const cardPart =
        titles.length > 0 ? `: ${titles.join(', ')}${moreCards > 0 ? `, +${moreCards} more` : ''}` : '';
      lines.push(`  - "${list.title}" (${list.listType}, ${list.cards.length} cards)${cardPart}`);
    }
    const moreLists = activeBoard.lists.length - shownLists.length;
    if (moreLists > 0) lines.push(`  … +${moreLists} more lists`);
  }

  if (activeGoals.length > 0) {
    lines.push('Goals (active):');
    const shownGoals = activeGoals.slice(0, MAX_GOALS);
    for (const goal of shownGoals) {
      lines.push(
        `  - "${goal.title}" — ${goal.progress}% — plan: ${goal.planStatus} — outcome: "${goal.outcome}"`
      );
    }
    const moreGoals = activeGoals.length - shownGoals.length;
    if (moreGoals > 0) lines.push(`  … +${moreGoals} more goals`);
  }

  if (agents.length > 0) {
    lines.push('Agents:');
    const shownAgents = agents.slice(0, MAX_AGENTS);
    for (const agent of shownAgents) {
      const caps = agent.capabilities.length > 0 ? ` [${agent.capabilities.join(', ')}]` : '';
      const flags = agent.kind === 'human' ? ' (human)' : agent.autoExecute ? ' (auto-execute)' : '';
      lines.push(`  - ${agent.name}${caps}${flags}`);
    }
    const moreAgents = agents.length - shownAgents.length;
    if (moreAgents > 0) lines.push(`  … +${moreAgents} more agents`);
  }

  if (autonomy) {
    const budget =
      autonomy.maxRunsTotal !== undefined
        ? ` — budget ${autonomy.runsUsed ?? 0}/${autonomy.maxRunsTotal}`
        : '';
    lines.push(`Autonomy: ${autonomy.enabled ? 'enabled' : 'disabled'}${budget}`);
  } else {
    lines.push('Autonomy: disabled');
  }

  if (runs && runs.length > 0) {
    lines.push('Recent runs:');
    for (const run of runs.slice(0, MAX_RUNS)) {
      lines.push(`  - ${run.status} "${run.cardTitle ?? run.id}"`);
    }
  }

  // Assemble line-by-line against the budget: the first line that would
  // overflow ends the block with the truncation marker.
  let context = '';
  for (const line of lines) {
    const candidate = context ? `${context}\n${line}` : line;
    if (candidate.length > MAX_CONTEXT_CHARS - TRUNCATION_MARKER.length) {
      return context + TRUNCATION_MARKER;
    }
    context = candidate;
  }
  return context;
}
