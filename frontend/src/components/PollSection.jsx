import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../config';

export default function PollSection({ solutionId, isAuthor }) {
  const { isLoggedIn, token } = useAuth();
  const [poll, setPoll] = useState(undefined); // undefined = loading
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    const headers = stored ? { Authorization: `Bearer ${stored}` } : {};
    fetch(`${API}/solutions/${solutionId}/poll`, { headers })
      .then(r => r.json())
      .then(d => setPoll(d.poll))
      .catch(() => setPoll(null));
  }, [solutionId]);

  async function createPoll(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/solutions/${solutionId}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: question.trim(), options }),
      });
      const data = await res.json();
      if (res.ok) { setPoll(data.poll); setCreating(false); }
    } catch {}
    finally { setSubmitting(false); }
  }

  async function castVote(optionId) {
    if (!isLoggedIn || voting || poll?.userVote) return;
    setVoting(true);
    try {
      const res = await fetch(`${API}/solutions/${solutionId}/poll/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ option_id: optionId }),
      });
      const data = await res.json();
      if (res.ok) setPoll(p => ({ ...p, options: data.options, userVote: data.userVote }));
    } catch {}
    finally { setVoting(false); }
  }

  async function deletePoll() {
    try {
      await fetch(`${API}/solutions/${solutionId}/poll`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      setPoll(null);
    } catch {}
  }

  if (poll === undefined) return null;

  const totalVotes = poll ? poll.options.reduce((s, o) => s + o.votes, 0) : 0;
  const hasVoted = poll?.userVote != null;

  if (!poll && !isAuthor) return null;

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      {!poll && isAuthor && !creating && (
        <button
          onClick={() => setCreating(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: '2px 0', boxShadow: 'none' }}
        >
          + Add poll
        </button>
      )}

      {creating && (
        <form onSubmit={createPoll} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Poll question…"
            maxLength={200}
            required
            style={{ fontSize: 13, padding: '7px 10px' }}
          />
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input
                value={opt}
                onChange={e => { const next = [...options]; next[i] = e.target.value; setOptions(next); }}
                placeholder={`Option ${i + 1}`}
                maxLength={100}
                required
                style={{ flex: 1, fontSize: 13, padding: '7px 10px' }}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', boxShadow: 'none', padding: '0 6px' }}>✕</button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            {options.length < 6 && (
              <button type="button" onClick={() => setOptions([...options, ''])}
                style={{ fontSize: 12, padding: '5px 12px', background: 'var(--subtle-bg)', border: '1px solid var(--border)', boxShadow: 'none', color: 'var(--text-muted)' }}>
                + Option
              </button>
            )}
            <button type="submit" disabled={submitting} style={{ fontSize: 12, padding: '5px 14px' }}>
              {submitting ? 'Creating…' : 'Create poll'}
            </button>
            <button type="button" onClick={() => setCreating(false)}
              style={{ fontSize: 12, padding: '5px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', boxShadow: 'none' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {poll && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', margin: 0 }}>
              📊 {poll.question}
            </p>
            {isAuthor && (
              <button onClick={deletePoll}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', boxShadow: 'none', padding: '2px 4px' }}
                title="Delete poll">✕</button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {poll.options.map(opt => {
              const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
              const isChosen = poll.userVote === opt.id;
              return (
                <div key={opt.id}>
                  <button
                    onClick={() => castVote(opt.id)}
                    disabled={hasVoted || !isLoggedIn || voting}
                    style={{
                      width: '100%', textAlign: 'left', padding: '7px 10px',
                      background: isChosen ? 'rgba(124,58,237,0.15)' : 'var(--card-bg-subtle)',
                      border: `1px solid ${isChosen ? 'var(--accent-border)' : 'var(--border)'}`,
                      borderRadius: 6, cursor: hasVoted || !isLoggedIn ? 'default' : 'pointer',
                      fontSize: 13, color: 'var(--text)', position: 'relative', overflow: 'hidden',
                      boxShadow: 'none',
                    }}
                  >
                    {hasVoted && (
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: isChosen ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', transition: 'width 0.4s ease' }} />
                    )}
                    <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{opt.text}{isChosen && ' ✓'}</span>
                      {hasVoted && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{pct}% · {opt.votes}</span>}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
            {!isLoggedIn && ' · Sign in to vote'}
          </div>
        </div>
      )}
    </div>
  );
}
