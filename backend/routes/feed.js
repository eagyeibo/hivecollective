const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/feed
// Returns recent activity on problems from the user's groups + bookmarks
router.get('/', authMiddleware, async (req, res) => {
  const user_id = req.user.id;

  try {
    // Collect problem IDs the user cares about (groups + bookmarks)
    // then return recent solutions on those problems
    const result = await pool.query(
      `WITH relevant AS (
         SELECT DISTINCT p.id AS problem_id
         FROM problems p
         JOIN groups g ON g.problem_id = p.id
         JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
         UNION
         SELECT b.problem_id
         FROM bookmarks b WHERE b.user_id = $1
       )
       SELECT
         'new_solution'           AS type,
         s.id                     AS reference_id,
         s.created_at             AS activity_time,
         p.id                     AS problem_id,
         p.title                  AS problem_title,
         p.status                 AS problem_status,
         p.location_tag,
         u.username               AS actor,
         LEFT(s.content, 140)     AS preview
       FROM solutions s
       JOIN problems p ON p.id = s.problem_id
       JOIN users u   ON u.id = s.user_id
       JOIN relevant r ON r.problem_id = p.id
       WHERE s.user_id != $1
         AND s.created_at > NOW() - INTERVAL '14 days'
       ORDER BY s.created_at DESC
       LIMIT 30`,
      [user_id]
    );

    return res.status(200).json({ feed: result.rows });
  } catch (err) {
    console.error('Feed error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
