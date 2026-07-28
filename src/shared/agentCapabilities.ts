export const AGENT_CAPABILITIES = [
  { id: 'code_quality', label: 'Code Quality', description: 'Reviews and improves code correctness, style, and maintainability.' },
  { id: 'testing', label: 'Testing', description: 'Writes and runs automated and manual tests to verify behavior.' },
  { id: 'documentation', label: 'Documentation', description: 'Produces and maintains user-facing and technical documentation.' },
  { id: 'security', label: 'Security', description: 'Audits for vulnerabilities and enforces secure practices.' },
  { id: 'deployment', label: 'Deployment', description: 'Handles build, release, and deployment workflows.' },
  { id: 'analysis', label: 'Analysis', description: 'Analyzes data, requirements, or systems to inform decisions.' },
  { id: 'communication', label: 'Communication', description: 'Drafts and coordinates communication with stakeholders.' },
] as const;

export type AgentCapabilityId = (typeof AGENT_CAPABILITIES)[number]['id'];

export const AGENT_CAPABILITY_IDS: AgentCapabilityId[] = AGENT_CAPABILITIES.map((c) => c.id);
