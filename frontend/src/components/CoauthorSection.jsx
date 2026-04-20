import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getBadge } from '../utils/badges';
import API from '../config';

export default function CoauthorSection({ solutionId, isAuthor }) {
  const { isLoggedIn, user, token } = useAuth();
  const [coauthors, setCoauthors] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [username, setUsername] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch(`${API}/solutions/${solutionId}/coauthors`)
      .then(r => r.json())
      .then(d => setCoauthors(d.coauthors || []))
      .catch(() => {});
  }, [solutionId]);

  const myInvite = isLoggedIn && user ? coauthors.find(c => c.user_id === user.id && c.status === 'pending') : null;
  const accepted = coauthors.filter(c => c.status === 'accepted');

  async function invite(e) {
    e.preventDefault();
    setSending(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/solutions/${solutionId}/coauthors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setCoauthors(c => [...c, { user_id: null, username: data.invitee, status: 'pending', author_score: 0, author_solutions_count: 0, author_implemented_count: 0 }]);
      setSuccess(`Invitation sent to @${data.invitee}`);
      setUsername(''); setInviting(false);
    } catch { setError('Could not send invitation.'); }
    finally { setSending(false); }
  }

  async function respond(status) {
    try {
      await fetch(`${API}/solutions/${solutionId}/coauthors/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      setCoauthors(c => c.map(x => x.user_id === user.id ? { ...x, status } : x));
    } catch {}
  }

  async function remove(userId) {
    try {
      await fetch(`${API}/solutions/${solutionId}/coauthors/${userId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      setCoauthors(c => c.filter(x => x.user_id !== userId));
    } catch {}
  }

  if (accepted.length === 0 && !isAuthor && !myInvite) return null;

  return (
    <div style={{ marginTop: 6 }}>
      {accepted.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>& co-authored by</span>
          {accepted.map(c => {
            const b = getBadge(c.author_score, c.author_implemented_count, c.author_solutions_count);
            return (
              <span key={c.user_id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{c.username}</span>
                {b && <span style={{ background: b.bg, border: `0.5px solid ${b.border}`, borderRadius: 20, padding: '1px 6px', fontSize: 10, color: b.color }}>{b.label}</span>}
                {isAuthor && (
                  <button onClick={() => remove(c.user_id)} title="Remove co-author"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)', padding: '0 2px', boxShadow: 'none' }}>✕</button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {myInvite && (
        <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text)' }}>You were invited as a co-author.</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <button onClick={() => respond('accepted')} style={{ fontSize: 12, padding: '4px 14px' }}>Accept</button>
            <button onClick={() => respond('declined')} style={{ fontSize: 12, padding: '4px 14px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: 'none' }}>Decline</button>
          </div>
        </div>
      )}

      {isAuthor && !inviting && (
        <button onClick={() => setInviting(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', padding: '2px 0', boxShadow: 'none' }}>
          + Invite co-author
        </button>
      )}

      {inviting && (
        <form onSubmit={invite} style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="@username"
            style={{ fontSize: 12, padding: '5px 10px', width: 140 }}
            required
          />
          <button type="submit" disabled={sending} style={{ fontSize: 12, padding: '5px 12px' }}>
            {sending ? '…' : 'Invite'}
          </button>
          <button type="button" onClick={() => { setInviting(false); setError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', boxShadow: 'none' }}>
            Cancel
          </button>
        </form>
      )}

      {error && <p style={{ fontSize: 11, color: '#f87171', margin: '4px 0 0' }}>{error}</p>}
      {success && <p style={{ fontSize: 11, color: 'var(--emerald)', margin: '4px 0 0' }}>{success}</p>}
    </div>
  );
}
