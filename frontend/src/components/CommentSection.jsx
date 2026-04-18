import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../config';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function MentionText({ text }) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return (
    <span>
      {parts.map((part, i) =>
        /^@[a-zA-Z0-9_]+$/.test(part)
          ? <span key={i} style={{ color: 'var(--accent)', fontWeight: 600 }}>{part}</span>
          : part
      )}
    </span>
  );
}

export default function CommentSection({ solutionId }) {
  const { isLoggedIn, user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [count, setCount] = useState(null);

  useEffect(() => {
    fetch(`${API}/solutions/${solutionId}/comments`)
      .then(r => r.json())
      .then(d => { setComments(d.comments || []); setCount((d.comments || []).length); })
      .catch(() => {});
  }, [solutionId]);

  async function postComment(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`${API}/solutions/${solutionId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: input.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setComments(c => [...c, data.comment]); setCount(n => (n || 0) + 1); setInput(''); }
    } catch {}
    finally { setPosting(false); }
  }

  async function deleteComment(commentId) {
    try {
      const res = await fetch(`${API}/solutions/${solutionId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) { setComments(c => c.filter(x => x.id !== commentId)); setCount(n => Math.max(0, (n || 1) - 1)); }
    } catch {}
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', boxShadow: 'none', transform: 'none',
          fontSize: 12, color: 'var(--text-muted)', padding: '2px 0',
          display: 'flex', alignItems: 'center', gap: 5,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M2 2h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-3 2V10H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
        </svg>
        {count !== null ? `${count} comment${count !== 1 ? 's' : ''}` : 'Comments'}
        <span style={{ fontSize: 9 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid rgba(168,85,247,0.2)' }}>
          {loading && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</p>}

          {comments.length === 0 && !loading && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0' }}>No comments yet.</p>
          )}

          {comments.map(c => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginRight: 6 }}>{c.username}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: '3px 0 0', lineHeight: 1.5 }}>
                    <MentionText text={c.content} />
                  </p>
                </div>
                {user && user.id === c.user_id && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, padding: '2px 4px', boxShadow: 'none' }}
                    title="Delete comment"
                  >✕</button>
                )}
              </div>
            </div>
          ))}

          {isLoggedIn ? (
            <form onSubmit={postComment} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Comment… (use @username to mention)"
                maxLength={1000}
                style={{ flex: 1, fontSize: 13, padding: '6px 10px' }}
              />
              <button
                type="submit"
                disabled={posting || !input.trim()}
                style={{ padding: '6px 14px', fontSize: 12 }}
              >Post</button>
            </form>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              <a href="/login">Sign in</a> to comment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
