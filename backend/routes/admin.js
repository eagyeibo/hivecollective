const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Auto-create is_verified_org column if it doesn't exist
pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified_org BOOLEAN DEFAULT FALSE`)
  .catch(err => console.error('Failed to add is_verified_org column:', err));

// Admin middleware — must be logged in AND is_admin = true
async function adminOnly(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]?.is_admin) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
}

// All admin routes require auth + admin role
router.use(authMiddleware, adminOnly);

// ─────────────────────────────────────────
// GET /api/admin/stats
// Platform-wide stats
// ─────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)                                        AS total_users,
        (SELECT COUNT(*) FROM users  WHERE created_at > NOW() - INTERVAL '7 days') AS new_users_7d,
        (SELECT COUNT(*) FROM problems)                                     AS total_problems,
        (SELECT COUNT(*) FROM problems WHERE created_at > NOW() - INTERVAL '7 days') AS new_problems_7d,
        (SELECT COUNT(*) FROM problems WHERE status = 'open')               AS open_problems,
        (SELECT COUNT(*) FROM problems WHERE status = 'in_progress')        AS inprogress_problems,
        (SELECT COUNT(*) FROM problems WHERE status = 'resolved')           AS resolved_problems,
        (SELECT COUNT(*) FROM solutions WHERE is_removed = FALSE)           AS total_solutions,
        (SELECT COUNT(*) FROM solutions WHERE created_at > NOW() - INTERVAL '7 days' AND is_removed = FALSE) AS new_solutions_7d,
        (SELECT COUNT(*) FROM votes)                                        AS total_votes,
        (SELECT COUNT(*) FROM groups)                                       AS total_groups,
        (SELECT COUNT(*) FROM comments)                                     AS total_comments,
        (SELECT COUNT(*) FROM bookmarks)                                    AS total_bookmarks,
        (SELECT COUNT(*) FROM reports WHERE status = 'pending')             AS pending_reports,
        (SELECT COUNT(*) FROM reports)                                      AS total_reports
    `);
    return res.json({ stats: result.rows[0] });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/reports
// List all reports with content context
// ─────────────────────────────────────────
router.get('/reports', async (req, res) => {
  const { status = 'pending', limit = 50, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT
         r.id, r.type, r.reference_id, r.reason, r.notes, r.status, r.created_at,
         u.username AS reporter,
         CASE
           WHEN r.type = 'problem'  THEN (SELECT title       FROM problems  WHERE id = r.reference_id)
           WHEN r.type = 'solution' THEN (SELECT LEFT(content, 120) FROM solutions WHERE id = r.reference_id)
           WHEN r.type = 'comment'  THEN (SELECT LEFT(content, 120) FROM comments  WHERE id = r.reference_id)
         END AS content_preview,
         CASE
           WHEN r.type = 'problem'  THEN r.reference_id
           WHEN r.type = 'solution' THEN (SELECT problem_id FROM solutions WHERE id = r.reference_id)
           WHEN r.type = 'comment'  THEN (SELECT p.id FROM comments c JOIN solutions s ON s.id = c.solution_id JOIN problems p ON p.id = s.problem_id WHERE c.id = r.reference_id)
         END AS problem_id
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       WHERE ($1 = 'all' OR r.status = $1)
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM reports WHERE ($1 = 'all' OR status = $1)`,
      [status]
    );

    return res.json({ reports: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Admin reports error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// PATCH /api/admin/reports/:id
// Update report status: reviewed | dismissed
// ─────────────────────────────────────────
router.patch('/reports/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['reviewed', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Status must be reviewed or dismissed.' });
  }

  try {
    const result = await pool.query(
      'UPDATE reports SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found.' });
    return res.json({ report: result.rows[0] });
  } catch (err) {
    console.error('Update report error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/admin/problems/:id
// Admin hard-delete a problem
// ─────────────────────────────────────────
router.delete('/problems/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM problems WHERE id = $1', [req.params.id]);
    return res.json({ message: 'Problem deleted.' });
  } catch (err) {
    console.error('Admin delete problem error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/admin/solutions/:id
// Admin hard-delete a solution
// ─────────────────────────────────────────
router.delete('/solutions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM solutions WHERE id = $1', [req.params.id]);
    return res.json({ message: 'Solution deleted.' });
  } catch (err) {
    console.error('Admin delete solution error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/admin/comments/:id
// Admin hard-delete a comment
// ─────────────────────────────────────────
router.delete('/comments/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM comments WHERE id = $1', [req.params.id]);
    return res.json({ message: 'Comment deleted.' });
  } catch (err) {
    console.error('Admin delete comment error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// GET /api/admin/users
// Recent users list
// ─────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id, u.username, u.email, u.is_admin, u.is_verified_org, u.created_at,
         COUNT(DISTINCT p.id)  AS problems_count,
         COUNT(DISTINCT s.id)  AS solutions_count
       FROM users u
       LEFT JOIN problems  p ON p.user_id = u.id
       LEFT JOIN solutions s ON s.user_id = u.id AND s.is_removed = FALSE
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT 100`,
    );
    return res.json({ users: result.rows });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// PATCH /api/admin/users/:id/verify
// Toggle verified organisation status for a user
// ─────────────────────────────────────────
router.patch('/users/:id/verify', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE users SET is_verified_org = NOT COALESCE(is_verified_org, FALSE)
       WHERE id = $1 RETURNING id, username, is_verified_org`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Verify org error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// PATCH /api/admin/users/:id/promote
// Toggle admin status for a user
// ─────────────────────────────────────────
router.patch('/users/:id/promote', async (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own admin status.' });
  }
  try {
    const result = await pool.query(
      `UPDATE users SET is_admin = NOT COALESCE(is_admin, FALSE)
       WHERE id = $1 RETURNING id, username, is_admin`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Promote admin error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
