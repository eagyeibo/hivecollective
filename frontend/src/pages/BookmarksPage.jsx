import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
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

export default function BookmarksPage() {
  const { isLoggedIn, token } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`${API}/bookmarks`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setBookmarks(d.bookmarks || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isLoggedIn, token]);

  async function removeBookmark(problemId, e) {
    e.stopPropagation();
    await fetch(`${API}/bookmarks/${problemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    setBookmarks(b => b.filter(x => x.id !== problemId));
  }

  if (!isLoggedIn) {
    return (
      <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <p style={{ fontSize: 15, marginBottom: 12, color: 'var(--text)' }}>{t('bookmarks.signInPrompt')}</p>
        <button onClick={() => navigate('/login')}>{t('bookmarks.signInButton')}</button>
      </div>
    );
  }

  const count = bookmarks.length;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', fontFamily: 'var(--heading)', color: 'var(--text-h)', letterSpacing: '-0.4px', borderLeft: '3px solid var(--honey)', paddingLeft: 12 }}>
          {t('bookmarks.title')}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, paddingLeft: 15 }}>
          {count === 1 ? t('bookmarks.savedCount', { count }) : t('bookmarks.savedCountPlural', { count })}
        </p>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 90, background: 'var(--subtle-bg)', borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, var(--subtle-bg), transparent)', animation: 'shimmer 1.5s infinite' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && bookmarks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text)', border: '1px dashed rgba(251,191,36,0.2)', borderRadius: 'var(--radius-lg)', background: 'rgba(251,191,36,0.03)' }}>
          <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.2 }}>☆</div>
          <p style={{ fontSize: 15, marginBottom: 8, color: 'var(--text-h)', fontWeight: 500 }}>{t('bookmarks.none')}</p>
          <button onClick={() => navigate('/problems')} style={{ marginTop: 4 }}>{t('bookmarks.browse')}</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bookmarks.map((problem, idx) => {
          const st = STATUS_STYLE[problem.status] || STATUS_STYLE.open;
          const scopeSt = SCOPE_STYLE[problem.scope] || SCOPE_STYLE.local;
          const solCount = problem.solution_count;
          return (
            <div
              key={problem.id}
              onClick={() => navigate(`/problems/${problem.id}`)}
              style={{
                background: 'var(--card-bg-subtle)',
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--honey)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
                animation: `fadeUp 0.4s ease ${idx * 0.05}s both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(251,191,36,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, lineHeight: 1.4, color: 'var(--text-h)', fontFamily: 'var(--heading)' }}>
                  {problem.title}
                </h2>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.3px', ...st }}>
                    {st.label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.3px', ...scopeSt }}>
                    {problem.scope}
                  </span>
                  <button
                    onClick={e => removeBookmark(problem.id, e)}
                    title="Remove bookmark"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--honey)', padding: '0 4px', boxShadow: 'none' }}
                  >★</button>
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.6 }}>
                {problem.description.length > 120 ? problem.description.slice(0, 120) + '…' : problem.description}
              </p>

              {problem.tags && problem.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {problem.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--subtle-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--mono)', background: 'var(--subtle-bg-2)', padding: '2px 7px', borderRadius: 5, color: 'var(--text-h)', fontSize: 11 }}>
                  {problem.location_tag}
                </span>
                <span>{t('bookmarks.by')} {problem.posted_by}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--honey)', fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 11 }}>
                  {solCount} {solCount === 1 ? t('bookmarks.solution') : t('bookmarks.solutionPlural')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
