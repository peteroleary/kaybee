import { AGENT_CAPABILITY_IDS, AgentCapabilityId } from '../../shared/agentCapabilities';
import { buildBuiltInAgents } from './builtIns';
import { AgentDoc } from './types';

export interface AgentAssignment {
  agentId: string | null;
  hint: string | null;
  confidence: 'exact' | 'capability' | 'fuzzy' | 'fallback' | 'unresolved';
}

const FUZZY_THRESHOLD = 0.6;

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const tokenize = (value: string): Set<string> => new Set(normalize(value).split(' ').filter(Boolean));

const tokenOverlap = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

/**
 * Resolves a free-form assignment hint (from goal decomposition, orchestrator
 * output, or manual entry) against the known agent/human registry.
 *
 * Ladder: exact slug -> exact capability id -> case-insensitive name ->
 * token-overlap fuzzy name match -> `general-agent` fallback -> unresolved.
 *
 * A hint is never silently dropped: even when nothing matches (and there is
 * no general-agent to fall back to), the original hint is returned alongside
 * `agentId: null` and `confidence: 'unresolved'` so the UI can prompt.
 */
export function resolveAgentAssignment(hint: string | undefined, agents: AgentDoc[]): AgentAssignment {
  const trimmedHint = (hint ?? '').trim();
  const generalAgent = agents.find(a => a.slug === 'general-agent');

  if (!trimmedHint) {
    return generalAgent
      ? { agentId: generalAgent.id, hint: null, confidence: 'fallback' }
      : { agentId: null, hint: null, confidence: 'unresolved' };
  }

  const hintSlug = slugify(trimmedHint);
  const slugMatch = agents.find(a => a.slug === hintSlug);
  if (slugMatch) {
    return { agentId: slugMatch.id, hint: trimmedHint, confidence: 'exact' };
  }

  const hintLower = trimmedHint.toLowerCase();
  if (AGENT_CAPABILITY_IDS.includes(hintLower as AgentCapabilityId)) {
    const capabilityMatch = agents.find(a => a.capabilities.includes(hintLower as AgentCapabilityId));
    if (capabilityMatch) {
      return { agentId: capabilityMatch.id, hint: trimmedHint, confidence: 'capability' };
    }
  }

  const nameMatch = agents.find(a => a.name.toLowerCase() === hintLower);
  if (nameMatch) {
    return { agentId: nameMatch.id, hint: trimmedHint, confidence: 'exact' };
  }

  const hintTokens = tokenize(trimmedHint);
  let bestMatch: { agent: AgentDoc; score: number } | null = null;
  for (const agent of agents) {
    const score = tokenOverlap(hintTokens, tokenize(agent.name));
    if (score >= FUZZY_THRESHOLD && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { agent, score };
    }
  }
  if (bestMatch) {
    return { agentId: bestMatch.agent.id, hint: trimmedHint, confidence: 'fuzzy' };
  }

  if (generalAgent) {
    return { agentId: generalAgent.id, hint: trimmedHint, confidence: 'fallback' };
  }

  return { agentId: null, hint: trimmedHint, confidence: 'unresolved' };
}

/**
 * Given a set of desired capability ids and the currently known agents,
 * returns the built-in, single-capability agent docs that still need to be
 * created (by slug) to cover those capabilities. Does not include the
 * general-purpose or human built-ins — only the dedicated per-capability ones.
 */
export function ensureAgentsForCapabilities(ids: AgentCapabilityId[], agents: AgentDoc[]): AgentDoc[] {
  if (ids.length === 0) return [];

  const existingSlugs = new Set(agents.map(a => a.slug));
  const needed = new Set(ids);
  const ownerUid = agents.find(a => a.ownerUid)?.ownerUid ?? '';
  const builtIns = buildBuiltInAgents(ownerUid);

  return builtIns.filter(
    a => a.kind === 'agent' && a.capabilities.length === 1 && needed.has(a.capabilities[0]) && !existingSlugs.has(a.slug)
  );
}
