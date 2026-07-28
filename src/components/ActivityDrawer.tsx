import React from 'react';
import { motion } from 'motion/react';
import { X, Activity, Bot, User } from 'lucide-react';
import { ActivityLog } from '../types';

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivityLog[];
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({
  isOpen,
  onClose,
  activities,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-bg-1 border-l border-line flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Telemetry & Activity Log</span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Activity Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {activities.map((act) => (
          <div key={act.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs backdrop-blur-md">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <div className="flex items-center gap-1.5">
                {act.actor.isAgent ? (
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="font-bold text-slate-200">{act.actor.name}</span>
              </div>
              <span className="font-mono text-slate-400">{act.timestamp}</span>
            </div>

            <p className="text-slate-200 leading-normal">{act.action}</p>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1 border-t border-white/10">
              <span>Board: {act.boardName}</span>
              {act.cardTitle && <span className="truncate max-w-[120px] text-indigo-300">{act.cardTitle}</span>}
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs">
            No activity recorded yet in this session.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 bg-white/5 backdrop-blur-md text-xs text-slate-400 font-mono text-center">
        Real-Time Agent Execution & Human Delegation Engine
      </div>
    </motion.div>
  );
};
