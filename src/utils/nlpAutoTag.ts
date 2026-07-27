/**
 * NLP Keyword & Semantic Rule Auto-Tagging Engine
 * Automatically analyzes card titles and descriptions to generate relevant tags upon creation.
 */

const KEYWORD_RULES: { keywords: string[]; tag: string }[] = [
  { keywords: ['bug', 'fix', 'issue', 'crash', 'defect', 'error', 'exception', 'fault'], tag: 'Bug' },
  { keywords: ['feature', 'spec', 'capability', 'enhancement', 'request', 'add', 'implement'], tag: 'Feature' },
  { keywords: ['api', 'endpoint', 'rest', 'graphql', 'grpc', 'backend', 'server', 'database', 'sql', 'express'], tag: 'API & Backend' },
  { keywords: ['ui', 'ux', 'css', 'design', 'frontend', 'layout', 'tailwind', 'component', 'modal', 'canvas', 'theme'], tag: 'Frontend & UI' },
  { keywords: ['ai', 'agent', 'gemini', 'llm', 'prompt', 'nlp', 'model', 'swarm', 'copilot', 'orchestrator'], tag: 'AI & Swarm' },
  { keywords: ['urgent', 'asap', 'critical', 'blocker', 'priority', 'high', 'emergency'], tag: 'Urgent' },
  { keywords: ['security', 'auth', 'oauth', 'token', 'rbac', 'permission', 'encrypt', 'audit'], tag: 'Security' },
  { keywords: ['test', 'qa', 'coverage', 'cypress', 'jest', 'unit', 'e2e', 'verification'], tag: 'QA Testing' },
  { keywords: ['doc', 'documentation', 'readme', 'wiki', 'notes', 'spec', 'meeting'], tag: 'Docs & Sync' },
  { keywords: ['routine', 'cron', 'schedule', 'automated', 'interval', 'timer', 'background'], tag: 'Routine' },
  { keywords: ['realtime', 'websocket', 'socket', 'feed', 'live', 'stream'], tag: 'Realtime' },
  { keywords: ['analytics', 'metric', 'chart', 'recharts', 'telemetry', 'report', 'log'], tag: 'Analytics' }
];

export function autoSuggestTags(title: string, description: string = '', existingTags: string[] = []): string[] {
  const combinedText = `${title} ${description}`.toLowerCase();
  const detectedTags = new Set<string>(existingTags);

  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (combinedText.includes(kw)) {
        detectedTags.add(rule.tag);
        break; // stop checking keywords for this rule
      }
    }
  }

  // Fallback default tag if no tags matched
  if (detectedTags.size === 0) {
    detectedTags.add('General');
  }

  return Array.from(detectedTags);
}
