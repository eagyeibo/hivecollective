const TIERS = [
  {
    label: 'Champion',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.35)',
    test: (s, i) => i >= 10 || s >= 500,
  },
  {
    label: 'Expert',
    color: '#a78bfa',
    bg: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.35)',
    test: (s, i) => i >= 5 || s >= 100,
  },
  {
    label: 'Solver',
    color: '#2dd4bf',
    bg: 'rgba(45,212,191,0.12)',
    border: 'rgba(45,212,191,0.35)',
    test: (s, i) => i >= 1 || s >= 20,
  },
  {
    label: 'Contributor',
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.35)',
    test: (s, i, sol) => sol >= 1,
  },
];

// Returns the highest earned badge or null for newcomers.
// total_score: number, implemented_count: number, solutions_count: number
export function getBadge(total_score, implemented_count, solutions_count) {
  const s   = parseInt(total_score)       || 0;
  const i   = parseInt(implemented_count) || 0;
  const sol = parseInt(solutions_count)   || 0;
  return TIERS.find(t => t.test(s, i, sol)) || null;
}
