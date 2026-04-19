const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { sendNotificationEmail } = require('../utils/email');

const router = express.Router();

// ─────────────────────────────────────────
// GET /api/solutions/:solutionId/comments
// Public — get all comments for a solution
// ─────────────────────────────────────────
router.get('/:solutionId/comments', async (req, res) => {
  const { solutionId } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.username, u.id AS user_id,
        COALESCE((SELECT SUM(s.score) FROM solutions s WHERE s.user_id = u.id AND s.is_removed = FALSE), 0) AS author_score,
        COALESCE((SELECT COUNT(*) FROM solutions s WHERE s.user_id = u.id AND s.is_removed = FALSE), 0) AS author_solutions_count,
        COALESCE((SELECT COUNT(*) FROM solutions s WHERE s.user_id = u.id AND s.is_implemented = TRUE), 0) AS author_implemented_count
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.solution_id = $1
       ORDER BY c.created_at ASC`,
      [solutionId]
    );
    return res.json({ comments: result.rows });
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// POST /api/solutions/:solutionId/comments
// Protected — post a comment on a solution
// ─────────────────────────────────────────
router.post('/:solutionId/comments', authMiddleware, async (req, res) => {
  const { solutionId } = req.params;
  const { content } = req.body;
  const user_id = req.user.id;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }
  if (content.length > 1000) {
    return res.status(400).json({ error: 'Comment must be under 1000 characters.' });
  }

  try {
    const solutionCheck = await pool.query('SELECT id FROM solutions WHERE id = $1', [solutionId]);
    if (solutionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Solution not found.' });
    }

    const result = await pool.query(
      `INSERT INTO comments (solution_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [solutionId, user_id, content.trim()]
    );

    const comment = result.rows[0];

    // Notify the solution author (if not self-commenting)
    const solution = await pool.query(
      `SELECT s.user_id, p.title, p.id AS problem_id
       FROM solutions s JOIN problems p ON p.id = s.problem_id
       WHERE s.id = $1`,
      [solutionId]
    );
    const sol = solution.rows[0];
    if (sol && sol.user_id !== user_id) {
      const commenter = await pool.query('SELECT username FROM users WHERE id = $1', [user_id]);
      const msg = `${commenter.rows[0].username} commented on your solution for "${sol.title}"`;
      await pool.query(
        `INSERT INTO notifications (user_id, type, reference_id, message)
         VALUES ($1, 'new_comment', $2, $3)`,
        [sol.user_id, sol.problem_id, msg]
      );
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      sendNotificationEmail(sol.user_id, `New comment on your solution`, `
        <p style="font-size:14px;color:#aaa;line-height:1.6;margin:0 0 16px;">${msg}</p>
        <a href="${appUrl}/problems/${sol.problem_id}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;">View problem</a>
      `).catch(() => {});
    }

    const user = await pool.query('SELECT username FROM users WHERE id = $1', [user_id]);
    return res.status(201).json({
      comment: { ...comment, username: user.rows[0].username, user_id },
    });

  } catch (err) {
    console.error('Post comment error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/solutions/:solutionId/comments/:commentId
// Protected — only comment author can delete
// ─────────────────────────────────────────
router.delete('/:solutionId/comments/:commentId', authMiddleware, async (req, res) => {
  const { commentId } = req.params;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [commentId, user_id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Comment not found or permission denied.' });
    }
    return res.json({ message: 'Comment deleted.' });
  } catch (err) {
    console.error('Delete comment error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
