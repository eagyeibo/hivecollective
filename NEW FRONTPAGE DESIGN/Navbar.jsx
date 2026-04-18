// src/components/Navbar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  function handleLogout() {
    logout();
    navigate('/');
  }

  function isActive(path) {
    return location.pathname.startsWith(path);
  }

  const ghostBtn = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-h)',
    borderRadius: 'var(--radius-md)',
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    boxShadow: 'none',
    transition: 'background 0.2s, border-color 0.2s',
  };

  const primaryBtn = {
    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
    border: 'none',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    padding: '7px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(124,34,240,0.38)',
  };

  const navLink = (active) => ({
    background: active ? 'var(--accent-bg)' : 'transparent',
    border: `1px solid ${active ? 'var(--accent-border)' : 'transparent'}`,
    color: active ? 'var(--accent)' : 'var(--text)',
    borderRadius: 'var(--radius-md)',
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    boxShadow: 'none',
    transform: 'none',
  });

  return (
    <nav style={{
      background: 'rgba(8,6,18,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(124,34,240,0.15)',
      padding: '0 20px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: 12,
    }}>

      {/* Logo */}
      <div
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}
      >
        <div style={{
          width: 30, height: 30,
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: '#fff',
          boxShadow: '0 0 16px rgba(124,34,240,0.5)',
          animation: 'hexGlow 3s ease-in-out infinite',
        }}>⬡</div>
        <span style={{
          fontSize: 15, fontWeight: 700, color: 'var(--text-h)',
          fontFamily: 'var(--mono)', letterSpacing: '-0.3px',
        }}>
          HiveCollective
        </span>
      </div>

      {/* Centre nav */}
      <div className="nav-center" style={{ display: 'flex', gap: 2 }}>
        <button onClick={() => navigate('/problems')} style={navLink(isActive('/problems'))}>
          {t('nav.problems')}
        </button>
      </div>

      {/* Right auth — desktop */}
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isLoggedIn ? (
          <>
            <NotificationBell />
            <span style={{
              fontSize: 12, color: 'var(--accent)', fontWeight: 600,
              padding: '4px 10px',
              background: 'var(--accent-bg)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--accent-border)',
              fontFamily: 'var(--mono)',
            }}>
              @{user.username}
            </span>
            <button onClick={() => navigate('/problems/new')} style={primaryBtn}>
              {t('nav.postProblem')}
            </button>
            <button onClick={handleLogout} style={ghostBtn}>
              {t('nav.logOut')}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('/login')} style={ghostBtn}>
              {t('nav.signIn')}
            </button>
            <button onClick={() => navigate('/register')} style={primaryBtn}>
              {t('nav.join')}
            </button>
          </>
        )}
      </div>

      {/* Mobile auth */}
      <div className="show-mobile" style={{ alignItems: 'center', gap: 6 }}>
        {isLoggedIn ? (
          <>
            <NotificationBell />
            <button onClick={() => navigate('/problems/new')} style={{ ...primaryBtn, padding: '7px 12px', fontSize: 12 }}>
              + Post
            </button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('/login')} style={{ ...ghostBtn, padding: '7px 12px', fontSize: 12 }}>
              Sign in
            </button>
            <button onClick={() => navigate('/register')} style={{ ...primaryBtn, padding: '7px 12px', fontSize: 12 }}>
              Join
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
