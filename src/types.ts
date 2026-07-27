export type EntityType = 
  | 'task' 
  | 'human' 
  | 'agent' 
  | 'routine' 
  | 'human_team' 
  | 'agent_swarm' 
  | 'troop';

export type ListType = 
  | 'kanban' 
  | 'chat_feed' 
  | 'homogenous' 
  | 'heterogeneous' 
  | 'pipeline';

export type HomogenousType = 'humans_only' | 'agents_only' | 'none';

export type RBACRole = 'admin' | 'contributor' | 'ai_operator' | 'viewer';

export type WidgetType = 
  | 'toggle' 
  | 'slider' 
  | 'checklist' 
  | 'stepper' 
  | 'prompt_runner' 
  | 'progress_bar' 
  | 'rating'
  | 'time_logger';

export interface TimeLogEntry {
  id: string;
  durationSeconds: number;
  loggedAt: string;
  description: string;
  actorName: string;
}

export interface TimeLoggerState {
  isRunning: boolean;
  startTime?: number; // epoch ms
  elapsedSeconds: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface InteractiveWidget {
  id: string;
  type: WidgetType;
  label: string;
  value: boolean | number | string | ChecklistItem[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: string[];
  placeholder?: string;
}

export interface CardDelegate {
  id: string;
  name: string;
  type: EntityType;
  avatar?: string;
  role?: string;
  status?: 'active' | 'busy' | 'idle' | 'offline';
  capabilities?: string[];
}

export interface AttachmentItem {
  id: string;
  name: string;
  size: string;
  type: 'doc' | 'code' | 'image' | 'audio' | 'data';
  url?: string;
}

export interface ChatSender {
  name: string;
  avatar?: string;
  isAgent: boolean;
  role?: string;
  timestamp: string;
}

export interface CardComment {
  id: string;
  authorName?: string;
  author?: string;
  authorRole?: string;
  avatar?: string;
  isAgent?: boolean;
  text?: string;
  content?: string;
  timestamp: string;
  parentId?: string | null;
}

export interface CardItemData {
  id: string;
  title: string;
  description: string;
  entityType: EntityType;
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'completed' | 'failed';
  progress: number; // 0 to 100
  rbacRole: RBACRole;
  delegate?: CardDelegate;
  widgets: InteractiveWidget[];
  subtasks: { id: string; text: string; completed: boolean; progress?: number }[];
  prompt?: string;
  lastExecutionOutput?: string;
  executionStatus?: 'idle' | 'running' | 'success' | 'error';
  chatSender?: ChatSender;
  attachments?: AttachmentItem[];
  targetBoardFeedId?: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  dependsOnCardIds?: string[];
  timeLogs?: TimeLogEntry[];
  timeLoggerState?: TimeLoggerState;
  hiddenMetadataFields?: string[];
  isPinned?: boolean;
  comments?: CardComment[];
}

export interface ListConfig {
  id: string;
  title: string;
  listType: ListType;
  homogenousType: HomogenousType;
  color: string; // Tailwind color string, e.g. 'indigo', 'emerald', 'amber', 'purple'
  icon: string;
  feedForwardTargetBoardId?: string;
  feedForwardTargetListId?: string;
  autoRunAgents: boolean;
  isTwoColumns?: boolean;
  width?: number;
  autoSortByPriority?: boolean;
  rbacRole: RBACRole;
  cards: CardItemData[];
}

export interface FeedForwardConnection {
  id: string;
  sourceBoardId: string;
  sourceListId: string;
  targetBoardId: string;
  targetListId: string;
  condition: 'on_complete' | 'on_urgent' | 'always' | 'on_agent_approval';
  targetBoardName?: string;
  targetListName?: string;
}

export interface BoardData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'Core Engineering' | 'Executive Overview' | 'Agent Swarms' | 'Human Operations' | 'Cross-Functional';
  lists: ListConfig[];
  feedForwardConnections: FeedForwardConnection[];
  rbacRole: RBACRole;
  theme?: string; // Theme ID, e.g. 'indigo-nebula', 'emerald-matrix', 'sunset-amber', 'cyber-neon', 'obsidian-gold', 'glass-aurora'
}

export interface OrchestratorCommand {
  prompt: string;
  targetBoardId?: string;
  contextListId?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: {
    name: string;
    isAgent: boolean;
    avatar?: string;
  };
  action: string;
  boardName: string;
  cardTitle?: string;
}
