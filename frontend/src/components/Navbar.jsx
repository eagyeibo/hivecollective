import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell';
import API from '../config';

function MessagesBadge() {
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetch_ = () =>
      fetch(`${API}/messages/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setUnread(d.count || 0)).catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 30000);
    return () => clearInterval(id);
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (location.pathname.startsWith('/messages')) setUnread(0);
  }, [location.pathname]);

  const active = location.pathname.startsWith('/messages');
  return (
    <button
      onClick={() => navigate('/messages')}
      title="Messages"
      style={{
        background: active ? 'var(--accent-bg)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent-border)' : 'transparent'}`,
        color: active ? 'var(--accent)' : 'var(--text)',
        borderRadius: 'var(--radius-md)', padding: '6px 10px',
        fontSize: 14, cursor: 'pointer', boxShadow: 'none',
        lineHeight: 1, position: 'relative',
      }}
    >
      ✉
      {unread > 0 && (
        <span style={{
          position: 'absolute', top: 2, right: 2,
          background: 'var(--accent)', color: '#fff',
          borderRadius: '50%', fontSize: 9, fontWeight: 700,
          width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{unread > 9 ? '9+' : unread}</span>
      )}
    </button>
  );
}

export default function Navbar() {
  const { isLoggedIn, user, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  function handleLogout() { logout(); navigate('/'); }
  function isActive(path) { return location.pathname.startsWith(path); }

  const ghostBtn = {
    background: 'var(--subtle-bg)',
    border: '1px solid var(--subtle-border-md)',
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

  const iconBtn = (active, activeColor = 'var(--accent)', activeBg = 'var(--accent-bg)') => ({
    background: active ? activeBg : 'transparent',
    border: `1px solid ${active ? 'var(--accent-border)' : 'transparent'}`,
    color: active ? activeColor : 'var(--text)',
    borderRadius: 'var(--radius-md)',
    padding: '6px 10px',
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: 'none',
    lineHeight: 1,
  });

  return (
    <nav style={{
      background: 'var(--navbar-bg)',
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

      {/* Centre nav — desktop */}
      <div className="nav-center" style={{ display: 'flex', gap: 2 }}>
        <button onClick={() => navigate('/problems')} style={navLink(isActive('/problems'))}>{t('nav.problems')}</button>
        {isLoggedIn && (
          <button onClick={() => navigate('/feed')} style={navLink(isActive('/feed'))}>Feed</button>
        )}
        {user?.is_admin && (
          <button onClick={() => navigate('/leaderboard')} style={navLink(isActive('/leaderboard'))}>{t('nav.leaderboard')}</button>
        )}
        <button onClick={() => navigate('/map')} style={navLink(isActive('/map'))}>{t('nav.map')}</button>
      </div>

      {/* Right — desktop */}
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={toggleTheme}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ ...iconBtn(false), fontSize: 16, padding: '5px 9px' }}
        >
          {dark ? '☀' : '☾'}
        </button>
        {isLoggedIn ? (
          <>
            <NotificationBell />
            <MessagesBadge />
            <button
              onClick={() => navigate('/bookmarks')}
              title="Saved problems"
              style={iconBtn(isActive('/bookmarks'), 'var(--honey)', 'var(--honey-bg)')}
            >☆</button>
            {user?.is_admin && (
              <button
                onClick={() => navigate('/admin')}
                style={{ ...ghostBtn, fontSize: 12, padding: '6px 12px' }}
              >⚙ Admin</button>
            )}
            <button
              onClick={() => navigate('/settings')}
              title="Settings"
              style={iconBtn(isActive('/settings'))}
            >⚙</button>
            <span
              onClick={() => navigate(`/profile/${user.username}`)}
              style={{
                fontSize: 12, color: 'var(--accent)', fontWeight: 600,
                padding: '4px 10px',
                background: 'var(--accent-bg)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--accent-border)',
                fontFamily: 'var(--mono)', cursor: 'pointer',
              }}
            >@{user.username}</span>
            <button onClick={() => navigate('/problems/new')} style={primaryBtn}>
              {t('nav.postProblem')}
            </button>
            <button onClick={handleLogout} style={ghostBtn}>
              {t('nav.logOut')}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => navigate('/login')}    style={ghostBtn}>{t('nav.signIn')}</button>
            <button onClick={() => navigate('/register')} style={primaryBtn}>{t('nav.join')}</button>
          </>
        )}
      </div>

      {/* Right — mobile */}
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
            <button onClick={() => navigate('/login')}    style={{ ...ghostBtn,   padding: '7px 12px', fontSize: 12 }}>Sign in</button>
            <button onClick={() => navigate('/register')} style={{ ...primaryBtn, padding: '7px 12px', fontSize: 12 }}>Join</button>
          </>
        )}
      </div>
    </nav>
  );
}
