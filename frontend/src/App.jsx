import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import Navbar from './components/Navbar';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProblemsPage from './pages/ProblemsPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import PostProblemPage from './pages/PostProblemPage';
import PostSolutionPage from './pages/PostSolutionPage';
import GroupPage from './pages/GroupPage';
import CreateGroupPage from './pages/CreateGroupPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BookmarksPage from './pages/BookmarksPage';
import MapPage from './pages/MapPage';
import AdminPage from './pages/AdminPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import MessagesPage from './pages/MessagesPage';
import WelcomePage from './pages/WelcomePage';
import FeedPage from './pages/FeedPage';
import { useTranslation } from 'react-i18next';
import { useAuth } from './context/AuthContext';
import API from './config';

// ── Animated hex canvas background ───────────────────
function HexCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, hexes = [], W, H;
    function buildHexes() {
      hexes = [];
      const R = 22, cW = R * Math.sqrt(3), rH = R * 1.5;
      const cols = Math.ceil(W / cW) + 2, rows = Math.ceil(H / rH) + 2;
      for (let r = -1; r < rows; r++)
        for (let c = -1; c < cols; c++)
          hexes.push({ x: c * cW + (r % 2 === 1 ? cW / 2 : 0), y: r * rH, R, phase: Math.random() * Math.PI * 2 });
    }
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
      buildHexes();
    }
    function hexPath(x, y, R) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0 ? ctx.moveTo(x + R * Math.cos(a), y + R * Math.sin(a))
                : ctx.lineTo(x + R * Math.cos(a), y + R * Math.sin(a));
      }
      ctx.closePath();
    }
    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H); t += 0.007;
      hexes.forEach(h => {
        const pulse = (Math.sin(t + h.phase) + 1) / 2;
        hexPath(h.x, h.y, h.R - 1);
        ctx.strokeStyle = `rgba(168,85,247,${0.08 + pulse * 0.14})`;
        ctx.lineWidth = 1; ctx.stroke();
      });
      animId = requestAnimationFrame(draw);
    }
    resize(); window.addEventListener('resize', resize); draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return (
    <canvas ref={canvasRef} aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
  );
}

// ── Live ticker ───────────────────────────────────────
const TICKER_ITEMS = [
  { label: 'NEW PROBLEM', text: 'Illegal mining contaminating groundwater' },
  { label: 'SOLVED', text: 'Community waste management system' },
  { label: 'GROUP FORMED', text: 'Urban housing initiative' },
  { label: 'NEW SOLVER', text: 'Community member joined the hive' },
  { label: 'BREAKTHROUGH', text: 'Solar microgrid for rural villages' },
  { label: 'NEW PROBLEM', text: 'Road infrastructure in local areas' },
  { label: 'SOLVED', text: 'Clean water access for rural communities' },
  { label: 'GROUP FORMED', text: 'Youth employment task force' },
];
function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 34,
      borderTop: '1px solid rgba(124,34,240,0.15)', background: 'var(--navbar-bg)',
      display: 'flex', alignItems: 'center', overflow: 'hidden', zIndex: 10,
    }}>
      <div style={{
        padding: '0 14px', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600,
        color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase',
        borderRight: '1px solid rgba(124,34,240,0.2)', whiteSpace: 'nowrap',
        height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0,
      }}>● LIVE</div>
      <div style={{
        display: 'flex', gap: 48, alignItems: 'center', padding: '0 24px',
        whiteSpace: 'nowrap', animation: 'tickerScroll 28s linear infinite',
      }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#6a6080', letterSpacing: 0.5 }}>
            {item.label}{' '}<span style={{ color: 'var(--emerald)' }}>{item.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Animated stat cards ───────────────────────────────
const STATS = [
  { label: 'Open problems',  value: 240,  suffix: '+', color: 'var(--accent)',   bg: 'var(--accent-bg)',   border: 'var(--accent-border)',   glow: 'rgba(124,34,240,0.22)'  },
  { label: 'Active solvers', value: 1200, suffix: '',  color: 'var(--honey)',    bg: 'var(--honey-bg)',    border: 'var(--honey-border)',    glow: 'rgba(245,158,11,0.18)'  },
  { label: 'Groups formed',  value: 89,   suffix: '',  color: 'var(--emerald)', bg: 'var(--emerald-bg)', border: 'var(--emerald-border)', glow: 'rgba(16,185,129,0.18)'  },
];
function StatCards() {
  const refs = useRef([]);
  useEffect(() => {
    STATS.forEach((stat, i) => {
      const el = refs.current[i];
      if (!el) return;
      const start = performance.now(), duration = 1200 + i * 200;
      function step(now) {
        const p = Math.min((now - start) / duration, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * stat.value) + stat.suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      setTimeout(() => requestAnimationFrame(step), 500);
    });
  }, []);
  return (
    <div className="stat-row" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
      {STATS.map((stat, i) => (
        <div key={stat.label} className="stat-card" style={{
          textAlign: 'center', padding: '16px 28px',
          background: stat.bg, border: `1px solid ${stat.border}`,
          borderRadius: 'var(--radius-lg)', minWidth: 110,
          transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${stat.glow}`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
          <div ref={el => refs.current[i] = el} style={{
            fontSize: 28, fontWeight: 800, fontFamily: 'var(--mono)',
            color: stat.color, letterSpacing: '-1px', lineHeight: 1.1,
          }}>0</div>
          <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 5, fontWeight: 500 }}>{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100svh - 56px)',
      padding: '60px 20px 94px', textAlign: 'center',
    }}>
      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,34,240,0.16) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', animation: 'orbPulse 7s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '5%', right: '-3%', width: 380, height: 380, background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', animation: 'orbPulse 7s ease-in-out 2s infinite' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: 360, height: 260, transform: 'translate(-50%,-50%)', background: 'radial-gradient(ellipse, rgba(16,185,129,0.09) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orbPulse 7s ease-in-out 4s infinite' }} />

      {/* Scan lines */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)' }} />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 660, width: '100%' }}>

        {/* Live badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 14px', borderRadius: 100,
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          fontSize: 11, fontWeight: 600, letterSpacing: '1.2px',
          textTransform: 'uppercase', color: 'var(--accent)',
          marginBottom: 28, animation: 'fadeUp 0.5s ease both',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'blink 1.5s ease-in-out infinite' }} />
          Collective Intelligence Platform
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 5.5vw, 64px)',
          fontWeight: 800, letterSpacing: '-2.5px', lineHeight: 1.04,
          margin: '0 0 22px',
          background: 'linear-gradient(130deg, var(--accent) 0%, var(--accent-2) 48%, var(--emerald) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', animation: 'fadeUp 0.5s ease 0.1s both',
        }}>
          {t('home.headline').split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </h1>

        <p style={{ fontSize: 18, color: 'var(--text)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto 40px', animation: 'fadeUp 0.5s ease 0.2s both' }}>
          {t('home.subheading')}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56, animation: 'fadeUp 0.5s ease 0.3s both' }}>
          <button onClick={() => navigate('/problems')} style={{ padding: '13px 30px', fontSize: 15, fontWeight: 600 }}>
            {t('home.browseProblems')}
          </button>
          {!isLoggedIn && (
            <button onClick={() => navigate('/register')} style={{ padding: '13px 30px', fontSize: 15, fontWeight: 500, background: 'transparent', color: 'var(--text-h)', border: '1px solid var(--border)', boxShadow: 'none' }}>
              {t('home.joinTheHive')}
            </button>
          )}
        </div>

        <div style={{ animation: 'fadeUp 0.5s ease 0.4s both' }}>
          <StatCards />
        </div>
      </div>

      <Ticker />
    </div>
  );
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!user?.is_admin) navigate('/problems', { replace: true }); }, [user]);
  return user?.is_admin ? children : null;
}

function UnverifiedBanner() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.email_verified !== false || dismissed) return null;

  async function resend() {
    setResending(true);
    try {
      await fetch(`${API}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setResent(true);
    } catch { /* silent */ }
    finally { setResending(false); }
  }

  return (
    <div style={{
      background: 'rgba(124,58,237,0.12)',
      borderBottom: '1px solid rgba(139,92,246,0.2)',
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 16, flexWrap: 'wrap', fontSize: 13,
    }}>
      <span style={{ color: 'var(--text-muted)' }}>
        📧 Please verify your email address to unlock all features.
      </span>
      {resent ? (
        <span style={{ color: '#2dd4bf', fontSize: 12 }}>Email sent!</span>
      ) : (
        <button
          onClick={resend}
          disabled={resending}
          style={{ fontSize: 12, padding: '4px 12px', background: 'rgba(139,92,246,0.15)', border: '0.5px solid rgba(139,92,246,0.35)', borderRadius: 6, color: '#a78bfa', cursor: 'pointer' }}
        >
          {resending ? 'Sending…' : 'Resend link'}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        style={{ fontSize: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1, padding: 0 }}
        title="Dismiss"
      >×</button>
    </div>
  );
}

function Layout({ children }) {
  return (
    <>
      {/* Fixed canvas layer — sits above body bg but below all content */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <HexCanvas />
      </div>
      {/* Content layer */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>
        <Navbar />
        <UnverifiedBanner />
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"                              element={<HomePage />} />
          <Route path="/register"                      element={<RegisterPage />} />
          <Route path="/login"                         element={<LoginPage />} />
          <Route path="/problems"                      element={<ProblemsPage />} />
          <Route path="/problems/new"                  element={<PostProblemPage />} />
          <Route path="/problems/:id"                  element={<ProblemDetailPage />} />
          <Route path="/problems/:id/solutions/new"    element={<PostSolutionPage />} />
          <Route path="/groups/:id" element={<GroupPage />} />
          <Route path="/problems/:id/groups/new" element={<CreateGroupPage />} />
          <Route path="/leaderboard" element={<AdminRoute><LeaderboardPage /></AdminRoute>} />
          <Route path="/bookmarks"   element={<BookmarksPage />} />
          <Route path="/map"         element={<MapPage />} />
          <Route path="/admin"            element={<AdminPage />} />
          <Route path="/settings"         element={<SettingsPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/welcome"           element={<WelcomePage />} />
          <Route path="/feed"              element={<FeedPage />} />
          <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"   element={<ResetPasswordPage />} />
          <Route path="/verify-email"     element={<VerifyEmailPage />} />
          <Route path="/auth/callback"    element={<AuthCallbackPage />} />
          <Route path="/messages"         element={<MessagesPage />} />
          <Route path="/messages/:username" element={<MessagesPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;