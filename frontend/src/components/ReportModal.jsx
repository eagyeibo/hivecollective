import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../config';

const REASONS = [
  { value: 'spam',           label: 'Spam' },
  { value: 'inappropriate',  label: 'Inappropriate content' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'harassment',     label: 'Harassment' },
  { value: 'off_topic',      label: 'Off-topic' },
  { value: 'other',          label: 'Other' },
];

export default function ReportModal({ type, referenceId, onClose }) {
  const { token } = useAuth();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!reason) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type, reference_id: referenceId, reason, notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setDone(true);
    } catch {
      setError('Could not submit report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg-strong)', borderRadius: 'var(--radius-lg)', padding: '24px 26px',
          width: '100%', maxWidth: 420,
          boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(168,85,247,0.2)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--text-h)', fontFamily: 'var(--heading)' }}>Report submitted</p>
            <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 24 }}>Thanks — our team will review it shortly.</p>
            <button onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-h)', fontFamily: 'var(--heading)' }}>Report {type}</h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', lineHeight: 1, boxShadow: 'none', padding: '4px' }}>✕</button>
            </div>

            {error && (
              <div style={{ background: 'rgba(185,28,28,0.1)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', marginBottom: 14, fontSize: 13, color: '#f87171' }}>
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 14 }}>
                Why are you reporting this {type}?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {REASONS.map(r => (
                  <label
                    key={r.value}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      border: `1px solid ${reason === r.value ? 'var(--accent-border)' : 'var(--border)'}`,
                      background: reason === r.value ? 'var(--accent-bg)' : 'var(--subtle-bg)',
                      transition: 'all 0.12s',
                    }}
                  >
                    <input
                      type="radio" name="reason" value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                    />
                    <span style={{ fontSize: 13, color: reason === r.value ? 'var(--accent)' : 'var(--text)', fontWeight: reason === r.value ? 600 : 400 }}>
                      {r.label}
                    </span>
                  </label>
                ))}
              </div>

              <label style={{ fontSize: 13, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                Additional notes <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Describe the issue in more detail…"
                rows={3} maxLength={500}
                style={{ marginBottom: 16 }}
              />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={onClose} style={{ background: 'var(--subtle-bg)', border: '1px solid var(--subtle-border-md)', color: 'var(--text-h)', boxShadow: 'none' }}>
                  Cancel
                </button>
                <button
                  type="submit" disabled={!reason || loading}
                  style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', color: '#f87171', boxShadow: 'none' }}
                >
                  {loading ? 'Submitting…' : 'Submit report'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
