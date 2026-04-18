import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getBadge } from '../utils/badges';
import API from '../config';

const LANGUAGE_LABELS = { en: 'English', fr: 'Français', es: 'Español' };

const GROUP_COLORS = [
  '#a78bfa', '#2dd4bf', '#fbbf24', '#f87171',
  '#60a5fa', '#34d399', '#fb923c', '#e879f9',
];

function groupColor(index) {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)       return 'just now';
  if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)   return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatJoinDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function initials(username) {
  return username
    .split(/[_\s-]/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({ value, label, color }) {
  return (
    <div style={{
      background: 'var(--subtle-bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--text-h)', fontFamily: 'var(--mono)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ScopePill({ scope }) {
  const isNational = scope === 'national';
  return (
    <span style={{
      flexShrink: 0,
      borderRadius: 20,
      padding: '2px 8px',
      fontSize: 10,
      fontWeight: 500,
      background: isNational ? 'rgba(139,92,246,0.1)' : 'rgba(45,212,191,0.1)',
      color:      isNational ? '#a78bfa' : '#2dd4bf',
      border:     `0.5px solid ${isNational ? 'rgba(139,92,246,0.25)' : 'rgba(45,212,191,0.25)'}`,
    }}>
      {scope}
    </span>
  );
}

function ScoreDisplay({ score }) {
  const color = score > 0 ? '#2dd4bf' : score < 0 ? '#f87171' : '#555';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      {score > 0 && (
        <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '6px solid #2dd4bf' }} />
      )}
      {score < 0 && (
        <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid #f87171' }} />
      )}
      <span style={{ fontSize: 15, fontWeight: 500, color }}>
        {score > 0 ? `+${score}` : score}
      </span>
    </div>
  );
}

function ImplementedTab({ credits }) {
  if (!credits.length) return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
      No implemented solutions yet
    </div>
  );

  return (
    <div>
      {credits.map((c, i) => (
        <div key={i} style={{
          background: 'var(--field-bg)',
          border: '0.5px solid rgba(45,212,191,0.2)',
          borderRadius: 10,
          padding: '14px 16px',
          marginBottom: 10,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'rgba(45,212,191,0.08)',
            border: '0.5px solid rgba(45,212,191,0.25)',
            borderRadius: 20, padding: '2px 8px',
            fontSize: 10, color: '#2dd4bf', marginBottom: 8,
          }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Implemented
          </div>

          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e0f0', lineHeight: 1.5, marginBottom: 4 }}>
            {c.solution_content.length > 200 ? c.solution_content.slice(0, 200) + '…' : c.solution_content}
          </div>

          <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>
            On:{' '}
            <Link to={`/problems/${c.problem_id}`} style={{ color: '#7c6fc4', textDecoration: 'none' }}>
              {c.problem_title}
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {c.credited_users.map(u => (
              <Link key={u} to={`/profile/${u}`} style={{ textDecoration: 'none' }}>
                <span style={{
                  background: 'rgba(139,92,246,0.08)',
                  border: '0.5px solid rgba(139,92,246,0.2)',
                  borderRadius: 20, padding: '2px 8px',
                  fontSize: 11, color: '#8b7ec8',
                }}>
                  {u}
                </span>
              </Link>
            ))}
          </div>

          <div style={{ fontSize: 10, color: '#444', marginTop: 6 }}>
            Credited by {c.credited_by_username}
            {c.group_name ? ` · ${c.group_name}` : ''}
            {' · '}{timeAgo(c.credited_at)}
          </div>
        </div>
      ))}
    </div>
  );
}

function SolutionsTab({ solutions }) {
  if (!solutions.length) return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
      No solutions proposed yet
    </div>
  );

  return (
    <div>
      {solutions.map(s => (
        <Link key={s.id} to={`/problems/${s.problem_id}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: 'var(--field-bg)',
            border: '0.5px solid var(--subtle-bg-2)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 10,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--subtle-bg-2)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: '#bbb', lineHeight: 1.5, flex: 1 }}>
                {s.content.length > 180 ? s.content.slice(0, 180) + '…' : s.content}
              </div>
              <ScoreDisplay score={s.score} />
            </div>
            {s.is_implemented && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(45,212,191,0.08)',
                border: '0.5px solid rgba(45,212,191,0.2)',
                borderRadius: 20, padding: '1px 7px',
                fontSize: 10, color: '#2dd4bf', marginBottom: 4,
              }}>
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Implemented
              </span>
            )}
            <div style={{ fontSize: 11, color: '#444' }}>
              On: <span style={{ color: '#666' }}>{s.problem_title}</span>
              {' · '}{timeAgo(s.created_at)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ProblemsTab({ problems }) {
  if (!problems.length) return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
      No problems posted yet
    </div>
  );

  return (
    <div>
      {problems.map(p => (
        <Link key={p.id} to={`/problems/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{
            background: 'var(--field-bg)',
            border: '0.5px solid var(--subtle-bg-2)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 10,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--subtle-bg-2)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e0f0', lineHeight: 1.4, flex: 1 }}>
                {p.title}
              </div>
              <ScopePill scope={p.scope} />
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5, marginBottom: 8 }}>
              {p.description.length > 120 ? p.description.slice(0, 120) + '…' : p.description}
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#444' }}>
              <span>{p.location_tag}</span>
              <span>{p.solution_count} solution{p.solution_count !== 1 ? 's' : ''}</span>
              <span>{p.group_count} group{p.group_count !== 1 ? 's' : ''}</span>
              <span>{timeAgo(p.created_at)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, ready } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState('implemented');

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/profile/${username}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'User not found' : 'Failed to load profile');
        return res.json();
      })
      .then(data => { setProfile(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [username]);

  // ── Skeleton loader ──────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
      {[1, 2].map(i => (
        <div key={i} style={{ background: 'var(--card-bg)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 'var(--radius-lg)', padding: 20, height: i === 1 ? 400 : 300, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, var(--subtle-bg), transparent)', animation: 'shimmer 1.5s infinite' }} />
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 48, marginBottom: 16, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>404</div>
      <div style={{ fontSize: 16, color: 'var(--text)', marginBottom: 24 }}>{error}</div>
      <button onClick={() => navigate('/problems')}>Browse problems</button>
    </div>
  );

  const { user, stats, implemented_credits, solutions, problems, groups } = profile;

  const tabs = [
    { key: 'implemented', label: `Implemented (${stats.implemented_count})` },
    { key: 'solutions',   label: `Solutions (${stats.solutions_count})` },
    { key: 'problems',    label: `Problems (${stats.problems_count})` },
  ];

  // ── Full render ──────────────────────────────────────────────────────────
  return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Sidebar ── */}
        <div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 'var(--radius-lg)', padding: 20, backdropFilter: 'blur(12px)' }}>

            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(139,92,246,0.15)',
              border: '1.5px solid rgba(139,92,246,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 500, color: '#a78bfa',
              margin: '0 auto 12px',
            }}>
              {initials(user.username)}
            </div>

            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-h)', textAlign: 'center', fontFamily: 'var(--heading)' }}>{user.username}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 2, fontFamily: 'var(--mono)' }}>@{user.username}</div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
              {(() => {
                const badge = getBadge(stats.total_score, stats.implemented_count, stats.solutions_count);
                return badge ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: badge.bg, border: `0.5px solid ${badge.border}`,
                    borderRadius: 20, padding: '3px 10px', fontSize: 11, color: badge.color,
                    fontWeight: 500,
                  }}>
                    {badge.label}
                  </span>
                ) : null;
              })()}
              {user.is_verified_org && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'rgba(29,78,216,0.1)', border: '0.5px solid rgba(29,78,216,0.3)',
                  borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#60a5fa',
                  fontWeight: 500,
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.5" fill="#1d4ed8"/>
                    <path d="M3.5 6l2 2 3-3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Verified Org
                </span>
              )}
              {user.is_admin && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'rgba(251,191,36,0.1)', border: '0.5px solid rgba(251,191,36,0.3)',
                  borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#fbbf24',
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" stroke="#fbbf24" strokeWidth="1" strokeLinejoin="round" fill="#fbbf24"/>
                  </svg>
                  Admin
                </span>
              )}
              {user.is_moderator && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'rgba(251,191,36,0.1)', border: '0.5px solid rgba(251,191,36,0.3)',
                  borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#fbbf24',
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4z" stroke="#fbbf24" strokeWidth="1" strokeLinejoin="round"/>
                  </svg>
                  Moderator
                </span>
              )}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(139,92,246,0.1)', border: '0.5px solid rgba(139,92,246,0.25)',
                borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#a78bfa',
              }}>
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="#a78bfa" strokeWidth="1"/>
                  <path d="M6 1v10M1 6h10" stroke="#a78bfa" strokeWidth="0.8"/>
                </svg>
                {LANGUAGE_LABELS[user.preferred_language] || user.preferred_language}
              </span>
            </div>

            {/* Edit button — own profile only */}
            {isOwnProfile && (
              <button
                onClick={() => navigate('/settings')}
                style={{
                  background: 'transparent', border: '0.5px solid rgba(139,92,246,0.3)',
                  color: '#8b7ec8', borderRadius: 8, padding: '6px 14px',
                  fontSize: 12, cursor: 'pointer', width: '100%', marginTop: 12,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Edit profile
              </button>
            )}

            <div style={{ border: 'none', borderTop: '0.5px solid var(--subtle-bg-2)', margin: '16px 0' }} />

            {/* Member since */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', background: 'var(--field-bg)',
              border: '0.5px solid var(--subtle-bg-2)', borderRadius: 8,
            }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="#555" strokeWidth="0.8"/>
                <path d="M1 5h10M4 1v2M8 1v2" stroke="#555" strokeWidth="0.8" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 12, color: '#555', flex: 1 }}>Member since</span>
              <span style={{ fontSize: 12, color: '#888' }}>{formatJoinDate(user.created_at)}</span>
            </div>

            <div style={{ border: 'none', borderTop: '0.5px solid var(--subtle-bg-2)', margin: '16px 0' }} />

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <StatBox value={stats.problems_count}    label="Problems posted"    color="#a78bfa" />
              <StatBox value={stats.solutions_count}   label="Solutions proposed" />
              <StatBox value={stats.implemented_count} label="Implemented"        color="#2dd4bf" />
              <StatBox value={stats.total_score}       label="Total score"        color="#fbbf24" />
            </div>

            {/* Groups */}
            {groups.length > 0 && (
              <>
                <div style={{ border: 'none', borderTop: '0.5px solid var(--subtle-bg-2)', margin: '16px 0' }} />
                <div style={{ fontSize: 11, fontWeight: 500, color: '#555', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
                  Groups
                </div>
                {groups.map((g, i) => (
                  <Link key={g.id} to={`/groups/${g.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 8,
                      background: 'var(--field-bg)', border: '0.5px solid var(--subtle-bg-2)',
                      marginBottom: 6, cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--subtle-bg-2)'}
                    >
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: groupColor(i), flexShrink: 0 }} />
                      <div style={{ fontSize: 12, color: '#aaa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.name}
                      </div>
                      {g.role === 'moderator'
                        ? <span style={{ fontSize: 10, color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '0.5px solid rgba(251,191,36,0.2)', borderRadius: 20, padding: '1px 7px' }}>mod</span>
                        : <span style={{ fontSize: 11, color: '#555' }}>{g.member_count}</span>
                      }
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── Main column ── */}
        <div>
          <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 'var(--radius-lg)', padding: '20px 20px 0', backdropFilter: 'blur(12px)' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(168,85,247,0.15)', marginBottom: 20 }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    background: 'transparent', border: 'none', boxShadow: 'none', transform: 'none',
                    borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent)' : 'transparent'}`,
                    color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                    padding: '8px 16px', cursor: 'pointer', marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ paddingBottom: 20 }}>
              {activeTab === 'implemented' && <ImplementedTab  credits={implemented_credits} />}
              {activeTab === 'solutions'   && <SolutionsTab    solutions={solutions} />}
              {activeTab === 'problems'    && <ProblemsTab     problems={problems} />}
            </div>
          </div>
        </div>

      </div>
  );
}
