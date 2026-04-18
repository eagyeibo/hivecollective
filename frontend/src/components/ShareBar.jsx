// ─────────────────────────────────────────────────────────────
// src/components/ShareBar.jsx
// Export to PDF + social share buttons
// Import into ProblemDetailPage and place below the problem card
// Usage: <ShareBar problemId={id} problemTitle={problem.title} />
// ─────────────────────────────────────────────────────────────

import API from '../config';

export default function ShareBar({ problemId, problemTitle }) {
  const pageUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent(`"${problemTitle}" — help solve this on HiveCollective`);

  const shareLinks = [
    {
      label: 'WhatsApp',
      color: '#25d366',
      textColor: '#fff',
      url: `https://wa.me/?text=${shareText}%20${pageUrl}`,
    },
    {
      label: 'Twitter / X',
      color: '#000',
      textColor: '#fff',
      url: `https://twitter.com/intent/tweet?text=${shareText}&url=${pageUrl}`,
    },
    {
      label: 'Facebook',
      color: '#1877f2',
      textColor: '#fff',
      url: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`,
    },
  ];

  function downloadPDF() {
    window.open(`${API}/export/problems/${problemId}`, '_blank');
  }

  return (
    <div style={{
      background: 'var(--card-bg-subtle)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    }}>

      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginRight: 4 }}>
        Share or export:
      </span>

      <button
        onClick={downloadPDF}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, padding: '5px 12px',
          background: 'var(--subtle-bg)', border: '1px solid var(--border)',
          color: 'var(--text-h)', boxShadow: 'none',
        }}
      >
        Export PDF
      </button>

      {/* Social share buttons */}
      {shareLinks.map(link => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            fontSize: 12,
            padding: '6px 12px',
            borderRadius: 8,
            background: link.color,
            color: link.textColor,
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
