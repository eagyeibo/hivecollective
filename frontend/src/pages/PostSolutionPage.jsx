import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../config';

export default function PostSolutionPage() {
  const { id } = useParams();
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchProblem() {
      const res = await fetch(`${API}/problems/${id}`);
      const data = await res.json();
      if (res.ok) setProblem(data.problem);
    }
    fetchProblem();
  }, [id]);

  if (!isLoggedIn) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 15, marginBottom: 12, color: 'var(--text)' }}>You need to be signed in to propose a solution.</p>
        <button onClick={() => navigate('/login')}>Sign in</button>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/problems/${id}/solutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to post solution.'); return; }
      navigate(`/problems/${id}`);
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }

  const ghostBtn = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-h)', boxShadow: 'none', padding: '7px 14px', fontSize: 13,
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
      <button onClick={() => navigate(`/problems/${id}`)} style={{ ...ghostBtn, marginBottom: 24 }}>
        ← Back to problem
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--heading)', color: 'var(--text-h)', letterSpacing: '-0.4px', borderLeft: '3px solid var(--emerald)', paddingLeft: 12 }}>
        Propose a solution
      </h1>

      {problem && (
        <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginTop: 16, marginBottom: 20, fontSize: 13, color: 'var(--text)' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Problem: </span>{problem.title}
        </div>
      )}

      <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 24, paddingLeft: 15 }}>
        Describe your solution clearly. What should be done, by whom, and how?
      </p>

      {error && (
        <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#f87171' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label>Your solution</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Describe your solution in detail…"
          required rows={7}
        />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 16px', textAlign: 'right', fontFamily: 'var(--mono)' }}>
          {content.length} / 5000
        </p>
        <button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
          {loading ? 'Posting…' : 'Post solution →'}
        </button>
      </form>
    </div>
  );
}
