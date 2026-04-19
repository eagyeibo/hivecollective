import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import SolutionCard from '../components/SolutionCard';
import ShareBar from '../components/ShareBar';
import ReportModal from '../components/ReportModal';
import API from '../config';

const SCOPE_STYLE = {
  national: { background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' },
  local:    { background: 'var(--emerald-bg)', color: 'var(--emerald)', border: '1px solid var(--emerald-border)' },
};

const STATUS_STYLE = {
  open:        { background: 'var(--emerald-bg)', color: 'var(--emerald)', border: '1px solid var(--emerald-border)', label: 'Open' },
  in_progress: { background: 'var(--honey-bg)',   color: 'var(--honey)',   border: '1px solid var(--honey-border)',   label: 'In Progress' },
  resolved:    { background: 'var(--accent-bg)',  color: 'var(--accent)',  border: '1px solid var(--accent-border)',  label: 'Resolved' },
};

export default function ProblemDetailPage() {
  const { id } = useParams();
  const { isLoggedIn, user, token } = useAuth();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState([]);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [reportingProblem, setReportingProblem] = useState(false);
  const [related, setRelated] = useState([]);

  async function toggleBookmark() {
    if (!isLoggedIn) return;
    setBookmarkLoading(true);
    try {
      const method = bookmarked ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/bookmarks/${id}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setBookmarked(b => !b);
    } catch {}
    finally { setBookmarkLoading(false); }
  }

  async function updateStatus(newStatus) {
    setStatusUpdating(true);
    try {
      const res = await fetch(`${API}/problems/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) setProblem(p => ({ ...p, status: data.status }));
    } catch {}
    finally { setStatusUpdating(false); }
  }

  useEffect(() => {
    async function fetchProblem() {
      try {
        const res = await fetch(`${API}/problems/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setProblem(data.problem);
        setSolutions(data.solutions);

        const groupRes = await fetch(`${API}/groups?problem_id=${id}`);
        const groupData = await groupRes.json();
        if (groupRes.ok) setGroups(groupData.groups);

        const relRes = await fetch(`${API}/problems/${id}/related`);
        if (relRes.ok) {
          const relData = await relRes.json();
          setRelated(relData.related || []);
        }

        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          const bmRes = await fetch(`${API}/bookmarks/check/${id}`, {
            headers: { 'Authorization': `Bearer ${storedToken}` },
          });
          const bmData = await bmRes.json();
          if (bmRes.ok) setBookmarked(bmData.bookmarked);
        }
      } catch {
        setError('Could not load this problem.');
      } finally {
        setLoading(false);
      }
    }
    fetchProblem();
  }, [id]);

  if (loading) return (
    <div style={{ padding: '60px 24px', maxWidth: 700, margin: '0 auto' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: i === 1 ? 120 : 60, background: 'var(--subtle-bg)', borderRadius: 'var(--radius-lg)', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, var(--subtle-bg), transparent)', animation: 'shimmer 1.5s infinite' }} />
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div style={{ padding: '40px 24px', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-md)', padding: '14px 18px', fontSize: 13, color: '#f87171' }}>{error}</div>
    </div>
  );

  if (!problem) return null;

  const ogDescription = problem.description.slice(0, 160) + (problem.description.length > 160 ? '…' : '');
  const st = STATUS_STYLE[problem.status] || STATUS_STYLE.open;
  const scopeSt = SCOPE_STYLE[problem.scope] || { background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border)' };

  const ghostBtn = {
    background: 'var(--subtle-bg)', border: '1px solid var(--subtle-border-md)',
    color: 'var(--text-h)', boxShadow: 'none', padding: '7px 14px', fontSize: 13,
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
      <Helmet>
        <title>{problem.title} — HiveCollective</title>
        <meta name="description" content={ogDescription} />
        <meta property="og:title" content={`${problem.title} — HiveCollective`} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:image" content={`https://hivecollective-frontend.vercel.app/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${problem.title} — HiveCollective`} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={`https://hivecollective-frontend.vercel.app/og-image.png`} />
      </Helmet>

      {/* Back link + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate('/problems')} style={{ ...ghostBtn, fontSize: 13 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {isLoggedIn && (
            <button
              onClick={toggleBookmark}
              disabled={bookmarkLoading}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark this problem'}
              style={{
                ...ghostBtn,
                borderColor: bookmarked ? 'var(--honey-border)' : undefined,
                background: bookmarked ? 'var(--honey-bg)' : undefined,
                color: bookmarked ? 'var(--honey)' : undefined,
              }}
            >
              {bookmarked ? '★ Saved' : '☆ Save'}
            </button>
          )}
          {isLoggedIn && user && user.id !== problem.user_id && (
            <button
              onClick={() => setReportingProblem(true)}
              style={{ ...ghostBtn, color: 'var(--text)' }}
              title="Report this problem"
            >
              ⚑ Report
            </button>
          )}
        </div>
      </div>

      {/* Problem card */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid rgba(168,85,247,0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '22px 26px',
        marginBottom: 24,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.3px', ...st }}>
            {st.label}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.3px', ...scopeSt }}>
            {problem.scope}
          </span>
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'var(--subtle-bg-2)', color: 'var(--text-h)', fontFamily: 'var(--mono)' }}>
            {problem.location_tag}
          </span>
          {problem.tags && problem.tags.map(tag => (
            <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--subtle-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              #{tag}
            </span>
          ))}
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.4, fontFamily: 'var(--heading)', color: 'var(--text-h)' }}>
          {problem.title}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.75, margin: '0 0 16px' }}>
          {problem.description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Posted by <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{problem.posted_by}</span> · {new Date(problem.created_at).toLocaleDateString()}
          </p>

          {isLoggedIn && user && user.id === problem.user_id && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status:</span>
              <select
                value={problem.status || 'open'}
                disabled={statusUpdating}
                onChange={e => updateStatus(e.target.value)}
                style={{ fontSize: 12, padding: '5px 10px', width: 'auto' }}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <ShareBar problemId={id} problemTitle={problem.title} />

      {/* Groups section */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'var(--heading)', color: 'var(--text-h)' }}>
            Groups <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>({groups.length})</span>
          </h2>
          {isLoggedIn && (
            <button onClick={() => navigate(`/problems/${id}/groups/new`)} style={{ ...ghostBtn, fontSize: 13 }}>
              + Create group
            </button>
          )}
        </div>

        {groups.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            No groups yet — be the first to organise around this problem.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {groups.map(group => (
            <div
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              style={{
                background: 'var(--card-bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(168,85,247,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 3px', color: 'var(--text-h)' }}>{group.name}</p>
                {group.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{group.description}</p>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 12, fontFamily: 'var(--mono)' }}>
                {group.member_count} member{group.member_count !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Solutions section */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'var(--heading)', color: 'var(--text-h)' }}>
          Solutions <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>({solutions.length})</span>
        </h2>
        {isLoggedIn && (
          <button onClick={() => navigate(`/problems/${id}/solutions/new`)}>
            + Propose a solution
          </button>
        )}
      </div>

      {solutions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text)', border: '1px dashed rgba(168,85,247,0.15)', borderRadius: 'var(--radius-lg)', background: 'rgba(168,85,247,0.03)', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.2 }}>⬡</div>
          <p style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-h)' }}>No solutions yet.</p>
          {isLoggedIn
            ? <button onClick={() => navigate(`/problems/${id}/solutions/new`)} style={{ marginTop: 4 }}>Be the first to propose one</button>
            : <p style={{ fontSize: 13 }}><a href="/register">Sign up</a> to propose a solution.</p>
          }
        </div>
      )}

      {solutions.map((s, i) => (
        <SolutionCard
          key={s.id}
          solution={s}
          problemId={id}
          isTop={i === 0 && solutions.length > 1}
        />
      ))}

      {/* Related problems */}
      {related.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14, fontFamily: 'var(--mono)' }}>
            Related problems
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {related.map(r => (
              <div
                key={r.id}
                onClick={() => navigate(`/problems/${r.id}`)}
                style={{
                  background: 'var(--card-bg-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(168,85,247,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', lineHeight: 1.4, marginBottom: 8 }}>
                  {r.title.length > 80 ? r.title.slice(0, 80) + '…' : r.title}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--subtle-bg-2)', color: 'var(--text-h)', fontFamily: 'var(--mono)' }}>
                    {r.location_tag}
                  </span>
                  {r.tags && r.tags.slice(0, 2).map(tag => (
                    <span key={tag} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--subtle-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                      #{tag}
                    </span>
                  ))}
                  <span style={{ fontSize: 11, color: 'var(--honey)', marginLeft: 'auto', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                    {r.solution_count} sol{r.solution_count !== '1' ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportingProblem && (
        <ReportModal type="problem" referenceId={id} onClose={() => setReportingProblem(false)} />
      )}
    </div>
  );
}
