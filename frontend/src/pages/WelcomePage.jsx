import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  {
    icon: '⬡',
    title: 'Post a problem',
    desc: 'Share a challenge affecting your community. Be specific — the more detail you give, the better solutions you get.',
    action: '/post-problem',
    label: 'Post a problem →',
    color: 'var(--accent)',
    glow: 'rgba(168,85,247,0.25)',
  },
  {
    icon: '◎',
    title: 'Browse problems',
    desc: 'Explore problems posted by others. Vote on solutions, propose your own, and join the conversation.',
    action: '/problems',
    label: 'Browse problems →',
    color: 'var(--accent-2)',
    glow: 'rgba(107,158,255,0.25)',
  },
  {
    icon: '⬡',
    title: 'Join a group',
    desc: 'Find groups organising around problems that matter to you. Coordinate action with others.',
    action: '/problems',
    label: 'Find a group →',
    color: 'var(--emerald)',
    glow: 'rgba(52,211,153,0.25)',
  },
];

export default function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user]);

  function handleAction(path) {
    localStorage.setItem('hc_welcomed', 'true');
    navigate(path);
  }

  function handleSkip() {
    localStorage.setItem('hc_welcomed', 'true');
    navigate('/problems');
  }

  return (
    <div style={{
      minHeight: 'calc(100svh - 56px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', top: '5%', right: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,34,240,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '5%', left: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48, animation: 'fadeUp 0.4s ease both' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⬡</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--heading)', letterSpacing: '-1px', color: 'var(--text-h)', margin: '0 0 12px' }}>
          Welcome, {user?.username}!
        </h1>
        <p style={{ color: 'var(--text)', fontSize: 16, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          HiveCollective is where collective minds build real solutions. Here's how to get started:
        </p>
      </div>

      {/* Step cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 20, width: '100%', maxWidth: 820,
        marginBottom: 40,
      }}>
        {STEPS.map((step, i) => (
          <div
            key={i}
            onClick={() => handleAction(step.action)}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 24px',
              cursor: 'pointer',
              transition: 'transform 0.17s ease, box-shadow 0.17s ease, border-color 0.17s ease',
              animation: `fadeUp 0.4s ease ${i * 0.1 + 0.15}s both`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 12px 32px ${step.glow}`;
              e.currentTarget.style.borderColor = step.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${step.glow}`,
              border: `1px solid ${step.color}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, color: step.color, marginBottom: 16,
            }}>
              {step.icon}
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-h)', margin: '0 0 8px', fontFamily: 'var(--heading)' }}>
              {step.title}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 20px' }}>
              {step.desc}
            </p>
            <span style={{ fontSize: 13, fontWeight: 600, color: step.color }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Skip */}
      <button
        onClick={handleSkip}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          boxShadow: 'none',
          fontSize: 13,
          animation: 'fadeUp 0.4s ease 0.5s both',
        }}
      >
        Skip for now
      </button>
    </div>
  );
}
