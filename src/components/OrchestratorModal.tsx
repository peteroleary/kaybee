import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Wand2
} from 'lucide-react';
import { BoardData } from '../types';
import { Modal } from './ui/Modal';

interface OrchestratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBoard: BoardData;
  onApplyOrchestratorResult: (result: any) => void;
  onLogActivity: (action: string) => void;
}

export const OrchestratorModal: React.FC<OrchestratorModalProps> = ({
  isOpen,
  onClose,
  activeBoard,
  onApplyOrchestratorResult,
  onLogActivity,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orchestratorOutput, setOrchestratorOutput] = useState<any | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  const presets = [
    {
      label: 'Build QA Swarm List',
      prompt: 'Create a new Homogenous list of 3 AI Agents dedicated to automated load testing and code linting.',
      icon: 'Bot'
    },
    {
      label: 'Convert to Chat Feed',
      prompt: 'Add a new Chat Feed list titled "Live Incident Feed" with sticky composer and AI agent support.',
      icon: 'MessageSquare'
    },
    {
      label: 'Deploy Hybrid Troop',
      prompt: 'Create a Heterogeneous list titled "Troop Delta" containing 2 Humans and 2 Agents with confidence sliders.',
      icon: 'Users'
    },
    {
      label: 'Setup Executive Router',
      prompt: 'Configure a feed-forward connection from Active Feature Pipelines to the Executive High-Level Master board.',
      icon: 'GitFork'
    }
  ];

  const handleStartRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          try {
            setLoading(true);
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64Audio, mimeType: 'audio/webm' })
            });
            const data = await res.json();
            if (data.text) {
              setPrompt(data.text);
            }
          } catch (err: any) {
            setError('Failed to transcribe voice input: ' + err.message);
          } finally {
            setLoading(false);
          }
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err: any) {
      setError('Microphone access error: ' + err.message);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRunOrchestrator = async (customPrompt?: string) => {
    const textToRun = customPrompt || prompt;
    if (!textToRun.trim()) return;

    setLoading(true);
    setError(null);
    setOrchestratorOutput(null);

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToRun,
          currentBoard: activeBoard
        })
      });

      const data = await res.json();
      if (res.ok) {
        setOrchestratorOutput(data);
        onApplyOrchestratorResult(data);
        onLogActivity(`Orchestrator Agent executed prompt: "${textToRun.slice(0, 45)}..."`);
      } else {
        throw new Error(data.details || data.error || 'Failed to orchestrate');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with Gemini Orchestrator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Orchestrator Agent Command Center</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  Gemini-3.6-Flash
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Build, customize, and enhance lists, cards, widgets, and cross-board flows seamlessly.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Instant Orchestration Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(p.prompt);
                    handleRunOrchestrator(p.prompt);
                  }}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left backdrop-blur-md transition-all duration-200 group"
                >
                  <Wand2 className="w-4 h-4 text-indigo-400 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                      {p.label}
                    </div>
                    <div className="text-xs text-slate-400 line-clamp-1">
                      {p.prompt}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Natural Language Prompt & Voice Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Natural Language Prompt & Voice Instruction
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. 'Add a chat feed list for QA feedback', or 'Create a Troop list combining 2 Engineers and 1 Refactor Agent with a confidence slider widget'..."
                className="w-full h-28 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none backdrop-blur-md"
              />

              {/* Voice Mic Button inside Textarea */}
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  type="button"
                  className={`p-2 rounded-xl transition-all ${
                    isRecording 
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40' 
                      : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
                  }`}
                  title={isRecording ? 'Stop Recording Voice' : 'Hold to record voice prompt'}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-indigo-400" />}
                </button>

                <button
                  onClick={() => handleRunOrchestrator()}
                  disabled={loading || !prompt.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hi disabled:opacity-50 text-white font-medium text-xs transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Execute</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 backdrop-blur-md">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Output Execution Result */}
          {orchestratorOutput && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Orchestration Complete!</span>
                </div>
                <span className="text-slate-400 font-mono">Applied to Board</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-white/5 p-2.5 rounded-lg border border-white/10">
                {orchestratorOutput.summary || 'Generated lists and updated board configuration successfully.'}
              </p>

              {orchestratorOutput.newLists && orchestratorOutput.newLists.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400">New Lists Created ({orchestratorOutput.newLists.length}):</span>
                  {orchestratorOutput.newLists.map((nl: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-center justify-between">
                      <span className="font-semibold">{nl.title} ({nl.listType})</span>
                      <span className="text-xs bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">{nl.cards?.length || 0} cards</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Autonomous AI Orchestrator running server-side with Gemini 3.6</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
    </Modal>
  );
};
