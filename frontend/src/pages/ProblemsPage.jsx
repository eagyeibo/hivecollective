import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../config';

const ALL_TAGS = ['health','education','infrastructure','agriculture','environment','economy','security','governance','technology','other'];

const SCOPE_STYLE = {
  national: {
    badge: { background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' },
    bar: 'var(--accent)',
    glow: 'rgba(168,85,247,0.18)',
  },
  local: {
    badge: { background: 'var(--emerald-bg)', color: 'var(--emerald)', border: '1px solid var(--emerald-border)' },
    bar: 'var(--emerald)',
    glow: 'rgba(52,211,153,0.15)',
  },
};

const STATUS_STYLE = {
  open:        { background: 'var(--emerald-bg)', color: 'var(--emerald)', border: '1px solid var(--emerald-border)', label: 'Open' },
  in_progress: { background: 'var(--honey-bg)',   color: 'var(--honey)',   border: '1px solid var(--honey-border)',   label: 'In Progress' },
  resolved:    { background: 'var(--accent-bg)',  color: 'var(--accent)',  border: '1px solid var(--accent-border)',  label: 'Resolved' },
};

function getScope(scope) {
  return SCOPE_STYLE[scope] || {
    badge: { background: 'var(--code-bg)', color: 'var(--text)', border: '1px solid var(--border)' },
    bar: 'var(--text-dim)',
    glow: 'rgba(255,255,255,0.05)',
  };
}

function HexRow() {
  const R = 10;
  function pts(cx, cy) {
    return Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
  }
  const colors = ['var(--accent)', 'var(--honey)', 'var(--emerald)', 'var(--accent-2)', 'var(--accent)'];
  const spacing = R * 1.732;
  return (
    <svg width={spacing * 5 + 4} height={R * 2 + 4} aria-hidden="true" style={{ display: 'block', marginBottom: 10 }}>
      {colors.map((c, i) => (
        <polygon
          key={i}
          points={pts(R + 2 + i * spacing, R + 2)}
          fill="none" stroke={c} strokeWidth="1.5" opacity="0.55"
          style={{ animation: `hexFloat ${2.5 + i * 0.4}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--card-bg-subtle)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', borderLeft: '3px solid var(--border)',
      padding: '18px 22px', overflow: 'hidden', position: 'relative',
    }}>
      {[['60%', 14, 0], ['85%', 10, 0.2], ['40%', 10, 0.4]].map(([w, h, delay], i) => (
        <div key={i} style={{ height: h, width: w, background: 'var(--subtle-bg-2)', borderRadius: 4, marginBottom: i < 2 ? 10 : 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', animation: `shimmer 1.5s ${delay}s infinite` }} />
        </div>
      ))}
    </div>
  );
}

export default function ProblemsPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('latest');

  useEffect(() => { fetchProblems(); }, [scopeFilter, locationFilter, searchQuery, sort, statusFilter, tagFilter]);

  async function fetchProblems() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (scopeFilter)    params.append('scope', scopeFilter);
      if (locationFilter) params.append('location', locationFilter);
      if (searchQuery)    params.append('search', searchQuery);
      if (sort === 'trending') params.append('sort', 'trending');
      if (statusFilter)   params.append('status', statusFilter);
      if (tagFilter)      params.append('tag', tagFilter);
      const res = await fetch(`${API}/problems?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProblems(data.problems);
    } catch {
      setError('Could not load problems.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) { e.preventDefault(); setSearchQuery(searchInput.trim()); }

  function clearAll() {
    setScopeFilter(''); setLocationFilter(''); setSearchQuery('');
    setSearchInput(''); setSort('latest'); setStatusFilter(''); setTagFilter('');
  }

  const hasFilters = scopeFilter || locationFilter || searchQuery || sort === 'trending' || statusFilter || tagFilter;

  const selectStyle = { minWidth: 0, flex: '0 0 auto', width: 'auto' };
  const ghostBtn = {
    background: 'transparent', color: 'var(--text)',
    border: '1px solid var(--border)', boxShadow: 'none',
    padding: '8px 14px', fontSize: 13,
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px', textAlign: 'left' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <HexRow />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{
              fontSize: 22, fontWeight: 700, margin: 0,
              fontFamily: 'var(--heading)', letterSpacing: '-0.4px', color: 'var(--text-h)',
              borderLeft: '3px solid var(--accent)', paddingLeft: 12,
            }}>
              Problems
            </h1>
            {!loading && (
              <span style={{
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
                padding: '2px 9px', borderRadius: 20,
                background: 'var(--accent-bg)', color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
              }}>
                {problems.length}
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, paddingLeft: 15 }}>
            Real challenges posted by the community
          </p>
        </div>
        {isLoggedIn && (
          <button onClick={() => navigate('/problems/new')} style={{ flexShrink: 0 }}>
            + Post a problem
          </button>
        )}
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search problems…"
          style={{ flex: 1 }}
        />
        <button type="submit" style={{ padding: '9px 18px', fontSize: 13, flexShrink: 0 }}>Search</button>
        {searchQuery && (
          <button type="button" onClick={() => { setSearchQuery(''); setSearchInput(''); }} style={{ ...ghostBtn, padding: '9px 12px' }}>✕</button>
        )}
      </form>

      {/* Sort + filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0 }}>
          {['latest', 'trending'].map(s => (
            <button key={s} onClick={() => setSort(s)} style={{
              padding: '7px 16px', fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: 'none', borderRadius: 0,
              background: sort === s ? 'var(--accent-bg)' : 'transparent',
              color: sort === s ? 'var(--accent)' : 'var(--text)',
              fontWeight: sort === s ? 600 : 400,
              transform: 'none',
            }}>
              {s === 'trending' ? '🔥 Trending' : 'Latest'}
            </button>
          ))}
        </div>

        <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value)} style={selectStyle}>
          <option value="">All scopes</option>
          <option value="local">Local</option>
          <option value="national">National</option>
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

        <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={selectStyle}>
          <option value="">All categories</option>
          {ALL_TAGS.map(t => <option key={t} value={t}>#{t}</option>)}
        </select>

        <input
          placeholder="Filter by location…"
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
          style={{ flex: 1, minWidth: 120 }}
        />

        {hasFilters && (
          <button onClick={clearAll} style={ghostBtn}>Clear all</button>
        )}
      </div>

      {searchQuery && (
        <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
          Results for <strong style={{ color: 'var(--text-h)' }}>"{searchQuery}"</strong>
        </p>
      )}

      {/* Skeleton / error */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13, color: '#f87171',
        }}>{error}</div>
      )}

      {/* Empty state */}
      {!loading && !error && problems.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '64px 0', color: 'var(--text)',
          border: '1px dashed rgba(168,85,247,0.2)', borderRadius: 'var(--radius-lg)',
          background: 'rgba(168,85,247,0.03)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.2 }}>⬡</div>
          <p style={{ fontSize: 15, marginBottom: 8, color: 'var(--text-h)', fontWeight: 500 }}>No problems found.</p>
          {hasFilters
            ? <button onClick={clearAll} style={{ marginTop: 8 }}>Clear filters</button>
            : isLoggedIn
              ? <button onClick={() => navigate('/problems/new')} style={{ marginTop: 8 }}>Be the first to post one</button>
              : <p style={{ fontSize: 13 }}><a href="/register">Sign up</a> to post the first problem.</p>
          }
        </div>
      )}

      {/* Problem list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {problems.map((problem, idx) => {
          const scope = getScope(problem.scope);
          const st = STATUS_STYLE[problem.status] || STATUS_STYLE.open;
          return (
            <div
              key={problem.id}
              onClick={() => navigate(`/problems/${problem.id}`)}
              style={{
                background: 'var(--card-bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                borderLeft: `3px solid ${scope.bar}`,
                padding: '18px 22px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
                textAlign: 'left',
                backdropFilter: 'blur(8px)',
                animation: `fadeUp 0.4s ease ${idx * 0.05}s both`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 8px 32px ${scope.glow}, 0 0 0 1px rgba(168,85,247,0.1)`;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = 'rgba(168,85,247,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {/* Title + badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 7 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.4, color: 'var(--text-h)', fontFamily: 'var(--heading)' }}>
                  {problem.title}
                </h2>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, letterSpacing: '0.3px', textTransform: 'uppercase', ...st }}>
                    {st.label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.3px', ...scope.badge }}>
                    {problem.scope}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.6 }}>
                {problem.description.length > 120 ? problem.description.slice(0, 120) + '…' : problem.description}
              </p>

              {/* Tags */}
              {problem.tags && problem.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {problem.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20,
                      background: 'var(--subtle-bg)', color: 'var(--text)',
                      border: '1px solid var(--border)',
                    }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Meta row */}
              <div style={{ fontSize: 12, color: 'var(--text)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'var(--subtle-bg-2)', padding: '2px 8px',
                  borderRadius: 5, fontWeight: 500, color: 'var(--text-h)',
                  fontFamily: 'var(--mono)', fontSize: 11,
                }}>
                  {problem.location_tag}
                </span>
                <span>by {problem.posted_by}</span>
                <span style={{
                  marginLeft: 'auto',
                  background: 'var(--honey-bg)', color: 'var(--honey)',
                  border: '1px solid var(--honey-border)',
                  padding: '2px 8px', borderRadius: 5, fontWeight: 600, fontSize: 11,
                  fontFamily: 'var(--mono)',
                }}>
                  {problem.solution_count} solution{problem.solution_count !== 1 ? 's' : ''}
                </span>
                <span style={{ opacity: 0.6 }}>{new Date(problem.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
