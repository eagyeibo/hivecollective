import { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../config';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); }
      else { setSent(true); }
    } catch {
      setError('Could not connect to server. Is it running?');
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = {
    width: '100%', maxWidth: 400,
    background: 'var(--card-bg-strong)',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 'var(--radius-lg)', padding: '36px 40px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    position: 'relative', overflow: 'hidden',
    animation: 'fadeUp 0.45s ease both', backdropFilter: 'blur(20px)',
  };

  const wrapper = {
    minHeight: 'calc(100svh - 56px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 20px',
  };

  if (sent) {
    return (
      <div style={wrapper}>
        <div className="auth-card" style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--emerald), var(--accent))', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, fontFamily: 'var(--heading)' }}>Check your inbox</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 28 }}>
            If <strong style={{ color: 'var(--text-h)' }}>{email}</strong> is registered,
            you'll receive a reset link within a minute. Check your spam folder if it doesn't arrive.
          </div>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapper}>
      <div className="auth-card" style={cardStyle}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />

        <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', marginBottom: 20, boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}>🔑</div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--heading)', letterSpacing: '-0.4px', color: 'var(--text-h)' }}>Forgot password?</h1>
        <p style={{ color: 'var(--text)', fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          Enter your email and we'll send you a link to reset your password.
        </p>

        {error && (
          <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#f87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 15 }}>
            {loading ? 'Sending…' : 'Send reset link →'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
