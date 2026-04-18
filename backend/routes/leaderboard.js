const express = require('express');
const pool = require('../db');

const router = express.Router();

// ─────────────────────────────────────────
// GET /api/leaderboard
// Public — top contributors ranked by total solution score
// Optional: ?limit=20 (default 50)
// ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.username,
         u.created_at,
         COUNT(DISTINCT p.id)                                              AS problems_count,
         COUNT(DISTINCT s.id)                                              AS solutions_count,
         COALESCE(SUM(s.score) FILTER (WHERE s.is_removed = FALSE), 0)    AS total_score,
         COUNT(DISTINCT sc.id)                                             AS implemented_count
       FROM users u
       LEFT JOIN problems  p  ON p.user_id  = u.id
       LEFT JOIN solutions s  ON s.user_id  = u.id
       LEFT JOIN solution_credits sc ON sc.user_id = u.id
       GROUP BY u.id, u.username, u.created_at
       ORDER BY total_score DESC, implemented_count DESC, solutions_count DESC
       LIMIT $1`,
      [limit]
    );

    return res.status(200).json({ leaderboard: result.rows });

  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
