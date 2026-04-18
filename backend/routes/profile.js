const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/profile/:username
// Public — no auth required. Returns full profile data in one response.
router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // 1. Core user row
    const userResult = await db.query(
      `SELECT id, username, email, preferred_language, created_at, COALESCE(is_verified_org, FALSE) AS is_verified_org, COALESCE(is_admin, FALSE) AS is_admin
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const userId = user.id;

    // 2. Aggregate stats (single query)
    const statsResult = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM problems WHERE user_id = $1)                          AS problems_count,
         (SELECT COUNT(*) FROM solutions WHERE user_id = $1 AND is_removed = FALSE)  AS solutions_count,
         (SELECT COUNT(*) FROM solution_credits WHERE user_id = $1)                  AS implemented_count,
         (SELECT COALESCE(SUM(s.score), 0)
          FROM solutions s
          WHERE s.user_id = $1 AND s.is_removed = FALSE)                             AS total_score`,
      [userId]
    );

    const stats = statsResult.rows[0];

    // 3. Implemented solution credits (with problem context)
    const creditsResult = await db.query(
      `SELECT
         sc.created_at                         AS credited_at,
         s.id                                  AS solution_id,
         s.content                             AS solution_content,
         p.id                                  AS problem_id,
         p.title                               AS problem_title,
         cb.username                           AS credited_by_username,
         g.name                                AS group_name,
         -- co-credits on same solution
         ARRAY(
           SELECT u2.username
           FROM solution_credits sc2
           JOIN users u2 ON u2.id = sc2.user_id
           WHERE sc2.solution_id = s.id
           ORDER BY u2.username
         )                                     AS credited_users
       FROM solution_credits sc
       JOIN solutions s  ON s.id  = sc.solution_id
       JOIN problems  p  ON p.id  = s.problem_id
       JOIN users    cb  ON cb.id = sc.credited_by
       LEFT JOIN groups g ON g.problem_id = p.id AND g.id = (
         SELECT gm.group_id
         FROM group_members gm
         WHERE gm.user_id = $1
           AND gm.group_id IN (SELECT id FROM groups WHERE problem_id = p.id)
         LIMIT 1
       )
       WHERE sc.user_id = $1
       ORDER BY sc.created_at DESC`,
      [userId]
    );

    // 4. Solutions proposed (not removed), sorted by score desc
    const solutionsResult = await db.query(
      `SELECT
         s.id,
         s.content,
         s.score,
         s.is_implemented,
         s.created_at,
         p.id    AS problem_id,
         p.title AS problem_title
       FROM solutions s
       JOIN problems p ON p.id = s.problem_id
       WHERE s.user_id = $1 AND s.is_removed = FALSE
       ORDER BY s.score DESC, s.created_at DESC
       LIMIT 20`,
      [userId]
    );

    // 5. Problems posted, sorted by date desc
    const problemsResult = await db.query(
      `SELECT
         p.id,
         p.title,
         p.description,
         p.scope,
         p.location_tag,
         p.created_at,
         (SELECT COUNT(*) FROM solutions s WHERE s.problem_id = p.id AND s.is_removed = FALSE) AS solution_count,
         (SELECT COUNT(*) FROM groups   g WHERE g.problem_id = p.id)                           AS group_count
       FROM problems p
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [userId]
    );

    // 6. Group memberships with role
    const groupsResult = await db.query(
      `SELECT
         g.id,
         g.name,
         gm.role,
         gm.joined_at,
         (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) AS member_count
       FROM group_members gm
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY gm.joined_at DESC`,
      [userId]
    );

    // 7. Is this user a moderator in at least one group?
    const isModerator = groupsResult.rows.some(g => g.role === 'moderator');

    res.json({
      user: {
        id: user.id,
        username: user.username,
        preferred_language: user.preferred_language,
        created_at: user.created_at,
        is_admin: user.is_admin,
        is_moderator: isModerator,
        is_verified_org: user.is_verified_org,
      },
      stats: {
        problems_count:     parseInt(stats.problems_count),
        solutions_count:    parseInt(stats.solutions_count),
        implemented_count:  parseInt(stats.implemented_count),
        total_score:        parseInt(stats.total_score),
      },
      implemented_credits: creditsResult.rows,
      solutions:           solutionsResult.rows,
      problems:            problemsResult.rows,
      groups:              groupsResult.rows,
    });

  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
