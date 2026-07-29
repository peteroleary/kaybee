import { AGENT_CAPABILITIES, AgentCapabilityId } from '../../shared/agentCapabilities';
import { MODELS } from '../../shared/models';
import { newId } from '../../shared/ids';
import { AgentDoc } from './types';

const CAPABILITY_PROMPTS: Record<AgentCapabilityId, string> = {
  code_quality:
    'You are a meticulous code quality agent. Review the assigned card, correctness, style, and maintainability, and report concrete findings.',
  testing:
    'You are a testing agent. Write and run automated or manual tests for the assigned card and report pass/fail results with evidence.',
  documentation:
    'You are a documentation agent. Produce clear, accurate user-facing or technical documentation for the assigned card.',
  security:
    'You are a security agent. Audit the assigned card for vulnerabilities and unsafe practices, and propose remediations.',
  deployment:
    'You are a deployment agent. Handle build, release, and deployment steps for the assigned card, and report the outcome.',
  analysis:
    'You are an analysis agent. Analyze the data, requirements, or system described in the assigned card and summarize findings that inform a decision.',
  communication:
    'You are a communication agent. Draft and coordinate stakeholder-facing communication for the assigned card.',
};

const GENERAL_AGENT_PROMPT =
  'You are a general-purpose autonomous agent. Handle whatever the assigned card requires, drawing on any of your capabilities, and report the outcome clearly.';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildAgentDoc(ownerUid: string, now: string, overrides: Partial<AgentDoc> & Pick<AgentDoc, 'name' | 'slug'>): AgentDoc {
  return {
    id: newId('agent'),
    ownerUid,
    kind: 'agent',
    description: '',
    entityType: 'agent',
    capabilities: [],
    status: 'idle',
    autoExecute: true,
    requiresApproval: false,
    model: MODELS.agentRun,
    systemPrompt: '',
    isBuiltIn: true,
    lastExecutionAt: null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * One built-in agent per capability, plus a general-purpose catch-all agent
 * and a human record for the signed-in user (or "You" when signed out).
 */
export function buildBuiltInAgents(ownerUid: string, displayName?: string | null): AgentDoc[] {
  const now = new Date().toISOString();

  const capabilityAgents: AgentDoc[] = AGENT_CAPABILITIES.map(cap =>
    buildAgentDoc(ownerUid, now, {
      slug: `${cap.id.replace(/_/g, '-')}-agent`,
      name: `${cap.label} Agent`,
      description: cap.description,
      capabilities: [cap.id],
      systemPrompt: CAPABILITY_PROMPTS[cap.id],
    })
  );

  const generalAgent = buildAgentDoc(ownerUid, now, {
    slug: 'general-agent',
    name: 'General Agent',
    description: 'Catch-all agent for tasks that do not map to a specific capability.',
    capabilities: AGENT_CAPABILITIES.map(c => c.id),
    systemPrompt: GENERAL_AGENT_PROMPT,
  });

  const humanName = (displayName ?? '').trim() || 'You';
  const human: AgentDoc = {
    id: newId('agent'),
    ownerUid,
    kind: 'human',
    slug: slugify(humanName) || 'you',
    name: humanName,
    description: 'The human owner of this workspace.',
    entityType: 'human',
    capabilities: [],
    status: 'idle',
    autoExecute: false,
    requiresApproval: false,
    model: MODELS.agentRun,
    systemPrompt: '',
    isBuiltIn: true,
    lastExecutionAt: null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  return [...capabilityAgents, generalAgent, human];
}
