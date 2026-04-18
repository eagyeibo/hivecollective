const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────
// GET /api/bookmarks
// Protected — get all bookmarked problems for current user
// ─────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT
         p.id, p.title, p.description, p.scope, p.location_tag,
         p.status, p.tags, p.created_at,
         u.username AS posted_by,
         COUNT(DISTINCT s.id) AS solution_count,
         b.created_at AS bookmarked_at
       FROM bookmarks b
       JOIN problems p ON p.id = b.problem_id
       JOIN users u    ON u.id = p.user_id
       LEFT JOIN solutions s ON s.problem_id = p.id AND s.is_removed = FALSE
       WHERE b.user_id = $1
       GROUP BY p.id, u.username, b.created_at
       ORDER BY b.created_at DESC`,
      [user_id]
    );
    return res.json({ bookmarks: result.rows });
  } catch (err) {
    console.error('Get bookmarks error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// POST /api/bookmarks/:problemId
// Protected — bookmark a problem
// ─────────────────────────────────────────
router.post('/:problemId', authMiddleware, async (req, res) => {
  const { problemId } = req.params;
  const user_id = req.user.id;

  try {
    const problemCheck = await pool.query('SELECT id FROM problems WHERE id = $1', [problemId]);
    if (problemCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    await pool.query(
      'INSERT INTO bookmarks (user_id, problem_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user_id, problemId]
    );
    return res.status(201).json({ message: 'Bookmarked.' });
  } catch (err) {
    console.error('Bookmark error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/bookmarks/:problemId
// Protected — remove a bookmark
// ─────────────────────────────────────────
router.delete('/:problemId', authMiddleware, async (req, res) => {
  const { problemId } = req.params;
  const user_id = req.user.id;

  try {
    await pool.query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND problem_id = $2',
      [user_id, problemId]
    );
    return res.json({ message: 'Bookmark removed.' });
  } catch (err) {
    console.error('Remove bookmark error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// GET /api/bookmarks/check/:problemId
// Protected — check if a problem is bookmarked
// ─────────────────────────────────────────
router.get('/check/:problemId', authMiddleware, async (req, res) => {
  const { problemId } = req.params;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      'SELECT id FROM bookmarks WHERE user_id = $1 AND problem_id = $2',
      [user_id, problemId]
    );
    return res.json({ bookmarked: result.rows.length > 0 });
  } catch (err) {
    console.error('Check bookmark error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
