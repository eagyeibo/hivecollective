import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../config';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STATUS_COLORS = {
  open:        { color: 'var(--accent)',  bg: 'var(--accent-bg)',  label: 'Open' },
  in_progress: { color: 'var(--honey)',   bg: 'var(--honey-bg)',   label: 'In Progress' },
  resolved:    { color: 'var(--emerald)', bg: 'var(--emerald-bg)', label: 'Resolved' },
};

function FeedItem({ item, onClick }) {
  const status = STATUS_COLORS[item.problem_status] || STATUS_COLORS.open;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--card-bg)',
        border: `1px solid ${hovered ? 'rgba(168,85,247,0.3)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 6px 24px rgba(124,34,240,0.12)' : 'none',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: 'var(--accent)', fontWeight: 700, flexShrink: 0,
        }}>
          {item.actor[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--text-h)', fontWeight: 600 }}>
            @{item.actor}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
            posted a solution · {timeAgo(item.activity_time)}
          </span>
        </div>
        {item.location_tag && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
            📍 {item.location_tag}
          </span>
        )}
      </div>

      {/* Problem title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', marginBottom: 6, lineHeight: 1.4 }}>
        {item.problem_title}
      </div>

      {/* Solution preview */}
      {item.preview && (
        <div style={{
          fontSize: 12, color: 'var(--text)', lineHeight: 1.6,
          padding: '8px 12px', background: 'var(--subtle-bg)',
          borderLeft: '3px solid var(--accent-border)',
          borderRadius: '0 6px 6px 0', marginBottom: 10,
        }}>
          {item.preview}{item.preview.length >= 140 ? '…' : ''}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
          padding: '2px 8px', borderRadius: 100,
          background: status.bg, color: status.color,
        }}>{status.label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          View problem →
        </span>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login', { replace: true }); return; }
    fetchFeed();
  }, [isLoggedIn]);

  async function fetchFeed() {
    setLoading(true);
    try {
      const token = localStorage.getItem('hc_token');
      const res = await fetch(`${API}/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeed(data.feed || []);
    } catch (e) {
      setError(e.message || 'Could not load feed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px',
          color: 'var(--text-h)', fontFamily: 'var(--heading)', margin: '0 0 6px',
        }}>
          Your feed
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text)', margin: 0 }}>
          Recent activity on problems in your groups and bookmarks.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Loading…
        </div>
      )}

      {!loading && error && (
        <div style={{
          background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)',
          borderRadius: 'var(--radius-sm)', padding: '12px 16px',
          fontSize: 13, color: '#f87171',
        }}>{error}</div>
      )}

      {!loading && !error && feed.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '64px 20px',
          background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⬡</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-h)', marginBottom: 8 }}>
            Nothing here yet
          </p>
          <p style={{ fontSize: 13, color: 'var(--text)', maxWidth: 320, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Join a group or bookmark a problem to see updates from the community here.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/problems')} style={{ fontSize: 13, padding: '9px 20px' }}>
              Browse problems
            </button>
            <button onClick={() => navigate('/bookmarks')} style={{
              fontSize: 13, padding: '9px 20px',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-h)', boxShadow: 'none',
            }}>
              My bookmarks
            </button>
          </div>
        </div>
      )}

      {!loading && feed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {feed.map(item => (
            <FeedItem
              key={`${item.type}-${item.reference_id}`}
              item={item}
              onClick={() => navigate(`/problems/${item.problem_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
