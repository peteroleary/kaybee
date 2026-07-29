import React from 'react';
import { Bot, User } from 'lucide-react';
import { AgentDoc } from '../../lib/agents/types';
import { fieldControlClasses } from '../../components/ui/Field';
import { cn } from '../../lib/cn';

export interface AgentPickerProps {
  agents: AgentDoc[];
  assignedAgentId?: string | null;
  onAssign(agent: AgentDoc | null): void;
  className?: string;
  disabled?: boolean;
}

export const AgentPicker: React.FC<AgentPickerProps> = ({ agents, assignedAgentId, onAssign, className, disabled }) => {
  const selected = agents.find(a => a.id === assignedAgentId) ?? null;
  const agentOptions = agents.filter(a => a.kind === 'agent');
  const humanOptions = agents.filter(a => a.kind === 'human');

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {selected?.kind === 'human' ? (
        <User className="w-3.5 h-3.5 text-fg-muted shrink-0" />
      ) : (
        <Bot className={cn('w-3.5 h-3.5 shrink-0', selected ? 'text-accent-hi' : 'text-fg-faint')} />
      )}
      <select
        value={assignedAgentId ?? ''}
        disabled={disabled}
        onChange={e => {
          const next = agents.find(a => a.id === e.target.value) ?? null;
          onAssign(next);
        }}
        className={cn(fieldControlClasses, 'py-1.5')}
      >
        <option value="">Unassigned</option>
        {agentOptions.length > 0 && (
          <optgroup label="Agents">
            {agentOptions.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </optgroup>
        )}
        {humanOptions.length > 0 && (
          <optgroup label="People">
            {humanOptions.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
};
