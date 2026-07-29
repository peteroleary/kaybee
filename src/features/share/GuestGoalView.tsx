import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, Loader2, Send, XCircle } from 'lucide-react';
import type { ShareComment, ShareDoc } from './shareApi';
import { getShare, postComment, subscribeComments } from './shareApi';

/**
 * The We3 guest surface: what a customer sees when they open a share link.
 * Read-only view of the goal's snapshot (progress, lists, cards, recent
 * runs) plus a live comment thread — "view and interact with me" without an
 * account. Rendered by main.tsx outside the owner app shell whenever the URL
 * is #/share/<token>; needs no auth and no providers.
 */
export function GuestGoalView({ token }: { token: string }) {
  const [share, setShare] = useState<ShareDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<ShareComment[]>([]);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    getShare(token)
      .then(setShare)
      .catch(err => console.error('Failed to load shared goal:', err))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!share) return;
    return subscribeComments(token, setComments);
  }, [token, share]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !author.trim()) return;
    setSending(true);
    setCommentError(null);
    try {
      await postComment(token, author.trim(), trimmed);
      setText('');
    } catch (err) {
      setCommentError('Could not post your comment — the link may have been revoked.');
      console.error('Failed to post comment:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-0 text-fg flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-fg-muted" />
      </div>
    );
  }

  if (!share) {
    return (
      <div className="min-h-screen bg-bg-0 text-fg flex items-center justify-center px-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">This link is no longer valid</p>
          <p className="text-sm text-fg-muted">The owner may have revoked it. Ask them for a fresh link.</p>
        </div>
      </div>
    );
  }

  const { snapshot } = share;

  return (
    <div className="min-h-screen bg-bg-0 text-fg">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 px-1.5 bg-accent rounded-control flex items-center justify-center font-bold text-xs text-white">
              W3
            </div>
            <span className="text-xs text-fg-faint">You, Me, and AI — in this together</span>
          </div>
          <span className="text-xs text-fg-faint">Shared goal · read-only</span>
        </header>

        <section className="space-y-3">
          <h1 className="text-xl font-semibold">{snapshot.goalTitle}</h1>
          {snapshot.goalDescription && <p className="text-sm text-fg-muted">{snapshot.goalDescription}</p>}
          {snapshot.outcome && (
            <p className="text-sm text-fg-muted">
              <span className="text-fg font-medium">Success looks like:</span> {snapshot.outcome}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-bg-3 overflow-hidden">
              <div className="h-full bg-accent transition-all duration-500" style={{ width: `${snapshot.progress}%` }} />
            </div>
            <span className="text-sm font-semibold">{snapshot.progress}%</span>
          </div>
          <p className="text-xs text-fg-faint">Snapshot updated {new Date(snapshot.updatedAt).toLocaleString()}</p>
        </section>

        {snapshot.lists.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-faint">Work</h2>
            {snapshot.lists.map((list, listIndex) => (
              <div key={`${list.title}-${listIndex}`} className="rounded-control border border-line bg-bg-1 p-4 space-y-2">
                <h3 className="text-sm font-semibold">
                  {list.title} <span className="text-fg-faint font-normal">({list.cards.length})</span>
                </h3>
                {list.cards.length === 0 ? (
                  <p className="text-xs text-fg-faint">No cards yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {list.cards.map((card, i) => (
                      <li key={`${card.title}-${i}`} className="flex items-center gap-2 text-sm text-fg-muted">
                        {card.status === 'completed' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
                        ) : (
                          <CircleDashed className="w-3.5 h-3.5 text-fg-faint shrink-0" />
                        )}
                        <span className="flex-1 min-w-0 truncate">{card.title}</span>
                        <span className="text-xs text-fg-faint shrink-0">{card.progress}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {snapshot.recentRuns.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-faint">Recent agent runs</h2>
            <ul className="space-y-1.5">
              {snapshot.recentRuns.map((run, i) => (
                <li key={`${run.cardTitle}-${i}`} className="flex items-center gap-2 text-sm text-fg-muted">
                  {run.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-ok shrink-0" />
                  ) : run.status === 'error' ? (
                    <XCircle className="w-3.5 h-3.5 text-err shrink-0" />
                  ) : (
                    <CircleDashed className="w-3.5 h-3.5 text-fg-faint shrink-0" />
                  )}
                  <span className="flex-1 min-w-0 truncate">{run.cardTitle}</span>
                  <span className="text-xs text-fg-faint shrink-0">{run.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-faint">Comments</h2>
          {comments.length === 0 ? (
            <p className="text-sm text-fg-faint">No comments yet — say hello.</p>
          ) : (
            <ul className="space-y-2">
              {comments.map(comment => (
                <li key={comment.id} className="rounded-control border border-line bg-bg-1 px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-fg">{comment.author}</span>
                    <span className="text-xs text-fg-faint">{new Date(comment.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-fg-muted mt-0.5 whitespace-pre-wrap">{comment.text}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-control border border-line bg-bg-1 p-3 space-y-2">
            <input
              className="w-full bg-bg-2 border border-line rounded-control px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-faint"
              placeholder="Your name"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              maxLength={80}
            />
            <textarea
              className="w-full bg-bg-2 border border-line rounded-control px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-faint resize-none"
              placeholder="Leave a comment for the owner…"
              rows={3}
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={2000}
            />
            {commentError && <p className="text-xs text-err">{commentError}</p>}
            <div className="flex justify-end">
              <button
                onClick={handleSend}
                disabled={sending || !text.trim() || !author.trim()}
                className="inline-flex items-center gap-1.5 rounded-control bg-accent hover:bg-accent-hi disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Sending…' : 'Send'}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
