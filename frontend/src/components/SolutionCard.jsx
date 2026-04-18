import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../config';
import CommentSection from './CommentSection';
import ReportModal from './ReportModal';

function MentionText({ text }) {
  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return (
    <span>
      {parts.map((part, i) =>
        /^@[a-zA-Z0-9_]+$/.test(part)
          ? <span key={i} style={{ color: 'var(--accent)', fontWeight: 600 }}>{part}</span>
          : part
      )}
    </span>
  );
}

export default function SolutionCard({ solution, problemId, isTop }) {
  const { token, isLoggedIn, user } = useAuth();
  const [score, setScore] = useState(solution.score);
  const [userVote, setUserVote] = useState(solution.userVote || 0);
  const [voting, setVoting] = useState(false);
  const [reporting, setReporting] = useState(false);

  const isOwnSolution = user && user.id === solution.user_id;

  async function vote(value) {
    if (!isLoggedIn) { alert('Please sign in to vote.'); return; }
    if (isOwnSolution || voting) return;
    setVoting(true);
    try {
      const res = await fetch(`${API}/problems/${problemId}/solutions/${solution.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ value }),
      });
      const data = await res.json();
      if (res.ok) { setScore(data.score); setUserVote(data.userVote); }
    } catch {}
    finally { setVoting(false); }
  }

  return (
    <div style={{
      background: isTop ? 'var(--emerald-bg)' : 'var(--card-bg-subtle)',
      border: `1px solid ${isTop ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 18px',
      marginBottom: 10,
      display: 'flex',
      gap: 14,
      backdropFilter: 'blur(8px)',
    }}>

      {/* Vote column */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 36 }}>
        <button
          onClick={() => vote(1)}
          disabled={voting || isOwnSolution}
          title={isOwnSolution ? "You can't vote on your own solution" : 'Upvote'}
          style={{
            background: userVote === 1 ? 'var(--emerald-bg)' : 'transparent',
            border: `1px solid ${userVote === 1 ? 'var(--emerald-border)' : 'var(--border)'}`,
            borderRadius: 6, width: 32, height: 32,
            cursor: isOwnSolution ? 'default' : 'pointer',
            color: userVote === 1 ? 'var(--emerald)' : 'var(--text-muted)',
            fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isOwnSolution ? 0.4 : 1, boxShadow: 'none', padding: 0,
          }}
        >▲</button>

        <span style={{
          fontSize: 14, fontWeight: 700, fontFamily: 'var(--mono)',
          color: score > 0 ? 'var(--emerald)' : score < 0 ? '#f87171' : 'var(--text-muted)',
          minWidth: 24, textAlign: 'center',
        }}>
          {score}
        </span>

        <button
          onClick={() => vote(-1)}
          disabled={voting || isOwnSolution}
          title={isOwnSolution ? "You can't vote on your own solution" : 'Downvote'}
          style={{
            background: userVote === -1 ? 'rgba(248,113,113,0.1)' : 'transparent',
            border: `1px solid ${userVote === -1 ? 'rgba(248,113,113,0.35)' : 'var(--border)'}`,
            borderRadius: 6, width: 32, height: 32,
            cursor: isOwnSolution ? 'default' : 'pointer',
            color: userVote === -1 ? '#f87171' : 'var(--text-muted)',
            fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isOwnSolution ? 0.4 : 1, boxShadow: 'none', padding: 0,
          }}
        >▼</button>
      </div>

      {/* Content column */}
      <div style={{ flex: 1 }}>
        {isTop && (
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--emerald)', margin: '0 0 6px', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
            ✦ Top solution
          </p>
        )}
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.75, margin: '0 0 10px' }}>
          <MentionText text={solution.content} />
        </p>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>by <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{solution.posted_by}</span></span>
          <span>{new Date(solution.created_at).toLocaleDateString()}</span>
          {isOwnSolution && <span style={{ color: 'var(--text-muted)' }}>your solution</span>}
          {isLoggedIn && !isOwnSolution && (
            <button
              onClick={() => setReporting(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', padding: 0, marginLeft: 'auto', boxShadow: 'none' }}
              title="Report this solution"
            >
              ⚑ Report
            </button>
          )}
        </div>
        <CommentSection solutionId={solution.id} />
        {reporting && (
          <ReportModal type="solution" referenceId={solution.id} onClose={() => setReporting(false)} />
        )}
      </div>
    </div>
  );
}
