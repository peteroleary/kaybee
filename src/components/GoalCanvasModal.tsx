import React, { useState } from 'react';
import { 
  X, 
  Target, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  ArrowRight,
  Bot,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { UserGoal, BoardData } from '../types';

interface GoalCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: UserGoal[];
  onSaveGoal: (goal: UserGoal) => void;
  onDeleteGoal: (goalId: string) => void;
  onDecomposeGoal: (goal: UserGoal) => void;
  boards: BoardData[];
}

export const GoalCanvasModal: React.FC<GoalCanvasModalProps> = ({
  isOpen,
  onClose,
  goals,
  onSaveGoal,
  onDeleteGoal,
  onDecomposeGoal,
  boards
}) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalOutcome, setNewGoalOutcome] = useState('');
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [decomposeResult, setDecomposeResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleCreateGoal = () => {
    if (!newGoalTitle.trim()) return;

    const newGoal: UserGoal = {
      id: `goal-${Date.now()}`,
      title: newGoalTitle,
      description: newGoalDescription,
      outcome: newGoalOutcome || `Successfully complete: ${newGoalTitle}`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      boardIds: selectedBoardIds.length > 0 ? selectedBoardIds : [boards[0]?.id],
      progress: 0,
      assignedAgentTypes: []
    };

    onSaveGoal(newGoal);
    setNewGoalTitle('');
    setNewGoalDescription('');
    setNewGoalOutcome('');
    setSelectedBoardIds([]);
  };

  const handleDecomposeGoal = async (goal: UserGoal) => {
    setIsDecomposing(true);
    setDecomposeResult(null);

    try {
      const res = await fetch('/api/goal-decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: {
            title: goal.title,
            description: goal.description,
            outcome: goal.outcome
          },
          currentBoard: boards.find(b => b.id === goal.boardIds[0])
        })
      });

      const data = await res.json();
      setDecomposeResult(data);
      
      if (data.newLists && data.newLists.length > 0) {
        onDecomposeGoal({ ...goal, decomposedLists: data.newLists });
      }
    } catch (err: any) {
      console.error('Failed to decompose goal:', err);
    } finally {
      setIsDecomposing(false);
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Goal Canvas</h2>
              <p className="text-xs text-slate-400">Define outcomes and let agents execute autonomously</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Create New Goal Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Goal Title
                </label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g., Launch Mobile App v2.0"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Description
                </label>
                <textarea
                  value={newGoalDescription}
                  onChange={(e) => setNewGoalDescription(e.target.value)}
                  placeholder="What needs to be accomplished?"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Success Outcome
                </label>
                <input
                  type="text"
                  value={newGoalOutcome}
                  onChange={(e) => setNewGoalOutcome(e.target.value)}
                  placeholder="e.g., App deployed to App Store with 4.5+ rating"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                  Associated Boards
                </label>
                <div className="flex flex-wrap gap-2">
                  {boards.map(board => (
                    <button
                      key={board.id}
                      onClick={() => {
                        setSelectedBoardIds(prev => 
                          prev.includes(board.id) 
                            ? prev.filter(id => id !== board.id)
                            : [...prev, board.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedBoardIds.includes(board.id)
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {board.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateGoal}
                disabled={!newGoalTitle.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Goal</span>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Target className="w-3.5 h-3.5" />
                  <span>Active Goals</span>
                </div>
                <div className="text-2xl font-bold text-white">{activeGoals.length}</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Completed</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{completedGoals.length}</div>
              </div>

              <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Agent Autonomy</span>
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  {activeGoals.length > 0 ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Active Goals List */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Active Goals
            </h3>
            <div className="space-y-3">
              {activeGoals.length === 0 ? (
                <div className="p-6 rounded-lg bg-slate-800 border border-slate-700 text-center">
                  <p className="text-slate-400 text-sm">No active goals. Create one to get started.</p>
                </div>
              ) : (
                activeGoals.map(goal => (
                  <div
                    key={goal.id}
                    className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-white mb-1">{goal.title}</h4>
                        <p className="text-sm text-slate-400 mb-2">{goal.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          <span>Created {new Date(goal.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400">Progress toward outcome</span>
                        <span className="text-white font-medium">{goal.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-500"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDecomposeGoal(goal)}
                        disabled={isDecomposing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {isDecomposing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>Auto-Decompose</span>
                      </button>

                      <button
                        onClick={() => {
                          const updatedGoal = { ...goal, progress: Math.min(100, goal.progress + 10) };
                          onSaveGoal(updatedGoal);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Update Progress</span>
                      </button>

                      {goal.progress >= 100 && (
                        <button
                          onClick={() => onSaveGoal({ ...goal, status: 'completed', updatedAt: new Date().toISOString() })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Complete</span>
                        </button>
                      )}
                    </div>

                    {/* Decomposition Result */}
                    {decomposeResult && (
                      <div className="mt-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 mb-2">
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>AI Decomposition Result</span>
                        </div>
                        <p className="text-xs text-slate-300 mb-2">{decomposeResult.summary}</p>
                        {decomposeResult.newLists && (
                          <div className="space-y-1">
                            {decomposeResult.newLists.map((nl: any, idx: number) => (
                              <div key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                <span>{nl.title} ({nl.cards?.length || 0} tasks)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Completed Goals
              </h3>
              <div className="space-y-2">
                {completedGoals.map(goal => (
                  <div
                    key={goal.id}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 opacity-75"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 line-through">{goal.title}</h4>
                        <p className="text-xs text-slate-500">Completed {new Date(goal.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
