import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const userRaw = params.get('user');
    const error = params.get('error');

    if (error || !token || !userRaw) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw));
      login(user, token);
      navigate('/', { replace: true });
    } catch {
      navigate('/login?error=oauth_failed', { replace: true });
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Signing you in…</p>
    </div>
  );
}
