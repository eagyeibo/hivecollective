import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import API from '../config';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!token) setError('Invalid reset link. Please request a new one.');
  }, [token]);

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < 8;
  const canSubmit = token && password.length >= 8 && password === confirm && !loading;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); }
      else { setSuccess(true); setTimeout(() => navigate('/login'), 3000); }
    } catch {
      setError('Could not connect to server. Is it running?');
    } finally {
      setLoading(false);
    }
  }

  const wrapper = {
    minHeight: 'calc(100svh - 56px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 20px',
  };

  const cardStyle = {
    width: '100%', maxWidth: 400,
    background: 'var(--card-bg-strong)',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 'var(--radius-lg)', padding: '36px 40px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    position: 'relative', overflow: 'hidden',
    animation: 'fadeUp 0.45s ease both', backdropFilter: 'blur(20px)',
  };

  if (success) {
    return (
      <div style={wrapper}>
        <div className="auth-card" style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--emerald), var(--accent))', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-h)', marginBottom: 10, fontFamily: 'var(--heading)' }}>Password updated!</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
            Redirecting you to sign in…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapper}>
      <div className="auth-card" style={cardStyle}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />

        <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', marginBottom: 20, boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}>🔒</div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--heading)', letterSpacing: '-0.4px', color: 'var(--text-h)' }}>Set new password</h1>
        <p style={{ color: 'var(--text)', fontSize: 14, marginBottom: 28 }}>
          Choose a strong password with at least 8 characters.
        </p>

        {error && (
          <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#f87171' }}>
            {error}{' '}
            {(error.includes('invalid') || error.includes('expired')) && (
              <Link to="/forgot-password" style={{ color: '#f87171', fontWeight: 600 }}>Request a new one →</Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label>New password</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{ borderColor: tooShort ? 'rgba(248,113,113,0.5)' : undefined }}
            />
            {tooShort && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Must be at least 8 characters</div>}
          </div>
          <div>
            <label>Confirm password</label>
            <input
              type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••" required
              style={{ borderColor: mismatch ? 'rgba(248,113,113,0.5)' : undefined }}
            />
            {mismatch && <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Passwords do not match</div>}
          </div>
          <button type="submit" disabled={!canSubmit} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 15, marginTop: 4 }}>
            {loading ? 'Updating…' : 'Update password →'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 20, textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
