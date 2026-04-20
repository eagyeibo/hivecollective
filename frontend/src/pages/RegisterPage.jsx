import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import API from '../config';

const BACKEND = API.replace('/api', '');

function GoogleButton() {
  return (
    <a
      href={`${BACKEND}/api/auth/google`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '11px', fontSize: 14, fontWeight: 500,
        background: 'var(--card-bg-subtle)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', color: 'var(--text)', textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.6-3.2-11.3-7.8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.2 5.2C37 39 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
      </svg>
      Sign up with Google
    </a>
  );
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'ha', label: 'Hausa' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
  { code: 'ak', label: 'Akan (Twi)' },
];

function HexCorner() {
  const R = 12, W = R * 1.7321, rowH = R * 1.5;
  function pts(cx, cy) {
    return Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
  }
  const hexes = [];
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 1 ? W / 2 : 0;
    for (let col = 0; col < 5; col++) hexes.push(pts(col * W + offset, row * rowH));
  }
  return (
    <svg aria-hidden="true" width="110" height="80"
      style={{ position: 'absolute', top: 0, right: 0, opacity: 0.18, pointerEvents: 'none' }}
      viewBox="0 0 110 80">
      {hexes.map((p, i) => (
        <polygon key={i} points={p} fill="none" stroke="var(--accent)" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ username: '', email: '', password: '', preferred_language: 'en' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(null); // { email, username } after success
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed.'); return; }
      login(data.user, data.token);
      setRegistered({ email: form.email, username: form.username });
    } catch {
      setError(t('errors.couldNotConnect'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    const token = localStorage.getItem('hc_token');
    if (!token) return;
    setResending(true);
    try {
      await fetch(`${API}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setResent(true);
    } catch {
      // silent
    } finally {
      setResending(false);
    }
  }

  if (registered) {
    return (
      <div style={{
        minHeight: 'calc(100svh - 56px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          background: 'var(--card-bg-strong)',
          border: '1px solid rgba(52,211,153,0.25)',
          borderRadius: 'var(--radius-lg)', padding: '40px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          textAlign: 'center',
          animation: 'fadeUp 0.4s ease both',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-h)', marginBottom: 8, fontFamily: 'var(--heading)' }}>
            Check your inbox
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 8 }}>
            We sent a verification link to
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', marginBottom: 20 }}>
            {registered.email}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 28 }}>
            Click the link in the email to activate your account. The link expires in 24 hours.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <button onClick={() => navigate('/problems')} style={{ padding: '10px 24px', fontSize: 14, width: '100%' }}>
              Continue to HiveCollective →
            </button>
            {resent ? (
              <p style={{ fontSize: 12, color: '#2dd4bf', marginTop: 4 }}>A new link has been sent.</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                style={{ padding: '9px 20px', fontSize: 12, background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, cursor: 'pointer', width: '100%' }}
              >
                {resending ? 'Sending…' : "Didn't get it? Resend email"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: 'calc(100svh - 56px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '10%', right: '5%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,34,240,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="auth-card" style={{
        width: '100%', maxWidth: 420,
        background: 'var(--card-bg-strong)',
        border: '1px solid rgba(168,85,247,0.2)',
        borderRadius: 'var(--radius-lg)', padding: '36px 40px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(168,85,247,0.08)',
        textAlign: 'left', position: 'relative', overflow: 'hidden',
        animation: 'fadeUp 0.45s ease both', backdropFilter: 'blur(20px)',
      }}>
        <HexCorner />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--emerald), var(--accent), var(--accent-2))', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />

        <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--emerald), var(--accent))', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', marginBottom: 20, boxShadow: '0 0 20px rgba(52,211,153,0.4)', animation: 'hexGlow 3s ease-in-out infinite' }}>⬡</div>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, fontFamily: 'var(--heading)', letterSpacing: '-0.4px', color: 'var(--text-h)' }}>
          {t('auth.joinTitle')}
        </h1>
        <p style={{ color: 'var(--text)', fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
          {t('auth.joinSubtitle')}
        </p>

        {error && (
          <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#f87171', lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <GoogleButton />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label>{t('auth.username')}</label>
            <input name="username" value={form.username} onChange={handleChange} placeholder="yourname" required />
          </div>
          <div>
            <label>{t('auth.email')}</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </div>
          <div>
            <label>{t('auth.password')}</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder={t('auth.passwordHint')} required />
          </div>
          <div>
            <label>{t('auth.language')}</label>
            <select name="preferred_language" value={form.preferred_language} onChange={handleChange}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 15, marginTop: 4 }}>
            {loading ? t('auth.creating') : t('auth.createAccount') + ' →'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 20, textAlign: 'center' }}>
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>{t('auth.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
