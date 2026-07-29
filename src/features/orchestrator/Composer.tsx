import React, { useRef, useState } from 'react';
import { AlertCircle, Loader2, Mic, MicOff, Send } from 'lucide-react';
import { cn } from '../../lib/cn';
import { apiPost } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';

interface ComposerProps {
  value: string;
  onChange(value: string): void;
  onSend(): void;
  /** True while an orchestrator turn is in flight. */
  sending: boolean;
  placeholder?: string;
}

/**
 * Dock composer: natural-language prompt plus the voice-recording block
 * moved verbatim from the deleted OrchestratorModal (same MediaRecorder →
 * /api/transcribe → prompt pipeline), restyled onto the design tokens.
 */
export const Composer: React.FC<ComposerProps> = ({ value, onChange, onSend, sending, placeholder }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
            const data = await apiPost<{ text?: string }>('/api/transcribe', {
              audioData: base64Audio,
              mimeType: 'audio/webm'
            });
            if (data.text) {
              onChange(data.text);
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

  const busy = sending || loading;

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder ?? "Describe what you want to build or change — nothing is applied until you review it…"}
          rows={3}
          className="w-full px-3 py-2 pr-20 bg-bg-2 border border-line rounded-control text-fg placeholder:text-fg-faint text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />

        <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            type="button"
            className={cn(
              'p-1.5 rounded-control border transition-colors',
              isRecording
                ? 'bg-err/20 border-err/40 text-err'
                : 'bg-bg-2 hover:bg-bg-3 border-line text-fg-muted hover:text-fg'
            )}
            title={isRecording ? 'Stop Recording Voice' : 'Record voice prompt'}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-accent-hi" />}
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={onSend}
            disabled={busy || !value.trim()}
            title="Send to Orchestrator (proposes a plan — never applies it directly)"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{loading ? 'Transcribing…' : sending ? 'Thinking…' : 'Send'}</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-control bg-err/10 border border-err/30 text-err text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
