import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, Plus, Check, History } from 'lucide-react';
import { CardItemData, TimeLogEntry } from '../types';

interface TimeLoggerWidgetProps {
  card: CardItemData;
  onUpdateCard: (updatedCard: CardItemData) => void;
}

export const TimeLoggerWidget: React.FC<TimeLoggerWidgetProps> = ({
  card,
  onUpdateCard
}) => {
  const [isRunning, setIsRunning] = useState(card.timeLoggerState?.isRunning || false);
  const [seconds, setSeconds] = useState(card.timeLoggerState?.elapsedSeconds || 0);
  const [logDescription, setLogDescription] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const toggleTimer = () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);
    onUpdateCard({
      ...card,
      timeLoggerState: {
        isRunning: nextRunning,
        elapsedSeconds: seconds,
        startTime: nextRunning ? Date.now() : card.timeLoggerState?.startTime
      }
    });
  };

  const handleLogTime = () => {
    if (seconds <= 0) return;
    const newEntry: TimeLogEntry = {
      id: `log-${Date.now()}`,
      durationSeconds: seconds,
      loggedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      description: logDescription.trim() || 'Work session',
      actorName: card.delegate?.name || 'Current User'
    };

    const existingLogs = card.timeLogs || [];
    onUpdateCard({
      ...card,
      timeLogs: [newEntry, ...existingLogs],
      timeLoggerState: {
        isRunning: false,
        elapsedSeconds: 0
      }
    });

    setIsRunning(false);
    setSeconds(0);
    setLogDescription('');
  };

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalLoggedSec = (card.timeLogs || []).reduce((acc, l) => acc + l.durationSeconds, 0);

  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Clock className={`w-4 h-4 ${isRunning ? 'text-emerald-400' : 'text-indigo-400'}`} />
          <span>Time Logger & Work Session</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            Total: {formatTime(totalLoggedSec)}
          </span>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
            title="Toggle time log history"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timer Display & Controls */}
      <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-white/10">
        <div className="font-mono text-lg font-black text-white tracking-widest pl-1">
          {formatTime(seconds)}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTimer}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all ${
              isRunning 
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Timer</span>
              </>
            )}
          </button>

          {seconds > 0 && (
            <button
              onClick={handleLogTime}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-600/20"
              title="Save time log session"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional session note when timer has seconds */}
      {seconds > 0 && (
        <input
          type="text"
          value={logDescription}
          onChange={(e) => setLogDescription(e.target.value)}
          placeholder="Session note e.g. Fixed build bug, optimized query..."
          className="w-full px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-xs focus:outline-none"
        />
      )}

      {/* Time Log History Drawer */}
      {showHistory && card.timeLogs && card.timeLogs.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-white/10 max-h-32 overflow-y-auto custom-scrollbar">
          {card.timeLogs.map(log => (
            <div key={log.id} className="p-2 rounded bg-white/5 border border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="font-mono text-emerald-400 font-bold">{formatTime(log.durationSeconds)}</span>
                <span className="text-slate-300 truncate">{log.description}</span>
              </div>
              <span className="text-slate-500 font-mono text-xs shrink-0">{log.loggedAt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
