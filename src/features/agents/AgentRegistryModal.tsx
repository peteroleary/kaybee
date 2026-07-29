import React, { useState } from 'react';
import { Bot, Pencil, Plus, Trash2, User, X } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Field, fieldControlClasses } from '../../components/ui/Field';
import { Badge } from '../../components/ui/Badge';
import { Panel } from '../../components/ui/Panel';
import { StatusDot, Status } from '../../components/ui/StatusDot';
import { useAgents } from '../../state/AgentProvider';
import { AGENT_CAPABILITIES, AgentCapabilityId } from '../../shared/agentCapabilities';
import { MODELS, ModelId } from '../../shared/models';
import { slugify } from '../../lib/agents/builtIns';
import { ActorKind, AgentDoc } from '../../lib/agents/types';
import { EntityType } from '../../types';

export interface AgentRegistryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AgentDraft {
  kind: ActorKind;
  name: string;
  description: string;
  avatar: string;
  entityType: EntityType;
  capabilities: AgentCapabilityId[];
  status: AgentDoc['status'];
  autoExecute: boolean;
  requiresApproval: boolean;
  model: ModelId;
  systemPrompt: string;
}

const ENTITY_TYPE_OPTIONS: EntityType[] = ['agent', 'human', 'agent_swarm', 'human_team', 'routine', 'troop', 'task'];
const MODEL_OPTIONS: ModelId[] = Array.from(new Set(Object.values(MODELS)));

function draftFromAgent(agent: AgentDoc): AgentDraft {
  return {
    kind: agent.kind,
    name: agent.name,
    description: agent.description,
    avatar: agent.avatar ?? '',
    entityType: agent.entityType,
    capabilities: agent.capabilities,
    status: agent.status,
    autoExecute: agent.autoExecute,
    requiresApproval: agent.requiresApproval,
    model: agent.model,
    systemPrompt: agent.systemPrompt,
  };
}

function emptyDraft(kind: ActorKind): AgentDraft {
  return {
    kind,
    name: '',
    description: '',
    avatar: '',
    entityType: kind === 'human' ? 'human' : 'agent',
    capabilities: [],
    status: 'idle',
    autoExecute: kind === 'agent',
    requiresApproval: kind === 'human',
    model: MODELS.agentRun,
    systemPrompt: '',
  };
}

function statusDotStatus(status: AgentDoc['status']): Status {
  return status === 'busy' ? 'running' : 'idle';
}

export const AgentRegistryModal: React.FC<AgentRegistryModalProps> = ({ isOpen, onClose }) => {
  const { agents, saveAgent, deleteAgent } = useAgents();
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const startCreate = (kind: ActorKind) => {
    setEditingId('new');
    setDraft(emptyDraft(kind));
    setConfirmDeleteId(null);
  };

  const startEdit = (agent: AgentDoc) => {
    setEditingId(agent.id);
    setDraft(draftFromAgent(agent));
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const toggleCapability = (id: AgentCapabilityId) => {
    if (!draft) return;
    const has = draft.capabilities.includes(id);
    setDraft({
      ...draft,
      capabilities: has ? draft.capabilities.filter(c => c !== id) : [...draft.capabilities, id],
    });
  };

  const handleSave = async () => {
    if (!draft || !draft.name.trim()) return;
    await saveAgent({
      id: editingId !== 'new' ? (editingId ?? undefined) : undefined,
      kind: draft.kind,
      slug: slugify(draft.name),
      name: draft.name.trim(),
      description: draft.description.trim(),
      avatar: draft.avatar.trim() || undefined,
      entityType: draft.entityType,
      capabilities: draft.capabilities,
      status: draft.status,
      autoExecute: draft.autoExecute,
      requiresApproval: draft.requiresApproval,
      model: draft.model,
      systemPrompt: draft.systemPrompt,
    });
    cancelEdit();
  };

  const handleDelete = async (id: string) => {
    await deleteAgent(id);
    setConfirmDeleteId(null);
    if (editingId === id) cancelEdit();
  };

  const agentList = agents.filter(a => a.kind === 'agent');
  const humanList = agents.filter(a => a.kind === 'human');

  const renderRow = (agent: AgentDoc) => (
    <div key={agent.id} className="p-3 rounded-control bg-bg-2 border border-line flex items-start justify-between gap-3">
      <div className="flex items-start gap-2.5 min-w-0">
        {agent.kind === 'human' ? (
          <User className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" />
        ) : (
          <Bot className="w-4 h-4 text-accent-hi shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-fg truncate">{agent.name}</span>
            <StatusDot status={statusDotStatus(agent.status)} title={`Status: ${agent.status}`} />
            {agent.isBuiltIn && <Badge tone="neutral">Built-in</Badge>}
            {agent.kind === 'agent' && agent.autoExecute && <Badge tone="accent">Auto-execute</Badge>}
          </div>
          {agent.description && <p className="text-xs text-fg-muted line-clamp-2">{agent.description}</p>}
          {agent.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {agent.capabilities.map(c => (
                <Badge key={c} tone="neutral">
                  {AGENT_CAPABILITIES.find(cap => cap.id === c)?.label ?? c}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <IconButton aria-label={`Edit ${agent.name}`} title="Edit" onClick={() => startEdit(agent)}>
          <Pencil className="w-3.5 h-3.5" />
        </IconButton>
        {confirmDeleteId === agent.id ? (
          <div className="flex items-center gap-1">
            <Button variant="danger" size="sm" onClick={() => handleDelete(agent.id)}>
              Confirm
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <IconButton aria-label={`Delete ${agent.name}`} title="Delete" variant="danger" onClick={() => setConfirmDeleteId(agent.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        )}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl max-h-[85vh]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-line">
        <div>
          <h2 className="text-lg font-bold text-fg">Agent Registry</h2>
          <p className="text-xs text-fg-muted">Manage the agents and people cards can be assigned to.</p>
        </div>
        <IconButton aria-label="Close agent registry" onClick={onClose}>
          <X className="w-5 h-5" />
        </IconButton>
      </div>

      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        {draft && (
          <Panel className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-fg">{editingId === 'new' ? 'New' : 'Edit'} {draft.kind === 'human' ? 'Person' : 'Agent'}</h3>
              <IconButton aria-label="Cancel edit" onClick={cancelEdit}>
                <X className="w-4 h-4" />
              </IconButton>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <input
                  type="text"
                  value={draft.name}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  className={fieldControlClasses}
                  autoFocus
                />
              </Field>
              <Field label="Entity Type">
                <select
                  value={draft.entityType}
                  onChange={e => setDraft({ ...draft, entityType: e.target.value as EntityType })}
                  className={fieldControlClasses}
                >
                  {ENTITY_TYPE_OPTIONS.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Description">
              <textarea
                value={draft.description}
                onChange={e => setDraft({ ...draft, description: e.target.value })}
                className={fieldControlClasses}
                rows={2}
              />
            </Field>

            <Field label="Avatar URL">
              <input
                type="text"
                value={draft.avatar}
                onChange={e => setDraft({ ...draft, avatar: e.target.value })}
                placeholder="https://..."
                className={fieldControlClasses}
              />
            </Field>

            {draft.kind === 'agent' && (
              <Field label="Capabilities">
                <div className="flex flex-wrap gap-1.5">
                  {AGENT_CAPABILITIES.map(cap => {
                    const active = draft.capabilities.includes(cap.id);
                    return (
                      <button
                        key={cap.id}
                        type="button"
                        onClick={() => toggleCapability(cap.id)}
                        className={
                          active
                            ? 'px-2 py-1 rounded-control text-xs font-medium border bg-accent/20 text-accent-hi border-accent/40'
                            : 'px-2 py-1 rounded-control text-xs font-medium border bg-bg-2 text-fg-muted border-line hover:text-fg'
                        }
                      >
                        {cap.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select
                  value={draft.status}
                  onChange={e => setDraft({ ...draft, status: e.target.value as AgentDoc['status'] })}
                  className={fieldControlClasses}
                >
                  <option value="idle">Idle</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </Field>
              <Field label="Model">
                <select
                  value={draft.model}
                  onChange={e => setDraft({ ...draft, model: e.target.value as ModelId })}
                  className={fieldControlClasses}
                >
                  {MODEL_OPTIONS.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {draft.kind === 'agent' && (
              <div className="flex items-center gap-4 text-xs text-fg-muted">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.autoExecute}
                    onChange={e => setDraft({ ...draft, autoExecute: e.target.checked })}
                  />
                  <span>Auto-execute</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.requiresApproval}
                    onChange={e => setDraft({ ...draft, requiresApproval: e.target.checked })}
                  />
                  <span>Requires approval</span>
                </label>
              </div>
            )}

            <Field label="System Prompt">
              <textarea
                value={draft.systemPrompt}
                onChange={e => setDraft({ ...draft, systemPrompt: e.target.value })}
                className={fieldControlClasses}
                rows={3}
              />
            </Field>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={!draft.name.trim()}>
                Save
              </Button>
            </div>
          </Panel>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-fg-muted uppercase tracking-wider">Agents ({agentList.length})</h3>
            <Button variant="secondary" size="sm" onClick={() => startCreate('agent')}>
              <Plus className="w-3.5 h-3.5" />
              <span>New Agent</span>
            </Button>
          </div>
          <div className="space-y-2">{agentList.map(renderRow)}</div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-fg-muted uppercase tracking-wider">People ({humanList.length})</h3>
            <Button variant="secondary" size="sm" onClick={() => startCreate('human')}>
              <Plus className="w-3.5 h-3.5" />
              <span>New Person</span>
            </Button>
          </div>
          <div className="space-y-2">{humanList.map(renderRow)}</div>
        </div>
      </div>
    </Modal>
  );
};
