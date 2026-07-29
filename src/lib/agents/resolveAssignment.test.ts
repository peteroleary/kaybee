import { describe, expect, it } from 'vitest';
import { AgentDoc } from './types';
import { ensureAgentsForCapabilities, resolveAgentAssignment } from './resolveAssignment';

function makeAgent(overrides: Partial<AgentDoc> & Pick<AgentDoc, 'id' | 'slug' | 'name'>): AgentDoc {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    ownerUid: 'user-1',
    kind: 'agent',
    description: '',
    entityType: 'agent',
    capabilities: [],
    status: 'idle',
    autoExecute: true,
    requiresApproval: false,
    model: 'gemini-3.6-flash',
    systemPrompt: '',
    isBuiltIn: true,
    lastExecutionAt: null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const testingAgent = makeAgent({
  id: 'agent-testing',
  slug: 'testing-agent',
  name: 'Testing Agent',
  capabilities: ['testing'],
});

const securityAgent = makeAgent({
  id: 'agent-security',
  slug: 'security-agent',
  name: 'Security Agent',
  capabilities: ['security'],
});

const generalAgent = makeAgent({
  id: 'agent-general',
  slug: 'general-agent',
  name: 'General Agent',
  capabilities: ['code_quality', 'testing', 'documentation', 'security', 'deployment', 'analysis', 'communication'],
});

const humanAgent = makeAgent({
  id: 'agent-human',
  slug: 'pete',
  name: 'Pete',
  kind: 'human',
  entityType: 'human',
  capabilities: [],
  autoExecute: false,
});

const withGeneral = [testingAgent, securityAgent, generalAgent, humanAgent];
const withoutGeneral = [testingAgent, securityAgent, humanAgent];

describe('resolveAgentAssignment', () => {
  it('matches by exact slug', () => {
    expect(resolveAgentAssignment('testing-agent', withGeneral)).toEqual({
      agentId: 'agent-testing',
      hint: 'testing-agent',
      confidence: 'exact',
    });
  });

  it('matches a slug hint expressed with different casing/spacing', () => {
    expect(resolveAgentAssignment('Testing Agent', withGeneral)).toEqual({
      agentId: 'agent-testing',
      hint: 'Testing Agent',
      confidence: 'exact',
    });
  });

  it('matches by exact capability id', () => {
    expect(resolveAgentAssignment('security', withGeneral)).toEqual({
      agentId: 'agent-security',
      hint: 'security',
      confidence: 'capability',
    });
  });

  it('matches by case-insensitive name', () => {
    expect(resolveAgentAssignment('pete', withGeneral)).toEqual({
      agentId: 'agent-human',
      hint: 'pete',
      confidence: 'exact',
    });
  });

  it('matches by token-overlap fuzzy name match', () => {
    expect(resolveAgentAssignment('Testing Agent Deluxe', withGeneral)).toEqual({
      agentId: 'agent-testing',
      hint: 'Testing Agent Deluxe',
      confidence: 'fuzzy',
    });
  });

  it('falls back to general-agent for an empty hint when one exists', () => {
    expect(resolveAgentAssignment(undefined, withGeneral)).toEqual({
      agentId: 'agent-general',
      hint: null,
      confidence: 'fallback',
    });
    expect(resolveAgentAssignment('   ', withGeneral)).toEqual({
      agentId: 'agent-general',
      hint: null,
      confidence: 'fallback',
    });
  });

  it('is unresolved for an empty hint when no general-agent exists', () => {
    expect(resolveAgentAssignment(undefined, withoutGeneral)).toEqual({
      agentId: null,
      hint: null,
      confidence: 'unresolved',
    });
  });

  it('falls back to general-agent for an unknown hint when one exists', () => {
    expect(resolveAgentAssignment('deploy the moonbase', withGeneral)).toEqual({
      agentId: 'agent-general',
      hint: 'deploy the moonbase',
      confidence: 'fallback',
    });
  });

  it('is unresolved for an unknown hint with no general-agent, and preserves the hint', () => {
    expect(resolveAgentAssignment('deploy the moonbase', withoutGeneral)).toEqual({
      agentId: null,
      hint: 'deploy the moonbase',
      confidence: 'unresolved',
    });
  });

  it('never drops the hint even when unresolved', () => {
    const result = resolveAgentAssignment('someone unknown', []);
    expect(result.hint).toBe('someone unknown');
    expect(result.agentId).toBeNull();
    expect(result.confidence).toBe('unresolved');
  });
});

describe('ensureAgentsForCapabilities', () => {
  it('returns built-ins for capabilities that are not yet covered', () => {
    const missing = ensureAgentsForCapabilities(['testing', 'documentation'], [securityAgent]);
    expect(missing.map(a => a.slug).sort()).toEqual(['documentation-agent', 'testing-agent']);
  });

  it('excludes capabilities already covered by an existing agent slug', () => {
    const missing = ensureAgentsForCapabilities(['testing', 'security'], withoutGeneral);
    expect(missing).toEqual([]);
  });

  it('never proposes the general-agent or human built-ins', () => {
    const missing = ensureAgentsForCapabilities(['testing'], []);
    expect(missing.every(a => a.kind === 'agent' && a.capabilities.length === 1)).toBe(true);
    expect(missing.some(a => a.slug === 'general-agent')).toBe(false);
  });

  it('returns an empty array when given no capability ids', () => {
    expect(ensureAgentsForCapabilities([], [])).toEqual([]);
  });
});
