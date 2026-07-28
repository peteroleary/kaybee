import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  X,
  Volume2,
  CheckCircle2,
  PlusCircle,
  Search,
  BarChart3,
  Layout,
  Archive,
  ArrowRight,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Modal } from './ui/Modal';

interface VoiceActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteVoiceCommand: (commandText: string) => void;
}

export const VoiceActionModal: React.FC<VoiceActionModalProps> = ({
  isOpen,
  onClose,
  onExecuteVoiceCommand
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastActionStatus, setLastActionStatus] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number[]>(Array(12).fill(10));
  const [showTipOverlay, setShowTipOverlay] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      setTranscript('');
      setLastActionStatus(null);
      return;
    }

    // Initialize Web Speech API if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);

          // Check if user finished speaking a command phrase
          const lower = currentTranscript.toLowerCase();
          if (
            lower.includes('create') ||
            lower.includes('add') ||
            lower.includes('move') ||
            lower.includes('done') ||
            lower.includes('search') ||
            lower.includes('analytics') ||
            lower.includes('dashboard') ||
            lower.includes('template') ||
            lower.includes('archive') ||
            lower.includes('run')
          ) {
            handleProcessCommand(currentTranscript);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition notice:', e);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.error('Speech recognition setup error:', err);
      }
    }
  }, [isOpen]);

  // Animated visualizer effect when listening
  useEffect(() => {
    let interval: any = null;
    if (isListening) {
      interval = setInterval(() => {
        setAudioLevel(Array(12).fill(0).map(() => Math.floor(Math.random() * 80) + 15));
      }, 100);
    } else {
      setAudioLevel(Array(12).fill(10));
    }
    return () => clearInterval(interval);
  }, [isListening]);

  if (!isOpen) return null;

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
    } else {
      setTranscript('');
      setLastActionStatus(null);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          setIsListening(true);
        }
      } else {
        setIsListening(true);
      }
    }
  };

  const handleProcessCommand = (text: string) => {
    if (!text.trim()) return;
    onExecuteVoiceCommand(text);
    setLastActionStatus(`Executed command: "${text}"`);
    setTimeout(() => {
      setTranscript('');
    }, 1500);
  };

  const simulatedCommands = [
    { label: 'Create new feature request', icon: PlusCircle, phrase: 'Create a new feature request card' },
    { label: 'Move card to done', icon: CheckCircle2, phrase: 'Move task card to completed' },
    { label: 'Open analytics dashboard', icon: BarChart3, phrase: 'Open telemetry analytics dashboard' },
    { label: 'Search workspace cards', icon: Search, phrase: 'Open global search modal' },
    { label: 'Open template library', icon: Layout, phrase: 'Open board template library' },
    { label: 'Run auto-archive routine', icon: Archive, phrase: 'Run auto archive inactive completed cards' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${isListening ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Voice-to-Action Listener</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                  AI Speech Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Speak natural commands to manipulate cards, open tools, or trigger routines
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

        {/* Body */}
        <div className="p-6 space-y-5 flex flex-col items-center max-h-[82vh] overflow-y-auto custom-scrollbar">
          
          {/* Subtle Voice Command Tip Overlay */}
          <div className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3.5 transition-all">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowTipOverlay(!showTipOverlay)}>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 border border-slate-700/60">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    <span>Voice Command Tips & Hints</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {showTipOverlay ? 'Click any command below to test or speak it out loud:' : 'Click to show supported speech syntax...'}
                  </p>
                </div>
              </div>

              <button className="p-1 text-slate-400 hover:text-white transition-colors">
                {showTipOverlay ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showTipOverlay && (
              <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div 
                  onClick={() => handleProcessCommand('Create a new feature request card')}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <span className="font-mono text-indigo-300 text-xs">"Create [title] card"</span>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-300">Try it →</span>
                </div>

                <div 
                  onClick={() => handleProcessCommand('Move task card to completed')}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <span className="font-mono text-indigo-300 text-xs">"Move card to [status]"</span>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-300">Try it →</span>
                </div>

                <div 
                  onClick={() => handleProcessCommand('Open telemetry analytics dashboard')}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <span className="font-mono text-indigo-300 text-xs">"Open analytics"</span>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-300">Try it →</span>
                </div>

                <div 
                  onClick={() => handleProcessCommand('Open global search modal')}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <span className="font-mono text-indigo-300 text-xs">"Open search"</span>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-300">Try it →</span>
                </div>

                <div 
                  onClick={() => handleProcessCommand('Run auto archive inactive completed cards')}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <span className="font-mono text-indigo-300 text-xs">"Run auto archive"</span>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-300">Try it →</span>
                </div>

                <div 
                  onClick={() => handleProcessCommand('Open board template library')}
                  className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-200 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <span className="font-mono text-indigo-300 text-xs">"Open template library"</span>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-300">Try it →</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Main Mic Pulse Circle */}
          <div className="relative flex flex-col items-center justify-center py-4">
            <button
              onClick={toggleListening}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening
                  ? 'bg-err text-white scale-110'
                  : 'bg-accent text-white hover:scale-105'
              }`}
            >
              {isListening ? (
                <Volume2 className="w-10 h-10 animate-bounce" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </button>

            {/* Audio Wave Visualizer Bars */}
            <div className="flex items-center gap-1.5 h-12 mt-6">
              {audioLevel.map((height, i) => (
                <div
                  key={i}
                  style={{ height: `${height}%` }}
                  className={`w-1.5 rounded-full transition-all duration-100 ${
                    isListening ? 'bg-accent' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <p className="text-xs font-mono text-slate-300 mt-3">
              {isListening ? 'Listening for speech... Speak now!' : 'Click microphone or tap a preset command below'}
            </p>
          </div>

          {/* Real-time Transcription Box */}
          <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 min-h-[70px] flex flex-col justify-center">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Speech Input Stream</span>
              {transcript && <span className="text-indigo-400 font-semibold">Processing...</span>}
            </div>
            <div className="text-sm font-medium text-slate-100 font-mono italic">
              {transcript ? `"${transcript}"` : <span className="text-slate-500 font-sans not-italic">Say e.g. "Create a feature request card", "Open search", "Move card to completed", "Open analytics"...</span>}
            </div>
          </div>

          {/* Action Execution Alert */}
          {lastActionStatus && (
            <div className="w-full p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lastActionStatus}</span>
            </div>
          )}

          {/* Quick Preset Commands (Guarantees testing in any browser environment) */}
          <div className="w-full space-y-2.5 pt-2 border-t border-white/10">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Test Simulated Voice Commands</span>
              <span className="text-xs font-mono text-slate-500">One-Tap Trigger</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {simulatedCommands.map((cmd, idx) => {
                const IconComponent = cmd.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleProcessCommand(cmd.phrase)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <IconComponent className="w-4 h-4 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium text-slate-200 group-hover:text-indigo-300 truncate">
                        {cmd.label}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-300 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Supported phrases: create, move, search, analytics, archive</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-sans font-medium text-xs border border-white/10"
          >
            Close
          </button>
        </div>

    </Modal>
  );
};
