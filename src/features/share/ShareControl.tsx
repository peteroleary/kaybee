import React, { useEffect, useState } from 'react';
import { Check, Copy, Link2, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useAutonomy } from '../runs/AutonomyContext';
import { useWorkspace } from '../../state/WorkspaceProvider';
import type { UserGoal } from '../../types';
import type { ShareComment } from './shareApi';
import { buildSnapshot, createShare, refreshShareSnapshot, revokeShare, shareUrl, subscribeComments } from './shareApi';

/**
 * Owner-side share control: creates a guest link for a goal (a
 * `goalShares/{token}` doc carrying a snapshot of the board), copies it,
 * refreshes the snapshot, and revokes. Lives in the GoalContextBar — the
 * customer-facing half of "You, Me, and AI".
 */
export function ShareControl({ goal }: { goal: UserGoal }) {
  const { user } = useAuth();
  const workspace = useWorkspace();
  const autonomy = useAutonomy();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<ShareComment[]>([]);

  const token = goal.shareToken ?? null;

  // Guest comments surface here while the popover is open — this is how the
  // owner actually hears the customer ("view and interact with me").
  useEffect(() => {
    if (!open || !token) return;
    return subscribeComments(token, setComments);
  }, [open, token]);

  if (!user) return null;
  const link = token ? shareUrl(token) : null;

  const board = workspace.boards.find(b => b.id === goal.boardId) ?? null;
  const goalRuns = autonomy.runs.filter(r => r.goalId === goal.id);

  const handleCreate = async () => {
    setBusy(true);
    try {
      const newToken = await createShare(goal, board, goalRuns, user.uid);
      workspace.handleSaveGoal({ ...goal, shareToken: newToken, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Failed to create share link:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  const handleRefresh = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await refreshShareSnapshot(token, buildSnapshot(goal, board, goalRuns));
    } catch (err) {
      console.error('Failed to refresh share snapshot:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await revokeShare(token);
      workspace.handleSaveGoal({ ...goal, shareToken: null, updatedAt: new Date().toISOString() });
      setOpen(false);
    } catch (err) {
      console.error('Failed to revoke share link:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => (token ? setOpen(!open) : handleCreate())}
        disabled={busy}
        title={token ? 'Manage guest link' : 'Share a read-only view of this goal with a customer'}
      >
        <Link2 className="w-3.5 h-3.5" />
        <span className="hidden md:inline">{busy ? 'Sharing…' : token ? 'Shared' : 'Share'}</span>
      </Button>

      {open && token && link && (
        <div className="absolute right-0 top-full mt-1.5 w-72 rounded-control border border-line bg-bg-1 shadow-lg z-50 p-3 space-y-2">
          <p className="text-xs text-fg-muted">
            Anyone with this link sees a read-only snapshot of the goal and can comment.
          </p>
          <div className="flex items-center gap-1.5">
            <input
              readOnly
              value={link}
              onFocus={e => e.currentTarget.select()}
              className="flex-1 min-w-0 bg-bg-2 border border-line rounded-control px-2 py-1 text-xs text-fg-muted"
            />
            <Button variant="secondary" size="sm" onClick={handleCopy} title="Copy link">
              {copied ? <Check className="w-3.5 h-3.5 text-ok" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={busy} title="Update the snapshot guests see">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRevoke} disabled={busy} title="Revoke link — guests lose access immediately">
              <Trash2 className="w-3.5 h-3.5 text-err" />
              <span className="text-err">Revoke</span>
            </Button>
          </div>

          {comments.length > 0 && (
            <div className="border-t border-line pt-2 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
              <p className="text-xs font-semibold text-fg">Guest comments</p>
              {comments.slice(-5).map(comment => (
                <div key={comment.id} className="text-xs">
                  <span className="font-medium text-fg">{comment.author}: </span>
                  <span className="text-fg-muted">{comment.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
