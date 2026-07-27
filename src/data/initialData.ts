import { BoardData, CardItemData, ListConfig } from '../types';

export const INITIAL_BOARDS: BoardData[] = [
  {
    id: 'board-main-1',
    name: 'KB3.0 Core Product Lab',
    description: 'Autonomous development workspace with dynamic hybrid human-agent troops, chat feeds, and live interactive cards.',
    icon: 'Cpu',
    category: 'Core Engineering',
    rbacRole: 'admin',
    feedForwardConnections: [
      {
        id: 'ff-1',
        sourceBoardId: 'board-main-1',
        sourceListId: 'list-pipeline-1',
        targetBoardId: 'board-exec-2',
        targetListId: 'list-exec-completed',
        condition: 'on_complete',
        targetBoardName: 'Executive High-Level Master',
        targetListName: 'Cross-Functional Executive Feed'
      }
    ],
    lists: [
      {
        id: 'list-chat-1',
        title: 'Product Sync & Feed',
        listType: 'chat_feed',
        homogenousType: 'none',
        color: 'indigo',
        icon: 'MessageSquare',
        autoRunAgents: true,
        rbacRole: 'contributor',
        cards: [
          {
            id: 'chat-card-1',
            title: 'Initial Architecture Specs',
            description: 'We have updated the vector schema for the KB3.0 real-time graph database.',
            entityType: 'human',
            status: 'completed',
            progress: 100,
            rbacRole: 'contributor',
            tags: ['Architecture', 'Schema'],
            priority: 'medium',
            createdAt: '10:14 AM',
            updatedAt: '10:14 AM',
            chatSender: {
              name: 'Sarah Connor',
              role: 'Lead Architect',
              isAgent: false,
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
              timestamp: '10:14 AM'
            },
            widgets: [
              {
                id: 'w-chat-1',
                type: 'toggle',
                label: 'Verified by Security Agent',
                value: true
              }
            ],
            subtasks: []
          },
          {
            id: 'chat-card-2',
            title: 'Gemini Agent Response',
            description: 'Analyzed vector schema. Performance estimate is under 12ms for multi-node graph traversal. Ready to generate API handlers.',
            entityType: 'agent',
            status: 'in_progress',
            progress: 85,
            rbacRole: 'ai_operator',
            tags: ['AI-Analysis', 'Performance'],
            priority: 'high',
            createdAt: '10:16 AM',
            updatedAt: '10:16 AM',
            chatSender: {
              name: 'Orchestrator Gemini-3.6',
              role: 'AI System Agent',
              isAgent: true,
              avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=120',
              timestamp: '10:16 AM'
            },
            widgets: [
              {
                id: 'w-chat-2',
                type: 'slider',
                label: 'Confidence Metric',
                value: 96,
                min: 0,
                max: 100,
                unit: '%'
              }
            ],
            subtasks: []
          }
        ]
      },
      {
        id: 'list-agents-homo',
        title: 'Personnel: Agent Swarm Alpha',
        listType: 'homogenous',
        homogenousType: 'agents_only',
        color: 'purple',
        icon: 'Bot',
        autoRunAgents: true,
        rbacRole: 'admin',
        cards: [
          {
            id: 'agent-card-1',
            title: 'Code Refactor Bot v3',
            description: 'Specialized in TypeScript strict typing, esbuild optimization, and dead-code elimination.',
            entityType: 'agent',
            status: 'in_progress',
            progress: 92,
            rbacRole: 'ai_operator',
            priority: 'high',
            tags: ['Refactor', 'TypeScript'],
            createdAt: '09:00 AM',
            updatedAt: '10:30 AM',
            delegate: {
              id: 'del-agent-1',
              name: 'Refactor Agent Alpha',
              type: 'agent',
              status: 'active',
              role: 'Automated Refactoring Specialist'
            },
            widgets: [
              {
                id: 'w-a1-speed',
                type: 'slider',
                label: 'Execution Speed Multiplier',
                value: 80,
                min: 10,
                max: 200,
                unit: 'x'
              },
              {
                id: 'w-a1-auto',
                type: 'toggle',
                label: 'Auto-Merge PRs',
                value: true
              },
              {
                id: 'w-a1-prompt',
                type: 'prompt_runner',
                label: 'Custom AI Task Prompt',
                value: 'Analyze src/components and suggest performance optimizations',
                placeholder: 'Enter instructions for Agent...'
              }
            ],
            subtasks: [
              { id: 'sub-1', text: 'Tree-shake heavy imports', completed: true },
              { id: 'sub-2', text: 'Convert standard enums to CJS compatible', completed: true },
              { id: 'sub-3', text: 'Run benchmark suite', completed: false }
            ]
          },
          {
            id: 'agent-card-2',
            title: 'Security Scan Swarm (4x Workers)',
            description: 'Paralleled static security scanner monitoring dependencies and OWASP top 10 risks.',
            entityType: 'agent_swarm',
            status: 'in_progress',
            progress: 78,
            rbacRole: 'admin',
            priority: 'urgent',
            tags: ['Security', 'Swarm', 'OWASP'],
            createdAt: '08:30 AM',
            updatedAt: '10:20 AM',
            delegate: {
              id: 'del-swarm-1',
              name: 'Security Swarm Delta',
              type: 'agent_swarm',
              status: 'active',
              role: 'Multi-Agent Defense Grid'
            },
            widgets: [
              {
                id: 'w-sec-stepper',
                type: 'stepper',
                label: 'Active Worker Threads',
                value: 4,
                min: 1,
                max: 16
              },
              {
                id: 'w-sec-check',
                type: 'checklist',
                label: 'Audit Milestones',
                value: [
                  { id: 'c1', text: 'Dependency CVE scan', done: true },
                  { id: 'c2', text: 'Sanitize server inputs', done: true },
                  { id: 'c3', text: 'RBAC boundary check', done: false }
                ]
              }
            ],
            subtasks: []
          }
        ]
      },
      {
        id: 'list-humans-homo',
        title: 'Personnel: Human Engineers',
        listType: 'homogenous',
        homogenousType: 'humans_only',
        color: 'emerald',
        icon: 'Users',
        autoRunAgents: false,
        rbacRole: 'contributor',
        cards: [
          {
            id: 'human-card-1',
            title: 'Marcus Vance - Lead Frontend',
            description: 'Focusing on 60FPS infinite canvas canvas rendering and responsive pan controls.',
            entityType: 'human',
            status: 'in_progress',
            progress: 88,
            rbacRole: 'contributor',
            priority: 'high',
            tags: ['Frontend', 'UI/UX', 'Performance'],
            createdAt: '09:15 AM',
            updatedAt: '10:40 AM',
            delegate: {
              id: 'del-human-1',
              name: 'Marcus Vance',
              type: 'human',
              avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
              role: 'Staff UI Architect',
              status: 'active'
            },
            widgets: [
              {
                id: 'w-m-load',
                type: 'slider',
                label: 'Weekly Capacity Utilized',
                value: 75,
                min: 0,
                max: 100,
                unit: '%'
              },
              {
                id: 'w-m-avail',
                type: 'toggle',
                label: 'Available for Urgent Reviews',
                value: true
              }
            ],
            subtasks: []
          },
          {
            id: 'human-card-2',
            title: 'Elena Rostova - System Lead',
            description: 'Overseeing Cross-Board Feed-Forward router and RBAC authorization tokens.',
            entityType: 'human',
            status: 'completed',
            progress: 100,
            rbacRole: 'admin',
            priority: 'medium',
            tags: ['Backend', 'RBAC', 'Orchestration'],
            createdAt: '08:00 AM',
            updatedAt: '10:00 AM',
            delegate: {
              id: 'del-human-2',
              name: 'Elena Rostova',
              type: 'human',
              avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120',
              role: 'Principal Systems Engineer',
              status: 'active'
            },
            widgets: [
              {
                id: 'w-e-rating',
                type: 'rating',
                label: 'Peer Review Score',
                value: 5,
                min: 1,
                max: 5
              }
            ],
            subtasks: []
          }
        ]
      },
      {
        id: 'list-troop-hetero',
        title: 'Troop Delta (Hybrid Unit)',
        listType: 'heterogeneous',
        homogenousType: 'none',
        color: 'amber',
        icon: 'ShieldZap',
        autoRunAgents: true,
        rbacRole: 'contributor',
        cards: [
          {
            id: 'troop-card-1',
            title: 'Troop Delta - Feature Launch Unit',
            description: 'Cross-functional troop combining 2 Humans + 3 AI Agents for rapid end-to-end iteration.',
            entityType: 'troop',
            status: 'in_progress',
            progress: 70,
            rbacRole: 'ai_operator',
            priority: 'urgent',
            tags: ['Hybrid', 'Launch', 'Fast-Track'],
            createdAt: '09:30 AM',
            updatedAt: '10:45 AM',
            delegate: {
              id: 'del-troop-1',
              name: 'Troop Delta (2 Humans + 3 Agents)',
              type: 'troop',
              status: 'active',
              role: 'Autonomous Squad'
            },
            widgets: [
              {
                id: 'w-t-autonomy',
                type: 'slider',
                label: 'AI Agent Autonomy Limit',
                value: 85,
                min: 0,
                max: 100,
                unit: '%'
              },
              {
                id: 'w-t-human-gate',
                type: 'toggle',
                label: 'Require Human Sign-Off for Release',
                value: true
              },
              {
                id: 'w-t-sub',
                type: 'checklist',
                label: 'Troop Deliverables',
                value: [
                  { id: 'td1', text: 'UI Widget Suite Test', done: true },
                  { id: 'td2', text: 'Server Gemini API endpoint', done: true },
                  { id: 'td3', text: 'Live Telemetry Integration', done: false }
                ]
              }
            ],
            subtasks: []
          }
        ]
      },
      {
        id: 'list-pipeline-1',
        title: 'Active Feature Pipelines',
        listType: 'pipeline',
        homogenousType: 'none',
        color: 'cyan',
        icon: 'Workflow',
        feedForwardTargetBoardId: 'board-exec-2',
        feedForwardTargetListId: 'list-exec-completed',
        autoRunAgents: true,
        rbacRole: 'admin',
        cards: [
          {
            id: 'pipe-card-1',
            title: 'Automated Infinite Canvas Engine',
            description: 'Bi-directional horizontal scrolling container with smooth inertia drag and snap positions.',
            entityType: 'routine',
            status: 'completed',
            progress: 100,
            rbacRole: 'admin',
            priority: 'high',
            tags: ['Canvas', 'InfiniteScroll', 'UX'],
            createdAt: '07:30 AM',
            updatedAt: '10:15 AM',
            targetBoardFeedId: 'board-exec-2',
            widgets: [
              {
                id: 'w-p1-speed',
                type: 'progress_bar',
                label: 'Pipeline Health',
                value: 100,
                unit: '%'
              },
              {
                id: 'w-p1-fed',
                type: 'toggle',
                label: 'Forwarded to Executive Board',
                value: true
              }
            ],
            subtasks: [
              { id: 'ps1', text: 'Negative horizontal indexing (-X to +X)', completed: true },
              { id: 'ps2', text: 'Touch & wheel scroll sync', completed: true },
              { id: 'ps3', text: 'Mini-map overview radar', completed: true }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'board-exec-2',
    name: 'Executive High-Level Master',
    description: 'Central executive dashboard aggregating high-value completed features and strategic deliverables across all teams.',
    icon: 'Briefcase',
    category: 'Executive Overview',
    rbacRole: 'admin',
    feedForwardConnections: [],
    lists: [
      {
        id: 'list-exec-completed',
        title: 'Cross-Functional Executive Feed',
        listType: 'kanban',
        homogenousType: 'none',
        color: 'emerald',
        icon: 'CheckCircle2',
        autoRunAgents: false,
        rbacRole: 'admin',
        cards: [
          {
            id: 'exec-card-1',
            title: '[Feed-Forward] Automated Infinite Canvas Engine',
            description: 'Forwarded automatically from Core Product Lab upon completion. Multi-direction horizontal scrolling validated.',
            entityType: 'routine',
            status: 'completed',
            progress: 100,
            rbacRole: 'admin',
            priority: 'high',
            tags: ['Executive-Approval', 'Verified', 'Core-Feature'],
            createdAt: '10:15 AM',
            updatedAt: '10:15 AM',
            widgets: [
              {
                id: 'w-exec-signoff',
                type: 'toggle',
                label: 'Executive Sign-Off Status',
                value: true
              },
              {
                id: 'w-exec-roi',
                type: 'slider',
                label: 'Estimated Efficiency Multiplier',
                value: 350,
                min: 100,
                max: 500,
                unit: '%'
              }
            ],
            subtasks: []
          }
        ]
      },
      {
        id: 'list-exec-roadmap',
        title: 'Q3 Strategic AI Expansion',
        listType: 'heterogeneous',
        homogenousType: 'none',
        color: 'violet',
        icon: 'Target',
        autoRunAgents: true,
        rbacRole: 'admin',
        cards: [
          {
            id: 'exec-card-2',
            title: 'Multi-Agent Autonomous Orchestration',
            description: 'Scale agent swarms across cloud edge environments with automatic load balancing.',
            entityType: 'agent_swarm',
            status: 'in_progress',
            progress: 65,
            rbacRole: 'admin',
            priority: 'urgent',
            tags: ['Roadmap', 'Strategy', 'AI-Swarms'],
            createdAt: '08:00 AM',
            updatedAt: '10:30 AM',
            widgets: [
              {
                id: 'w-roadmap-prog',
                type: 'progress_bar',
                label: 'Q3 Milestone Completion',
                value: 65,
                unit: '%'
              }
            ],
            subtasks: []
          }
        ]
      }
    ]
  },
  {
    id: 'board-qa-3',
    name: 'Autonomous QA & Security Swarm',
    description: 'High-speed automated testing board driven by Gemini AI agents monitoring code health and unit tests.',
    icon: 'ShieldCheck',
    category: 'Agent Swarms',
    rbacRole: 'ai_operator',
    feedForwardConnections: [],
    lists: [
      {
        id: 'list-qa-running',
        title: 'Active Swarm Audits',
        listType: 'homogenous',
        homogenousType: 'agents_only',
        color: 'rose',
        icon: 'Terminal',
        autoRunAgents: true,
        rbacRole: 'ai_operator',
        cards: [
          {
            id: 'qa-card-1',
            title: 'Real-Time Hydration & Memory Leak Detector',
            description: 'Monitoring React 19 component re-renders and memory allocations under heavy drag events.',
            entityType: 'agent',
            status: 'in_progress',
            progress: 82,
            rbacRole: 'ai_operator',
            priority: 'high',
            tags: ['Memory', 'React19', 'Performance'],
            createdAt: '09:00 AM',
            updatedAt: '10:40 AM',
            widgets: [
              {
                id: 'w-qa-leak',
                type: 'toggle',
                label: 'Zero Leak Detected',
                value: true
              },
              {
                id: 'w-qa-fps',
                type: 'stepper',
                label: 'Measured Target FPS',
                value: 60,
                min: 30,
                max: 120
              }
            ],
            subtasks: []
          }
        ]
      }
    ]
  }
];
