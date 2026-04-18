import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../config';

export default function CreateGroupPage() {
  const { id } = useParams();
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLoggedIn) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 15, marginBottom: 12, color: 'var(--text)' }}>You need to be signed in to create a group.</p>
        <button onClick={() => navigate('/login')}>Sign in</button>
      </div>
    );
  }

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ problem_id: parseInt(id), ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create group.'); return; }
      navigate(`/groups/${data.group.id}`);
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
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px' }}>
      <button onClick={() => navigate(`/problems/${id}`)} style={{ ...ghostBtn, marginBottom: 24 }}>
        ← Back to problem
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--heading)', color: 'var(--text-h)', letterSpacing: '-0.4px', borderLeft: '3px solid var(--accent)', paddingLeft: 12 }}>
        Create a group
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 28, paddingLeft: 15 }}>
        Groups bring people together around a specific problem. As creator you become the moderator.
      </p>

      {error && (
        <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#f87171' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label>Group name</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Clean Water Action Group — Ghana" required />
        </div>
        <div>
          <label>Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <textarea name="description" value={form.description} onChange={handleChange} placeholder="What is this group trying to achieve? Who should join?" rows={4} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
          {loading ? 'Creating…' : 'Create group →'}
        </button>
      </form>
    </div>
  );
}
