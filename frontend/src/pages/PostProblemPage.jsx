import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../config';

const ALL_TAGS = ['health','education','infrastructure','agriculture','environment','economy','security','governance','technology','other'];

export default function PostProblemPage() {
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', scope: 'national', location_tag: '', tags: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLoggedIn) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 15, marginBottom: 12, color: 'var(--text)' }}>You need to be signed in to post a problem.</p>
        <button onClick={() => navigate('/login')}>Sign in</button>
      </div>
    );
  }

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  function toggleTag(tag) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to post problem.'); return; }
      navigate(`/problems/${data.problem.id}`);
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
      <button onClick={() => navigate('/problems')} style={{ ...ghostBtn, marginBottom: 24 }}>
        ← Back
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--heading)', color: 'var(--text-h)', letterSpacing: '-0.4px', borderLeft: '3px solid var(--accent)', paddingLeft: 12 }}>
        Post a problem
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 28, paddingLeft: 15 }}>
        Describe a real challenge affecting your community, country, or region.
      </p>

      {error && (
        <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#f87171' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label>Problem title</label>
          <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Lack of clean drinking water in rural areas" required />
        </div>

        <div>
          <label>Description</label>
          <textarea
            name="description" value={form.description} onChange={handleChange}
            placeholder="Describe the problem in detail. Who does it affect? What are the consequences? What has been tried before?"
            required rows={5}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label>Scope</label>
            <select name="scope" value={form.scope} onChange={handleChange}>
              <option value="national">National</option>
              <option value="local">Local</option>
            </select>
          </div>
          <div>
            <label>Location</label>
            <input name="location_tag" value={form.location_tag} onChange={handleChange} placeholder="e.g. Ghana or Accra" required />
          </div>
        </div>

        <div>
          <label>
            Categories <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {ALL_TAGS.map(tag => {
              const selected = form.tags.includes(tag);
              return (
                <button
                  key={tag} type="button" onClick={() => toggleTag(tag)}
                  style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', boxShadow: 'none', transform: 'none',
                    border: `1px solid ${selected ? 'var(--accent-border)' : 'var(--border)'}`,
                    background: selected ? 'var(--accent-bg)' : 'transparent',
                    color: selected ? 'var(--accent)' : 'var(--text)',
                    transition: 'all 0.12s',
                  }}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 4 }}>
          {loading ? 'Posting…' : 'Post problem →'}
        </button>
      </form>
    </div>
  );
}
