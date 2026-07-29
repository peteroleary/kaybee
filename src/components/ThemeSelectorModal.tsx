import React from 'react';
import { X, Palette, Check } from 'lucide-react';
import { BOARD_THEMES } from '../data/tagsAndThemes';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: string;
  onSelectTheme: (themeId: string) => void;
  boardName: string;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
  boardName
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Board Theme & Canvas Background</span>
              </h2>
              <p className="text-xs text-slate-400">
                Customize visual atmosphere and gradient themes for <span className="text-indigo-300 font-semibold">{boardName}</span>
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

        {/* Theme Grid */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Generated Procedural Gradient Themes</span>
            <span className="text-indigo-400 font-mono text-xs">Dynamic Canvas Rendering</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BOARD_THEMES.map((theme) => {
              const isSelected = (currentThemeId || 'indigo-nebula') === theme.id;
              return (
                <div
                  key={theme.id}
                  onClick={() => {
                    onSelectTheme(theme.id);
                  }}
                  className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    isSelected 
                      ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-white/10 shadow-xl' 
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Theme Background Mini Preview Banner */}
                  <div className={`h-16 -mx-4 -mt-4 mb-3 ${theme.canvasBg} relative flex items-center justify-end px-3 border-b border-white/10`}>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-md">
                        <Check className="w-3 h-3" /> Active Theme
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {theme.name}
                      </span>
                      <div className={`w-3.5 h-3.5 rounded-full ${theme.previewColor} shadow-sm`} />
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {theme.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between text-xs text-slate-400">
          <span className="text-xs font-mono">Themes persist across workspace sessions</span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Apply & Done
          </Button>
        </div>

    </Modal>
  );
};
