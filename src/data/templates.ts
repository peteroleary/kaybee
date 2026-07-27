import { BoardData, CardItemData, ListConfig } from '../types';

export interface BoardTemplate {
  id: string;
  name: string;
  category: 'Core Engineering' | 'Executive Overview' | 'Agent Swarms' | 'Human Operations' | 'Cross-Functional';
  description: string;
  icon: string;
  tags: string[];
  lists: Omit<ListConfig, 'id'>[];
}

export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  entityType: 'task' | 'human' | 'agent' | 'routine' | 'troop';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  defaultTitle: string;
  defaultDescription: string;
  widgets: any[];
  prompt?: string;
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'tpl-agile-scrum',
    name: 'Agile Scrum Sprint',
    category: 'Core Engineering',
    description: 'Classic agile software development sprint board with backlog, active sprint, code review, and QA verification.',
    icon: 'Workflow',
    tags: ['Engineering', 'Agile', 'Scrum', 'Sprint'],
    lists: [
      {
        title: 'Product Backlog',
        listType: 'kanban',
        homogenousType: 'none',
        color: 'slate',
        icon: 'Layers',
        autoRunAgents: false,
        rbacRole: 'contributor',
        cards: [
          {
            id: 'c-scrum-1',
            title: 'User Authentication OAuth Refactor',
            description: 'Migrate legacy auth to standard PKCE OAuth token flow.',
            entityType: 'task',
            status: 'backlog',
            progress: 0,
            rbacRole: 'contributor',
            priority: 'high',
            tags: ['Auth', 'Security'],
            widgets: [
              { id: 'w1', type: 'toggle', label: 'Security Audit Required', value: true },
              { id: 'w2', type: 'slider', label: 'Story Points', value: 8, min: 1, max: 13, unit: 'pts' }
            ],
            subtasks: [
              { id: 's1', text: 'Define OAuth scopes', completed: true },
              { id: 's2', text: 'Implement PKCE challenge generator', completed: false }
            ],
            createdAt: 'Today',
            updatedAt: 'Today'
          }
        ]
      },
      {
        title: 'In Development',
        listType: 'kanban',
        homogenousType: 'none',
        color: 'indigo',
        icon: 'Code',
        autoRunAgents: true,
        rbacRole: 'contributor',
        cards: [
          {
            id: 'c-scrum-2',
            title: 'Real-time WebSocket Reconnection Handler',
            description: 'Implement exponential backoff algorithm for client socket connections.',
            entityType: 'task',
            status: 'in_progress',
            progress: 45,
            rbacRole: 'contributor',
            priority: 'medium',
            tags: ['Realtime', 'Frontend'],
            widgets: [
              { id: 'w3', type: 'slider', label: 'Backoff Limit (sec)', value: 30, min: 5, max: 120, unit: 's' }
            ],
            subtasks: [
              { id: 's3', text: 'Add exponential math formula', completed: true },
              { id: 's4', text: 'Test offline mode toggles', completed: false }
            ],
            createdAt: 'Yesterday',
            updatedAt: 'Today'
          }
        ]
      },
      {
        title: 'AI Code Review Swarm',
        listType: 'homogenous',
        homogenousType: 'agents_only',
        color: 'purple',
        icon: 'Bot',
        autoRunAgents: true,
        rbacRole: 'ai_operator',
        cards: [
          {
            id: 'c-scrum-3',
            title: 'AST Linting & Static Analysis Agent',
            description: 'Autonomous Gemini agent analyzing pull request diffs for memory leaks and race conditions.',
            entityType: 'agent',
            status: 'in_progress',
            progress: 75,
            rbacRole: 'ai_operator',
            priority: 'high',
            tags: ['AI-Review', 'Linter'],
            widgets: [
              { id: 'w5', type: 'toggle', label: 'Block PR on Warning', value: true },
              { id: 'w6', type: 'prompt_runner', label: 'Run PR Analysis', value: 'Analyze code diff for security and runtime memory leaks' }
            ],
            subtasks: [],
            prompt: 'Run deep static code audit on staged branch',
            createdAt: 'Today',
            updatedAt: 'Just now'
          }
        ]
      },
      {
        title: 'Done / Sprint Completed',
        listType: 'kanban',
        homogenousType: 'none',
        color: 'emerald',
        icon: 'CheckCircle2',
        autoRunAgents: false,
        rbacRole: 'contributor',
        cards: []
      }
    ]
  },
  {
    id: 'tpl-gtd-personal',
    name: 'Personal GTD & Productivity',
    category: 'Human Operations',
    description: 'Get Things Done framework featuring Inbox capture feed, Next Actions, Scheduled Focus, and Completed Archive.',
    icon: 'CheckSquare',
    tags: ['GTD', 'Productivity', 'Personal', 'Focus'],
    lists: [
      {
        title: 'Inbox & Chat Capture',
        listType: 'chat_feed',
        homogenousType: 'none',
        color: 'indigo',
        icon: 'MessageSquare',
        autoRunAgents: true,
        rbacRole: 'contributor',
        cards: [
          {
            id: 'c-gtd-1',
            title: 'Review quarterly goals & project roadmap',
            description: 'Quick voice note or chat dump for weekly review.',
            entityType: 'human',
            status: 'todo',
            progress: 0,
            rbacRole: 'contributor',
            priority: 'medium',
            tags: ['Planning'],
            widgets: [],
            subtasks: [],
            createdAt: 'Today',
            updatedAt: 'Today'
          }
        ]
      },
      {
        title: 'Next Actions',
        listType: 'kanban',
        homogenousType: 'none',
        color: 'amber',
        icon: 'Zap',
        autoRunAgents: false,
        rbacRole: 'contributor',
        cards: [
          {
            id: 'c-gtd-2',
            title: 'Draft API Specification for Client App',
            description: 'Finalize OpenAPI spec and send to mobile team.',
            entityType: 'task',
            status: 'in_progress',
            progress: 30,
            rbacRole: 'contributor',
            priority: 'high',
            tags: ['API', 'Doc'],
            widgets: [
              { id: 'wgtd1', type: 'slider', label: 'Energy Required', value: 7, min: 1, max: 10, unit: '/10' }
            ],
            subtasks: [
              { id: 'sg1', text: 'Outline endpoints', completed: true },
              { id: 'sg2', text: 'Add schema validation types', completed: false }
            ],
            createdAt: 'Yesterday',
            updatedAt: 'Today'
          }
        ]
      },
      {
        title: 'Delegated to AI Copilots',
        listType: 'homogenous',
        homogenousType: 'agents_only',
        color: 'purple',
        icon: 'Bot',
        autoRunAgents: true,
        rbacRole: 'ai_operator',
        cards: [
          {
            id: 'c-gtd-3',
            title: 'Automated Calendar & Digest Agent',
            description: 'Summarizes key emails and prepares daily task itinerary.',
            entityType: 'agent',
            status: 'in_progress',
            progress: 80,
            rbacRole: 'ai_operator',
            priority: 'medium',
            tags: ['Agent', 'Daily'],
            widgets: [
              { id: 'wgtd2', type: 'prompt_runner', label: 'Generate Daily Brief', value: 'Synthesize daily action items and priority meetings' }
            ],
            subtasks: [],
            createdAt: 'Today',
            updatedAt: 'Today'
          }
        ]
      }
    ]
  },
  {
    id: 'tpl-ai-research',
    name: 'AI Swarm & Research Lab',
    category: 'Agent Swarms',
    description: 'Multi-agent collaboration hub featuring prompt engineering pipelines, swarm benchmarking, and automated synthesis.',
    icon: 'Sparkles',
    tags: ['AI', 'Research', 'Agent Swarm', 'LLM'],
    lists: [
      {
        title: 'Hypothesis & Prompts',
        listType: 'pipeline',
        homogenousType: 'none',
        color: 'cyan',
        icon: 'Workflow',
        autoRunAgents: true,
        rbacRole: 'ai_operator',
        cards: [
          {
            id: 'c-ai-1',
            title: 'Evaluate Gemini 3.6 Multimodal Vision',
            description: 'Benchmarking visual spatial reasoning on engineering schematics.',
            entityType: 'routine',
            status: 'in_progress',
            progress: 50,
            rbacRole: 'ai_operator',
            priority: 'high',
            tags: ['Vision', 'Benchmark'],
            widgets: [
              { id: 'wai1', type: 'slider', label: 'Confidence Threshold', value: 92, min: 50, max: 99, unit: '%' },
              { id: 'wai2', type: 'prompt_runner', label: 'Run Vision Test Suite', value: 'Execute visual spatial reasoning benchmark' }
            ],
            subtasks: [
              { id: 'sai1', text: 'Load CAD dataset', completed: true },
              { id: 'sai2', text: 'Compute cross-entropy error', completed: false }
            ],
            prompt: 'Execute multimodal vision analysis on circuit layout',
            createdAt: 'Today',
            updatedAt: 'Just now'
          }
        ]
      },
      {
        title: 'Autonomous Refactoring Troop',
        listType: 'heterogeneous',
        homogenousType: 'none',
        color: 'amber',
        icon: 'Zap',
        autoRunAgents: true,
        rbacRole: 'admin',
        cards: [
          {
            id: 'c-ai-2',
            title: 'Troop Alpha: Engineer + Refactor Agent',
            description: 'Hybrid unit optimizing React re-renders and AST transforms.',
            entityType: 'troop',
            status: 'in_progress',
            progress: 60,
            rbacRole: 'admin',
            priority: 'urgent',
            tags: ['Troop', 'Hybrid'],
            widgets: [
              { id: 'wai3', type: 'stepper', label: 'Agent Count in Swarm', value: 3, min: 1, max: 10 },
              { id: 'wai4', type: 'toggle', label: 'Auto-Merge Clean Output', value: true }
            ],
            subtasks: [],
            createdAt: 'Today',
            updatedAt: 'Today'
          }
        ]
      },
      {
        title: 'Executive Insights Feed',
        listType: 'chat_feed',
        homogenousType: 'none',
        color: 'purple',
        icon: 'MessageSquare',
        autoRunAgents: true,
        rbacRole: 'ai_operator',
        cards: [
          {
            id: 'c-ai-3',
            title: 'Benchmarking Synthesis Complete',
            description: 'Swarm achieved 98.4% accuracy across 120 vector embedding tests.',
            entityType: 'agent',
            status: 'completed',
            progress: 100,
            rbacRole: 'ai_operator',
            priority: 'medium',
            tags: ['Report'],
            chatSender: {
              name: 'Synthesizer Agent',
              isAgent: true,
              role: 'Lead AI Researcher',
              timestamp: '10:30 AM'
            },
            widgets: [],
            subtasks: [],
            createdAt: 'Today',
            updatedAt: 'Today'
          }
        ]
      }
    ]
  }
];

export interface AgentTemplate {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  capabilities: string[];
  defaultPrompt: string;
  tags: string[];
  widgets: any[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  tags: string[];
  stages: { title: string; listType: 'kanban' | 'chat_feed' | 'homogenous' | 'heterogeneous' | 'pipeline'; autoRunAgents: boolean }[];
}

export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  triggerInterval: string;
  prompt: string;
  tags: string[];
  widgets: any[];
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'agent-tpl-linter',
    name: 'AST Security & Code Linter Agent',
    role: 'Lead Security Auditor',
    description: 'Autonomous Gemini agent that inspects code diffs for memory leaks, XSS risks, and unhandled promise rejections.',
    icon: 'ShieldCheck',
    capabilities: ['Static Analysis', 'AST Parsing', 'Security Audit', 'PR Review'],
    defaultPrompt: 'Analyze staged code changes for security vulnerabilities and performance bottlenecks.',
    tags: ['Security', 'Linter', 'Code Review'],
    widgets: [
      { id: 'w-ag-1', type: 'toggle', label: 'Block Pull Request on Failure', value: true },
      { id: 'w-ag-2', type: 'slider', label: 'Severity Score Limit', value: 8, min: 1, max: 10, unit: '/10' }
    ]
  },
  {
    id: 'agent-tpl-orchestrator',
    name: 'Swarm Orchestrator Agent',
    role: 'Swarm Dispatcher',
    description: 'Supervisory agent that decomposes complex user prompts into sub-agent tasks and balances execution loads.',
    icon: 'Workflow',
    capabilities: ['Task Decomposition', 'Swarm Load Balancing', 'Feed-Forward Routing'],
    defaultPrompt: 'Decompose active backlog items and assign to specialized sub-agents.',
    tags: ['Swarm', 'Orchestration', 'Dispatcher'],
    widgets: [
      { id: 'w-ag-3', type: 'stepper', label: 'Concurrent Agents', value: 4, min: 1, max: 10 },
      { id: 'w-ag-4', type: 'toggle', label: 'Auto-Feed Forward on Pass', value: true }
    ]
  },
  {
    id: 'agent-tpl-qa-synthesizer',
    name: 'QA & Test Coverage Agent',
    role: 'Lead Quality Engineer',
    description: 'Generates end-to-end integration test suites and benchmarks API endpoints against SLA targets.',
    icon: 'CheckSquare',
    capabilities: ['E2E Testing', 'Load Benchmarking', 'Coverage Metrics'],
    defaultPrompt: 'Generate unit test coverage matrix and execute API integration suite.',
    tags: ['QA', 'Testing', 'Benchmark'],
    widgets: [
      { id: 'w-ag-5', type: 'slider', label: 'Target Coverage %', value: 90, min: 50, max: 100, unit: '%' }
    ]
  }
];

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'wf-tpl-cicd',
    name: 'Automated CI/CD Release Pipeline',
    category: 'Engineering',
    description: 'End-to-end continuous integration workflow with Automated Linting, Staging Deployment, and Production Release verification.',
    icon: 'Workflow',
    tags: ['CI/CD', 'Pipeline', 'Release'],
    stages: [
      { title: 'Feature Commit Stage', listType: 'kanban', autoRunAgents: false },
      { title: 'Automated Lint & Test Swarm', listType: 'pipeline', autoRunAgents: true },
      { title: 'Staging Verification', listType: 'kanban', autoRunAgents: false },
      { title: 'Production Release Feed', listType: 'chat_feed', autoRunAgents: true }
    ]
  },
  {
    id: 'wf-tpl-triage',
    name: 'Customer Feedback & Bug Triage Pipeline',
    category: 'Support & Product',
    description: 'Multi-stage pipeline capturing incoming tickets, running NLP priority classification, and delegating to engineering swarms.',
    icon: 'MessageSquare',
    tags: ['Triage', 'Support', 'NLP'],
    stages: [
      { title: 'Incoming Ticket Stream', listType: 'chat_feed', autoRunAgents: true },
      { title: 'AI Classification & Priority', listType: 'homogenous', autoRunAgents: true },
      { title: 'Engineering Backlog Feed', listType: 'kanban', autoRunAgents: false }
    ]
  }
];

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'rtn-tpl-standup',
    name: 'Daily Standup Brief & Synthesis Routine',
    description: 'Executes every morning at 9 AM to synthesize team card completions, blockages, and daily focus targets.',
    icon: 'Clock',
    triggerInterval: 'Every Morning (9:00 AM)',
    prompt: 'Summarize card completions, identify stalled tasks, and compile daily focus briefing.',
    tags: ['Standup', 'Daily Brief', 'Routine'],
    widgets: [
      { id: 'w-rt-1', type: 'toggle', label: 'Post to Chat Feed', value: true },
      { id: 'w-rt-2', type: 'prompt_runner', label: 'Execute Standup Brief Now', value: 'Synthesize daily sprint status' }
    ]
  },
  {
    id: 'rtn-tpl-archive',
    name: 'Nightly Workspace Hygiene & Auto-Archive',
    description: 'Runs nightly to archive completed cards, clean up temporary telemetry logs, and update status metrics.',
    icon: 'Zap',
    triggerInterval: 'Nightly at Midnight',
    prompt: 'Scan finished cards, move stale items to completed archive, and reset daily counters.',
    tags: ['Maintenance', 'Archiving', 'Routine'],
    widgets: [
      { id: 'w-rt-3', type: 'slider', label: 'Archive Age Threshold (Days)', value: 7, min: 1, max: 30, unit: 'days' }
    ]
  }
];

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'ct-bug-report',
    name: 'Bug Report',
    description: 'Track software bugs with priority toggles, steps to reproduce, and auto linter checks.',
    entityType: 'task',
    priority: 'high',
    tags: ['Bug', 'Triage'],
    defaultTitle: '[Bug] Issue in Component',
    defaultDescription: 'Describe the bug behavior, steps to reproduce, and expected result.',
    widgets: [
      { id: 'w-bug-1', type: 'toggle', label: 'Reproducible in Dev', value: true },
      { id: 'w-bug-2', type: 'slider', label: 'Severity Score', value: 8, min: 1, max: 10, unit: '/10' },
      { id: 'w-bug-3', type: 'prompt_runner', label: 'Run Automated Diagnostic', value: 'Analyze error trace and suggest root cause fix' }
    ],
    prompt: 'Analyze stack trace and generate root cause diagnosis.'
  },
  {
    id: 'ct-feature-request',
    name: 'Feature Request',
    description: 'Scope new feature specs, target user value, and required agent capabilities.',
    entityType: 'task',
    priority: 'medium',
    tags: ['Feature', 'Enhancement'],
    defaultTitle: '[Feature] Implement New Capability',
    defaultDescription: 'Explain user motivation, proposed solution, and acceptance criteria.',
    widgets: [
      { id: 'w-feat-1', type: 'stepper', label: 'Estimated Effort (Days)', value: 3, min: 1, max: 30 },
      { id: 'w-feat-2', type: 'toggle', label: 'Requires AI Agent Support', value: true },
      { id: 'w-feat-3', type: 'slider', label: 'User Value Rank', value: 85, min: 0, max: 100, unit: '%' }
    ]
  },
  {
    id: 'ct-meeting-notes',
    name: 'Meeting Notes & Actions',
    description: 'Document meeting minutes, assign human/agent follow-ups, and auto-summarize.',
    entityType: 'human',
    priority: 'medium',
    tags: ['Meeting', 'Sync'],
    defaultTitle: 'Sync: Architecture & Sprint Goal',
    defaultDescription: 'Key decisions, attendees, and action items discussed during the call.',
    widgets: [
      { id: 'w-mtg-1', type: 'prompt_runner', label: 'Summarize Action Items', value: 'Extract key deliverables and assign owners' },
      { id: 'w-mtg-2', type: 'toggle', label: 'Share with Executive Board', value: false }
    ],
    prompt: 'Summarize transcript notes into structured action checklist.'
  },
  {
    id: 'ct-ai-routine',
    name: 'Autonomous Agent Routine',
    description: 'Deploy a recurring or triggered Gemini agent job with prompt controls.',
    entityType: 'agent',
    priority: 'high',
    tags: ['Agent', 'Automation'],
    defaultTitle: 'Agent Routine: Automated Audit',
    defaultDescription: 'Autonomous agent routine executed on triggers or scheduled interval.',
    widgets: [
      { id: 'w-rtn-1', type: 'slider', label: 'Confidence Score', value: 95, min: 50, max: 100, unit: '%' },
      { id: 'w-rtn-2', type: 'prompt_runner', label: 'Execute Routine Now', value: 'Run Gemini agent routine with active parameters' }
    ],
    prompt: 'Execute routine analysis and output actionable structured summary.'
  }
];
