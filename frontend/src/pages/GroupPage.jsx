import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../config';

export default function GroupPage() {
  const { id } = useParams();
  const { token, user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const isMember = members.some(m => m.id === user?.id);
  const isModerator = members.some(m => m.id === user?.id && m.role === 'moderator');

  useEffect(() => { fetchGroup(); }, [id]);

  async function fetchGroup() {
    try {
      const res = await fetch(`${API}/groups/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGroup(data.group);
      setMembers(data.members);
    } catch {
      setError('Could not load group.');
    } finally {
      setLoading(false);
    }
  }

  async function joinGroup() {
    setJoining(true);
    try {
      const res = await fetch(`${API}/groups/${id}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) fetchGroup();
      else setError(data.error);
    } finally {
      setJoining(false);
    }
  }

  async function leaveGroup() {
    try {
      const res = await fetch(`${API}/groups/${id}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) fetchGroup();
    } catch {
      setError('Could not leave group.');
    }
  }

  async function assignModerator(userId) {
    try {
      const res = await fetch(`${API}/groups/${id}/moderators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (res.ok) fetchGroup();
      else setError(data.error);
    } catch {
      setError('Could not assign moderator.');
    }
  }

  const ghostBtn = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-h)', boxShadow: 'none', padding: '7px 14px', fontSize: 13,
  };

  if (loading) return (
    <div style={{ padding: '60px 24px', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ height: 120, background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)', animation: 'shimmer 1.5s infinite' }} />
      </div>
    </div>
  );

  if (error) return (
    <div style={{ padding: '40px 24px', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-md)', padding: '14px 18px', fontSize: 13, color: '#f87171' }}>{error}</div>
    </div>
  );

  if (!group) return null;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px' }}>
      <button onClick={() => navigate(`/problems/${group.problem_id}`)} style={{ ...ghostBtn, marginBottom: 24 }}>
        ← Back to problem
      </button>

      {/* Group card */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid rgba(168,85,247,0.2)',
        borderRadius: 'var(--radius-lg)', padding: '22px 26px', marginBottom: 24,
        backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--heading)', color: 'var(--text-h)', letterSpacing: '-0.3px' }}>
          {group.name}
        </h1>
        {group.description && (
          <p style={{ fontSize: 14, color: 'var(--text)', margin: '0 0 14px', lineHeight: 1.7 }}>{group.description}</p>
        )}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Focused on:{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate(`/problems/${group.problem_id}`)}>
            {group.problem_title}
          </span>
          {' · '}<span style={{ fontFamily: 'var(--mono)' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>
          {' · '}Created by {group.created_by}
        </p>

        {isLoggedIn && !isMember && (
          <button onClick={joinGroup} disabled={joining}>
            {joining ? 'Joining…' : 'Join this group'}
          </button>
        )}
        {isLoggedIn && isMember && !isModerator && (
          <button onClick={leaveGroup} style={{ ...ghostBtn, color: 'var(--text)' }}>
            Leave group
          </button>
        )}
        {isModerator && (
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
            Moderator
          </span>
        )}
      </div>

      {/* Members */}
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', fontFamily: 'var(--heading)', color: 'var(--text-h)' }}>
        Members <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({members.length})</span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {members.map(member => (
          <div key={member.id} style={{
            background: 'var(--card-bg-subtle)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.25)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'var(--accent)',
                border: '1px solid var(--accent-border)',
              }}>
                {member.username.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-h)', fontWeight: 500 }}>{member.username}</span>
              {member.role === 'moderator' && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)', fontWeight: 600 }}>
                  mod
                </span>
              )}
            </div>
            {isModerator && member.role !== 'moderator' && member.id !== user.id && (
              <button
                onClick={() => assignModerator(member.id)}
                style={{ ...ghostBtn, fontSize: 12, padding: '4px 10px' }}
              >
                Make moderator
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
