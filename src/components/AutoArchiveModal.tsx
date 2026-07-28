import React, { useState } from 'react';
import { X, Archive, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { BoardData, CardItemData } from '../types';
import { Modal } from './ui/Modal';

interface AutoArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: BoardData;
  onRunAutoArchive: (daysThreshold: number) => void;
}

export const AutoArchiveModal: React.FC<AutoArchiveModalProps> = ({
  isOpen,
  onClose,
  board,
  onRunAutoArchive
}) => {
  const [daysThreshold, setDaysThreshold] = useState<number>(7);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  // Find completed cards that qualify for archiving
  const archiveList = board.lists.find(l => l.title.toLowerCase().includes('archive'));

  const eligibleCards: { card: CardItemData; listTitle: string }[] = [];

  board.lists.forEach(l => {
    // Skip cards already in the Archive list
    if (l.id === archiveList?.id || l.title.toLowerCase().includes('archive')) return;

    l.cards.forEach(c => {
      if (c.status === 'completed' || c.progress === 100) {
        eligibleCards.push({ card: c, listTitle: l.title });
      }
    });
  });

  const handleExecute = () => {
    onRunAutoArchive(daysThreshold);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Auto-Archive Routine</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  7-Day Threshold
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Automatically clean up completed cards inactive for 7+ days into the Archive list
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Threshold selector */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span>Inactivity Threshold Routine</span>
              <span className="text-indigo-400 font-mono">{daysThreshold} Days Inactive</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 3, 7, 14, 30].map(days => (
                <button
                  key={days}
                  onClick={() => setDaysThreshold(days)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                    daysThreshold === days
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* Qualification Summary */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Eligible Cards for Archiving ({eligibleCards.length})</span>
              <span className="text-xs font-mono text-slate-400">Board: {board.name}</span>
            </div>

            {eligibleCards.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-white/5 rounded-2xl border border-white/10">
                No completed cards found outside the Archive list on this board.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5">
                {eligibleCards.map(({ card, listTitle }) => (
                  <div
                    key={card.id}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium text-slate-200 truncate">{card.title}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded shrink-0">
                      From: {listTitle}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Successfully archived {eligibleCards.length} completed cards!</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Destination list: "Archive"</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-sans font-medium text-xs border border-white/10"
            >
              Cancel
            </button>
            <button
              disabled={eligibleCards.length === 0}
              onClick={handleExecute}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-sans font-bold text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run Auto-Archive Now</span>
            </button>
          </div>
        </div>

    </Modal>
  );
};
