import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import API from '../config';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid rgba(168,85,247,0.15)',
      borderRadius: 'var(--radius-md)', padding: '16px 18px', backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--text-h)', marginBottom: 2, fontFamily: 'var(--mono)', letterSpacing: '-1px' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const REPORT_STATUS = {
  pending:   { background: 'var(--honey-bg)',   color: 'var(--honey)',   border: '1px solid var(--honey-border)' },
  reviewed:  { background: 'var(--emerald-bg)', color: 'var(--emerald)', border: '1px solid var(--emerald-border)' },
  dismissed: { background: 'var(--code-bg)',    color: 'var(--text)',    border: '1px solid var(--border)' },
};

export default function AdminPage() {
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [problems, setProblems] = useState([]);
  const [reportFilter, setReportFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => { if (!isLoggedIn) return; loadStats(); }, [isLoggedIn]);
  useEffect(() => {
    if (tab === 'reports') loadReports();
    if (tab === 'users')   loadUsers();
    if (tab === 'posts')   loadProblems();
  }, [tab, reportFilter]);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/stats`, { headers });
      if (res.status === 403) { setError(t('admin.accessDenied')); setLoading(false); return; }
      const data = await res.json();
      setStats(data.stats);
    } catch { setError(t('admin.loadError')); }
    finally { setLoading(false); }
  }

  async function loadReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/reports?status=${reportFilter}`, { headers });
      const data = await res.json();
      setReports(data.reports || []);
    } catch {}
    finally { setLoading(false); }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/users`, { headers });
      const data = await res.json();
      setUsers(data.users || []);
    } catch {}
    finally { setLoading(false); }
  }

  async function loadProblems() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/problems`, { headers });
      const data = await res.json();
      setProblems(data.problems || []);
    } catch {}
    finally { setLoading(false); }
  }

  async function toggleHide(problemId, currentlyHidden) {
    const res = await fetch(`${API}/admin/problems/${problemId}/hide`, { method: 'PATCH', headers });
    const data = await res.json();
    if (res.ok) {
      setProblems(p => p.map(x => x.id === problemId ? { ...x, is_hidden: data.problem.is_hidden } : x));
    }
  }

  async function updateReportStatus(reportId, status) {
    await fetch(`${API}/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setReports(r => r.map(x => x.id === reportId ? { ...x, status } : x));
  }

  async function toggleAdmin(userId, currentIsAdmin) {
    const action = currentIsAdmin ? 'revoke admin from' : 'promote to admin';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    const res = await fetch(`${API}/admin/users/${userId}/promote`, { method: 'PATCH', headers });
    const data = await res.json();
    if (res.ok) setUsers(u => u.map(x => x.id === userId ? { ...x, is_admin: data.user.is_admin } : x));
  }

  async function toggleVerifiedOrg(userId) {
    const res = await fetch(`${API}/admin/users/${userId}/verify`, { method: 'PATCH', headers });
    const data = await res.json();
    if (res.ok) setUsers(u => u.map(x => x.id === userId ? { ...x, is_verified_org: data.user.is_verified_org } : x));
  }

  async function deleteContent(type, id, reportId) {
    if (!window.confirm(`Delete this ${type}? This cannot be undone.`)) return;
    await fetch(`${API}/admin/${type}s/${id}`, { method: 'DELETE', headers });
    if (reportId) await updateReportStatus(reportId, 'reviewed');
    setReports(r => r.filter(x => x.id !== reportId));
  }

  if (!isLoggedIn) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text)' }}>
      <p style={{ fontSize: 15 }}>{t('admin.signInRequired')}</p>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-md)', padding: '14px 20px', display: 'inline-block', color: '#f87171', fontSize: 14 }}>{error}</div>
    </div>
  );

  const TABS = [
    { key: 'stats',   label: t('admin.tabStats') },
    { key: 'reports', label: t('admin.tabReports') },
    { key: 'users',   label: t('admin.tabUsers') },
    { key: 'posts',   label: 'Posts' },
  ];

  const REPORT_FILTERS = [
    { key: 'pending',   label: t('admin.filterPending') },
    { key: 'reviewed',  label: t('admin.filterReviewed') },
    { key: 'dismissed', label: t('admin.filterDismissed') },
    { key: 'all',       label: t('admin.filterAll') },
  ];

  const ghostBtn = {
    background: 'var(--subtle-bg)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-h)', boxShadow: 'none', padding: '6px 14px', fontSize: 12,
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: 'var(--heading)', color: 'var(--text-h)', letterSpacing: '-0.4px', borderLeft: '3px solid var(--honey)', paddingLeft: 12 }}>{t('admin.title')}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, paddingLeft: 15 }}>{t('admin.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(168,85,247,0.15)', marginBottom: 28, gap: 0 }}>
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: 'transparent', border: 'none',
            borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
            color: tab === key ? 'var(--accent)' : 'var(--text)',
            fontSize: 13, fontWeight: tab === key ? 600 : 400,
            padding: '10px 20px', cursor: 'pointer', marginBottom: -1,
            boxShadow: 'none', transform: 'none',
          }}>
            {label}
            {key === 'reports' && stats?.pending_reports > 0 && (
              <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                {stats.pending_reports}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 60, background: 'var(--subtle-bg)', borderRadius: 'var(--radius-md)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)', animation: 'shimmer 1.5s infinite' }} />
            </div>
          ))}
        </div>
      )}

      {/* Stats tab */}
      {!loading && tab === 'stats' && stats && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14, fontFamily: 'var(--mono)' }}>{t('admin.overview')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
            <StatCard label={t('admin.totalUsers')}     value={stats.total_users}     sub={t('admin.thisWeek', { count: stats.new_users_7d })}     color="var(--accent)" />
            <StatCard label={t('admin.totalProblems')}  value={stats.total_problems}  sub={t('admin.thisWeek', { count: stats.new_problems_7d })}  color="var(--accent-2)" />
            <StatCard label={t('admin.totalSolutions')} value={stats.total_solutions} sub={t('admin.thisWeek', { count: stats.new_solutions_7d })} color="var(--emerald)" />
            <StatCard label={t('admin.totalVotes')}     value={stats.total_votes}     color="var(--honey)" />
            <StatCard label={t('admin.groups')}         value={stats.total_groups} />
            <StatCard label={t('admin.comments')}       value={stats.total_comments} />
            <StatCard label={t('admin.bookmarks')}      value={stats.total_bookmarks} />
            <StatCard label={t('admin.pendingReports')} value={stats.pending_reports} color={stats.pending_reports > 0 ? '#f87171' : undefined} />
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14, fontFamily: 'var(--mono)' }}>{t('admin.statusBreakdown')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 500 }}>
            <StatCard label={t('admin.statusOpen')}       value={stats.open_problems}       color="var(--emerald)" />
            <StatCard label={t('admin.statusInProgress')} value={stats.inprogress_problems} color="var(--honey)" />
            <StatCard label={t('admin.statusResolved')}   value={stats.resolved_problems}   color="var(--accent)" />
          </div>
        </div>
      )}

      {/* Reports tab */}
      {!loading && tab === 'reports' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {REPORT_FILTERS.map(({ key, label }) => (
              <button key={key} onClick={() => setReportFilter(key)} style={{
                padding: '6px 14px', fontSize: 12, borderRadius: 20, cursor: 'pointer', boxShadow: 'none', transform: 'none',
                border: `1px solid ${reportFilter === key ? 'var(--accent-border)' : 'var(--border)'}`,
                background: reportFilter === key ? 'var(--accent-bg)' : 'transparent',
                color: reportFilter === key ? 'var(--accent)' : 'var(--text)',
                fontWeight: reportFilter === key ? 600 : 400,
              }}>
                {label}
              </button>
            ))}
          </div>

          {reports.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              {t('admin.noReports', { status: reportFilter })}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.map(r => {
              const sc = REPORT_STATUS[r.status] || REPORT_STATUS.pending;
              return (
                <div key={r.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 18px', backdropFilter: 'blur(8px)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'var(--text-h)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {r.type}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#f87171' }}>{r.reason.replace('_', ' ')}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, ...sc }}>{r.status}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--mono)' }}>{timeAgo(r.created_at)}</span>
                  </div>

                  {r.content_preview && (
                    <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.5, background: 'var(--subtle-bg)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      {r.content_preview}{r.content_preview?.length >= 120 ? '…' : ''}
                    </p>
                  )}

                  {r.notes && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px', fontStyle: 'italic' }}>
                      Note: "{r.notes}"
                    </p>
                  )}

                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    {t('admin.reportedBy')} <strong style={{ color: 'var(--text-h)' }}>{r.reporter}</strong>
                    {r.problem_id && (
                      <> · <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navigate(`/problems/${r.problem_id}`)}>{t('admin.viewProblem')}</span></>
                    )}
                  </div>

                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => updateReportStatus(r.id, 'dismissed')} style={{ ...ghostBtn }}>
                        {t('admin.dismiss')}
                      </button>
                      <button onClick={() => updateReportStatus(r.id, 'reviewed')} style={{ ...ghostBtn, borderColor: 'var(--emerald-border)', color: 'var(--emerald)' }}>
                        {t('admin.markReviewed')}
                      </button>
                      <button onClick={() => deleteContent(r.type, r.reference_id, r.id)} style={{ ...ghostBtn, borderColor: 'rgba(248,113,113,0.4)', color: '#f87171' }}>
                        {t('admin.deleteContent', { type: r.type })}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Posts tab */}
      {!loading && tab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
            {problems.filter(p => p.is_hidden).length} hidden · {problems.filter(p => !p.is_hidden).length} visible
          </p>
          {problems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>No problems found.</div>
          )}
          {problems.map(p => (
            <div key={p.id} style={{
              background: p.is_hidden ? 'rgba(185,28,28,0.06)' : 'var(--card-bg)',
              border: `1px solid ${p.is_hidden ? 'rgba(248,113,113,0.25)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)', padding: '13px 16px',
              display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(8px)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  {p.is_hidden && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Hidden
                    </span>
                  )}
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onClick={() => navigate(`/problems/${p.id}`)}
                  >
                    {p.title}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                  by {p.posted_by} · {p.location_tag} · {p.solution_count} solution{p.solution_count !== '1' ? 's' : ''} · {timeAgo(p.created_at)}
                </div>
              </div>
              <button
                onClick={() => toggleHide(p.id, p.is_hidden)}
                style={{
                  fontSize: 12, padding: '5px 14px', borderRadius: 20, boxShadow: 'none', transform: 'none', flexShrink: 0,
                  background: p.is_hidden ? 'var(--emerald-bg)' : 'rgba(248,113,113,0.1)',
                  border: `1px solid ${p.is_hidden ? 'var(--emerald-border)' : 'rgba(248,113,113,0.3)'}`,
                  color: p.is_hidden ? 'var(--emerald)' : '#f87171',
                  fontWeight: 600,
                }}
              >
                {p.is_hidden ? '👁 Unhide' : '🚫 Hide'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Users tab */}
      {!loading && tab === 'users' && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 60px 60px 90px 90px', padding: '10px 16px', background: 'rgba(168,85,247,0.06)', borderBottom: '1px solid rgba(168,85,247,0.12)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: 'var(--mono)' }}>
            <span>{t('admin.colUser')}</span>
            <span>{t('admin.colEmail')}</span>
            <span style={{ textAlign: 'right' }}>{t('admin.colProblems')}</span>
            <span style={{ textAlign: 'right' }}>{t('admin.colSolutions')}</span>
            <span style={{ textAlign: 'right' }}>{t('admin.colRole')}</span>
            <span style={{ textAlign: 'right' }}>Verified Org</span>
          </div>
          {users.map(u => (
            <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 60px 60px 90px 90px', padding: '11px 16px', borderBottom: '1px solid var(--subtle-bg)', fontSize: 13, alignItems: 'center', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navigate(`/profile/${u.username}`)}>
                {u.username}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span>
              <span style={{ textAlign: 'right', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{u.problems_count}</span>
              <span style={{ textAlign: 'right', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{u.solutions_count}</span>
              <span style={{ textAlign: 'right' }}>
                <button
                  onClick={() => toggleAdmin(u.id, u.is_admin)}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', boxShadow: 'none', transform: 'none',
                    background: u.is_admin ? 'var(--honey-bg)' : 'transparent',
                    border: `1px solid ${u.is_admin ? 'var(--honey-border)' : 'var(--border)'}`,
                    color: u.is_admin ? 'var(--honey)' : 'var(--text-muted)',
                    fontWeight: u.is_admin ? 600 : 400,
                  }}
                >
                  {u.is_admin ? t('admin.roleAdmin') : t('admin.roleMember')}
                </button>
              </span>
              <span style={{ textAlign: 'right' }}>
                <button
                  onClick={() => toggleVerifiedOrg(u.id)}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', boxShadow: 'none', transform: 'none',
                    background: u.is_verified_org ? 'var(--accent-bg)' : 'transparent',
                    border: `1px solid ${u.is_verified_org ? 'var(--accent-border)' : 'var(--border)'}`,
                    color: u.is_verified_org ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: u.is_verified_org ? 600 : 400,
                  }}
                >
                  {u.is_verified_org ? '✓ Verified' : 'Verify'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
