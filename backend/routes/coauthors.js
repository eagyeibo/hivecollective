const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { sendPushToUser } = require('../utils/push');

const router = express.Router();

pool.query(`
  CREATE TABLE IF NOT EXISTS solution_coauthors (
    id          SERIAL PRIMARY KEY,
    solution_id INTEGER NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (solution_id, user_id)
  )
`).catch(err => console.error('Failed to create solution_coauthors table:', err));

// GET /api/solutions/:solutionId/coauthors
router.get('/:solutionId/coauthors', async (req, res) => {
  const { solutionId } = req.params;
  try {
    const result = await pool.query(
      `SELECT sc.user_id, sc.status, u.username,
        COALESCE((SELECT SUM(s.score) FROM solutions s WHERE s.user_id = u.id AND s.is_removed = FALSE), 0) AS author_score,
        COALESCE((SELECT COUNT(*) FROM solutions s WHERE s.user_id = u.id AND s.is_removed = FALSE), 0) AS author_solutions_count,
        COALESCE((SELECT COUNT(*) FROM solutions s WHERE s.user_id = u.id AND s.is_implemented = TRUE), 0) AS author_implemented_count
       FROM solution_coauthors sc
       JOIN users u ON u.id = sc.user_id
       WHERE sc.solution_id = $1
       ORDER BY sc.created_at ASC`,
      [solutionId]
    );
    return res.json({ coauthors: result.rows });
  } catch (err) {
    console.error('Get coauthors error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/solutions/:solutionId/coauthors — author invites by username
router.post('/:solutionId/coauthors', authMiddleware, async (req, res) => {
  const { solutionId } = req.params;
  const { username } = req.body;
  const inviter_id = req.user.id;

  if (!username) return res.status(400).json({ error: 'Username is required.' });

  try {
    const sol = await pool.query(
      'SELECT s.user_id, p.title, p.id AS problem_id FROM solutions s JOIN problems p ON p.id = s.problem_id WHERE s.id = $1',
      [solutionId]
    );
    if (sol.rows.length === 0) return res.status(404).json({ error: 'Solution not found.' });
    if (sol.rows[0].user_id !== inviter_id) return res.status(403).json({ error: 'Only the solution author can invite co-authors.' });

    const invitee = await pool.query('SELECT id, username FROM users WHERE username = $1', [username]);
    if (invitee.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const inviteeId = invitee.rows[0].id;

    if (inviteeId === inviter_id) return res.status(400).json({ error: 'You cannot invite yourself.' });

    await pool.query(
      `INSERT INTO solution_coauthors (solution_id, user_id, invited_by)
       VALUES ($1, $2, $3) ON CONFLICT (solution_id, user_id) DO NOTHING`,
      [solutionId, inviteeId, inviter_id]
    );

    // In-app notification
    const inviterRow = await pool.query('SELECT username FROM users WHERE id = $1', [inviter_id]);
    const msg = `${inviterRow.rows[0].username} invited you to co-author a solution on "${sol.rows[0].title}"`;
    await pool.query(
      `INSERT INTO notifications (user_id, type, reference_id, message)
       VALUES ($1, 'coauthor_invite', $2, $3) ON CONFLICT DO NOTHING`,
      [inviteeId, sol.rows[0].problem_id, msg]
    );
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    sendPushToUser(inviteeId, { title: 'Co-author invitation', body: msg, url: `${appUrl}/problems/${sol.rows[0].problem_id}` }).catch(() => {});

    return res.status(201).json({ message: 'Invitation sent.', invitee: invitee.rows[0].username });
  } catch (err) {
    console.error('Invite coauthor error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/solutions/:solutionId/coauthors/:userId — accept or decline
router.patch('/:solutionId/coauthors/:userId', authMiddleware, async (req, res) => {
  const { solutionId, userId } = req.params;
  const { status } = req.body;
  const user_id = req.user.id;

  if (!['accepted', 'declined'].includes(status)) return res.status(400).json({ error: 'Status must be accepted or declined.' });
  if (parseInt(userId) !== user_id) return res.status(403).json({ error: 'Permission denied.' });

  try {
    await pool.query(
      'UPDATE solution_coauthors SET status = $1 WHERE solution_id = $2 AND user_id = $3',
      [status, solutionId, user_id]
    );
    return res.json({ message: `Invitation ${status}.` });
  } catch (err) {
    console.error('Update coauthor status error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/solutions/:solutionId/coauthors/:userId — author removes, or user removes themselves
router.delete('/:solutionId/coauthors/:userId', authMiddleware, async (req, res) => {
  const { solutionId, userId } = req.params;
  const user_id = req.user.id;

  try {
    const sol = await pool.query('SELECT user_id FROM solutions WHERE id = $1', [solutionId]);
    if (sol.rows.length === 0) return res.status(404).json({ error: 'Solution not found.' });
    const isOwner = sol.rows[0].user_id === user_id;
    const isSelf = parseInt(userId) === user_id;
    if (!isOwner && !isSelf) return res.status(403).json({ error: 'Permission denied.' });

    await pool.query('DELETE FROM solution_coauthors WHERE solution_id = $1 AND user_id = $2', [solutionId, userId]);
    return res.json({ message: 'Co-author removed.' });
  } catch (err) {
    console.error('Remove coauthor error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
