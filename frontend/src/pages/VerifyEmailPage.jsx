import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../config';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('No verification token found.'); return; }

    fetch(`${API}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setStatus('error'); setErrorMsg(data.error); }
        else {
          setStatus('success');
          // Update stored user so the banner disappears immediately
          if (user) {
            const updated = { ...user, email_verified: true };
            setUser(updated);
            localStorage.setItem('hc_user', JSON.stringify(updated));
          }
        }
      })
      .catch(() => { setStatus('error'); setErrorMsg('Could not connect to the server.'); });
  }, [token]);

  async function handleResend() {
    const storedToken = localStorage.getItem('hc_token');
    if (!storedToken) { navigate('/login'); return; }
    setResending(true);
    try {
      await fetch(`${API}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setResent(true);
    } catch {
      // silent
    } finally {
      setResending(false);
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100svh - 56px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--card-bg-strong)',
        border: `1px solid ${status === 'success' ? 'rgba(52,211,153,0.25)' : status === 'error' ? 'rgba(248,113,113,0.25)' : 'rgba(168,85,247,0.2)'}`,
        borderRadius: 'var(--radius-lg)', padding: '40px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        textAlign: 'center',
        animation: 'fadeUp 0.4s ease both',
      }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-h)', marginBottom: 8 }}>Verifying your email…</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#2dd4bf', marginBottom: 8 }}>Email verified!</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
              Your account is now fully active. You're good to go.
            </p>
            <button onClick={() => navigate('/problems')} style={{ padding: '10px 24px', fontSize: 14 }}>
              Browse problems →
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#f87171', marginBottom: 8 }}>Verification failed</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
              {errorMsg}
            </p>
            {resent ? (
              <p style={{ fontSize: 13, color: '#2dd4bf' }}>A new verification link has been sent to your email.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                {user && !user.email_verified && (
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    style={{ padding: '10px 24px', fontSize: 14 }}
                  >
                    {resending ? 'Sending…' : 'Resend verification email'}
                  </button>
                )}
                <button
                  onClick={() => navigate('/login')}
                  style={{ padding: '9px 20px', fontSize: 13, background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, cursor: 'pointer' }}
                >
                  Back to login
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
