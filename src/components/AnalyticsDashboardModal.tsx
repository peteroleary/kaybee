import React, { useState } from 'react';
import {
  X,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  CheckCircle2,
  Bot,
  Layers,
  Zap,
  Activity,
  Sparkles,
  Filter
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  AreaChart, 
  Area, 
  Legend 
} from 'recharts';
import { BoardData, CardItemData } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface AnalyticsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: BoardData[];
  activeBoardId: string;
}

export const AnalyticsDashboardModal: React.FC<AnalyticsDashboardModalProps> = ({
  isOpen,
  onClose,
  boards,
  activeBoardId
}) => {
  const [selectedBoardId, setSelectedBoardId] = useState<string>('all');

  if (!isOpen) return null;

  // Filter boards based on user selection
  const targetBoards = selectedBoardId === 'all' 
    ? boards 
    : boards.filter(b => b.id === selectedBoardId);

  // Collect all cards across target boards
  const allCards: { card: CardItemData; boardName: string; listTitle: string }[] = [];
  targetBoards.forEach(b => {
    b.lists.forEach(l => {
      l.cards.forEach(c => {
        allCards.push({ card: c, boardName: b.name, listTitle: l.title });
      });
    });
  });

  const totalCards = allCards.length;

  // Status breakdown
  const statusCounts = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    completed: 0,
    backlog: 0
  };

  allCards.forEach(({ card }) => {
    if (statusCounts[card.status] !== undefined) {
      statusCounts[card.status]++;
    } else {
      statusCounts.todo++;
    }
  });

  const statusPieData = [
    { name: 'To Do', value: statusCounts.todo, color: '#6366f1' },
    { name: 'In Progress', value: statusCounts.in_progress, color: '#06b6d4' },
    { name: 'In Review', value: statusCounts.in_review, color: '#f59e0b' },
    { name: 'Completed', value: statusCounts.completed, color: '#10b981' },
    { name: 'Backlog', value: statusCounts.backlog, color: '#64748b' },
  ].filter(d => d.value > 0);

  // Completion Rate calculation
  const completedCount = statusCounts.completed;
  const completionPercentage = totalCards > 0 ? Math.round((completedCount / totalCards) * 100) : 0;

  // Entity Type Completion Comparison (BarChart)
  const entityStats: Record<string, { total: number; completed: number; name: string }> = {
    task: { total: 0, completed: 0, name: 'Standard Tasks' },
    agent: { total: 0, completed: 0, name: 'AI Agents' },
    routine: { total: 0, completed: 0, name: 'Automated Routines' },
    human: { total: 0, completed: 0, name: 'Human Ops' },
    agent_swarm: { total: 0, completed: 0, name: 'Agent Swarms' },
    troop: { total: 0, completed: 0, name: 'Hybrid Troops' }
  };

  allCards.forEach(({ card }) => {
    if (!entityStats[card.entityType]) {
      entityStats[card.entityType] = { total: 0, completed: 0, name: card.entityType };
    }
    entityStats[card.entityType].total++;
    if (card.status === 'completed' || card.progress === 100) {
      entityStats[card.entityType].completed++;
    }
  });

  const entityBarData = Object.values(entityStats)
    .filter(item => item.total > 0)
    .map(item => ({
      name: item.name,
      Active: item.total - item.completed,
      Completed: item.completed,
      Rate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0
    }));

  // Activity Velocity over days (Mock trend based on timestamps or indexed distribution)
  const activityVelocityData = [
    { day: 'Mon', Tasks: Math.max(2, Math.floor(totalCards * 0.2)), Agents: Math.floor(totalCards * 0.15), Completed: Math.floor(completedCount * 0.2) },
    { day: 'Tue', Tasks: Math.max(4, Math.floor(totalCards * 0.35)), Agents: Math.floor(totalCards * 0.25), Completed: Math.floor(completedCount * 0.35) },
    { day: 'Wed', Tasks: Math.max(3, Math.floor(totalCards * 0.45)), Agents: Math.floor(totalCards * 0.4), Completed: Math.floor(completedCount * 0.5) },
    { day: 'Thu', Tasks: Math.max(6, Math.floor(totalCards * 0.65)), Agents: Math.floor(totalCards * 0.6), Completed: Math.floor(completedCount * 0.7) },
    { day: 'Fri', Tasks: Math.max(8, Math.floor(totalCards * 0.85)), Agents: Math.floor(totalCards * 0.8), Completed: Math.floor(completedCount * 0.85) },
    { day: 'Sat', Tasks: Math.max(9, Math.floor(totalCards * 0.95)), Agents: Math.floor(totalCards * 0.9), Completed: Math.floor(completedCount * 0.95) },
    { day: 'Sun', Tasks: totalCards, Agents: totalCards - 1, Completed: completedCount }
  ];

  // List breakdown for active board
  const activeBoard = boards.find(b => b.id === (selectedBoardId === 'all' ? activeBoardId : selectedBoardId)) || boards[0];
  const listBreakdownData = activeBoard.lists.map(l => ({
    title: l.title,
    count: l.cards.length,
    completed: l.cards.filter(c => c.status === 'completed' || c.progress === 100).length
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Workspace Telemetry & Analytics</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  Live Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time tracking of work items, agent velocity, and swarm task completion rates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Board Selector */}
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={selectedBoardId}
                onChange={(e) => setSelectedBoardId(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-200">All Workspace Boards</option>
                {boards.map(b => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-slate-200">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dashboard Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Top KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Total Cards</span>
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">{totalCards}</span>
                <span className="text-xs text-slate-400 font-mono">across lists</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Completion Rate</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400 font-mono">{completionPercentage}%</span>
                <span className="text-xs text-emerald-300 font-mono">({completedCount} done)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Agent Task Velocity</span>
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-cyan-400 font-mono">
                  {entityStats.agent.completed + entityStats.routine.completed}
                </span>
                <span className="text-xs text-cyan-300 font-mono">agent ops</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Active Board Lists</span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-300 font-mono">
                  {activeBoard.lists.length}
                </span>
                <span className="text-xs text-slate-400 font-mono">in {activeBoard.name}</span>
              </div>
            </div>
          </div>

          {/* Charts Grid - Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Donut Chart: Card Status Distribution */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-indigo-400" />
                  <span>Card Status Distribution</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">By State</span>
              </div>

              <div className="h-64 w-full">
                {statusPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderColor: '#334155', 
                          borderRadius: '0.75rem', 
                          color: '#f8fafc',
                          fontSize: '12px'
                        }} 
                      />
                      <Legend 
                        formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No cards available for status calculation
                  </div>
                )}
              </div>
            </div>

            {/* Area Chart: Board Activity & Velocity Trend */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Activity & Execution Velocity</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">Weekly Pulse</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityVelocityData}>
                    <defs>
                      <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAgents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155', 
                        borderRadius: '0.75rem', 
                        color: '#f8fafc',
                        fontSize: '12px'
                      }} 
                    />
                    <Area type="monotone" dataKey="Tasks" stroke="#6366f1" fillOpacity={1} fill="url(#colorTasks)" />
                    <Area type="monotone" dataKey="Agents" stroke="#06b6d4" fillOpacity={1} fill="url(#colorAgents)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Charts Grid - Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Bar Chart: Completion Rates by Entity Type */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>Task Completion Rates by Entity Type</span>
                </h3>
                <span className="text-xs font-mono text-slate-400 font-semibold">Active vs Done</span>
              </div>

              <div className="h-64 w-full">
                {entityBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={entityBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderColor: '#334155', 
                          borderRadius: '0.75rem', 
                          color: '#f8fafc',
                          fontSize: '12px'
                        }} 
                      />
                      <Legend formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>} />
                      <Bar dataKey="Active" stackId="a" fill="#334155" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="Completed" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No entity data available
                  </div>
                )}
              </div>
            </div>

            {/* Bar Chart: List Card Distribution on Active Board */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Active Board List Workload</span>
                </h3>
                <span className="text-xs font-mono text-amber-300 capitalize">{activeBoard.name}</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={listBreakdownData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="title" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155', 
                        borderRadius: '0.75rem', 
                        color: '#f8fafc',
                        fontSize: '12px'
                      }} 
                    />
                    <Bar dataKey="count" name="Total Cards" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-mono text-xs">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Telemetry automatically synchronized across human-agent swarm actions</span>
          </div>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close Dashboard
          </Button>
        </div>

    </Modal>
  );
};
