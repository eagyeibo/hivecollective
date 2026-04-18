import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBadge } from '../utils/badges';
import API from '../config';

const MEDAL = ['🥇', '🥈', '🥉'];

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 86400)   return 'today';
  if (diff < 604800)  return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function initials(username) {
  return username.split(/[_\s-]/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

const AVATAR_COLORS = ['#7c3aed', '#0891b2', '#059669', '#b45309', '#be185d', '#1d4ed8'];
function avatarColor(username) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/leaderboard`)
      .then(r => r.json())
      .then(data => { setEntries(data.leaderboard || []); setLoading(false); })
      .catch(() => { setError(t('leaderboard.error')); setLoading(false); });
  }, []);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: 'var(--heading)', color: 'var(--text-h)', letterSpacing: '-0.4px', borderLeft: '3px solid var(--honey)', paddingLeft: 12 }}>
          {t('leaderboard.title')}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, paddingLeft: 15 }}>
          {t('leaderboard.subtitle')}
        </p>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 56, background: 'var(--subtle-bg)', borderRadius: 'var(--radius-md)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, var(--subtle-bg), transparent)', animation: 'shimmer 1.5s infinite' }} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13, color: '#f87171' }}>
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text)' }}>
          {t('leaderboard.noContributors')}
        </div>
      )}

      {/* Top 3 podium */}
      {!loading && entries.length >= 3 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 32, justifyContent: 'center' }}>
          {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
            const rank = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2;
            const podiumHeights = [80, 100, 60];
            const podiumColors = [
              'rgba(168,85,247,0.12)',   // silver → accent tint
              'rgba(251,191,36,0.15)',   // gold → honey tint
              'rgba(52,211,153,0.1)',    // bronze → emerald tint
            ];
            const podiumBorders = ['rgba(168,85,247,0.25)', 'rgba(251,191,36,0.35)', 'rgba(52,211,153,0.2)'];
            const color = avatarColor(entry.username);
            return (
              <div
                key={entry.id}
                onClick={() => navigate(`/profile/${entry.username}`)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', paddingTop: rank === 0 ? 0 : 20 }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{MEDAL[rank]}</div>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 600, marginBottom: 8,
                  boxShadow: `0 0 16px ${color}66`,
                }}>
                  {initials(entry.username)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', textAlign: 'center', marginBottom: 2 }}>
                  {entry.username}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: rank === 0 ? 'var(--honey)' : rank === 1 ? 'var(--text-muted)' : 'var(--emerald)', fontFamily: 'var(--mono)' }}>
                  {entry.total_score}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('leaderboard.scoreLabel')}</div>
                <div style={{
                  marginTop: 10, width: '100%',
                  height: podiumHeights[podiumIdx],
                  background: podiumColors[rank],
                  borderRadius: '8px 8px 0 0',
                  border: `1px solid ${podiumBorders[rank]}`,
                  borderBottom: 'none',
                }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid rgba(168,85,247,0.15)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 70px 70px 70px 70px',
          padding: '10px 16px',
          background: 'rgba(168,85,247,0.06)',
          borderBottom: '1px solid rgba(168,85,247,0.12)',
          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.8px',
          fontFamily: 'var(--mono)',
        }}>
          <span>{t('leaderboard.rank')}</span>
          <span>{t('leaderboard.user')}</span>
          <span style={{ textAlign: 'right' }}>{t('leaderboard.score')}</span>
          <span style={{ textAlign: 'right' }}>{t('leaderboard.problems')}</span>
          <span style={{ textAlign: 'right' }}>{t('leaderboard.solutions')}</span>
          <span style={{ textAlign: 'right' }}>{t('leaderboard.credited')}</span>
        </div>

        {entries.map((entry, i) => {
          const color = avatarColor(entry.username);
          const isTop3 = i < 3;
          return (
            <div
              key={entry.id}
              onClick={() => navigate(`/profile/${entry.username}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 70px 70px 70px 70px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--subtle-bg)',
                cursor: 'pointer',
                transition: 'background 0.12s',
                alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: isTop3 ? 16 : 13, color: isTop3 ? 'var(--text-h)' : 'var(--text-muted)', fontWeight: isTop3 ? 600 : 400, fontFamily: 'var(--mono)' }}>
                {isTop3 ? MEDAL[i] : i + 1}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600, flexShrink: 0,
                }}>
                  {initials(entry.username)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>{entry.username}</span>
                    {(() => {
                      const badge = getBadge(entry.total_score, entry.implemented_count, entry.solutions_count);
                      return badge ? (
                        <span style={{
                          fontSize: 10, padding: '1px 7px', borderRadius: 20,
                          background: badge.bg, border: `1px solid ${badge.border}`,
                          color: badge.color, fontWeight: 600,
                        }}>
                          {badge.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('leaderboard.joined')} {timeAgo(entry.created_at)}</div>
                </div>
              </div>

              <span style={{
                fontSize: 14, fontWeight: 700, textAlign: 'right', fontFamily: 'var(--mono)',
                color: entry.total_score > 0 ? 'var(--emerald)' : entry.total_score < 0 ? '#f87171' : 'var(--text-muted)',
              }}>
                {entry.total_score > 0 ? `+${entry.total_score}` : entry.total_score}
              </span>

              <span style={{ fontSize: 13, color: 'var(--text)', textAlign: 'right', fontFamily: 'var(--mono)' }}>{entry.problems_count}</span>
              <span style={{ fontSize: 13, color: 'var(--text)', textAlign: 'right', fontFamily: 'var(--mono)' }}>{entry.solutions_count}</span>
              <span style={{ fontSize: 13, textAlign: 'right', fontFamily: 'var(--mono)', color: entry.implemented_count > 0 ? 'var(--accent-2)' : 'var(--text-dim)', fontWeight: entry.implemented_count > 0 ? 600 : 400 }}>
                {entry.implemented_count > 0 ? `✓ ${entry.implemented_count}` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {entries.length > 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16, fontFamily: 'var(--mono)' }}>
          {t('leaderboard.showing', { count: entries.length })}
        </p>
      )}
    </div>
  );
}
