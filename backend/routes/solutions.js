const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { sendNotificationEmail } = require('../utils/email');

const router = express.Router();

// ─────────────────────────────────────────
// POST /api/problems/:id/solutions
// Protected — logged-in users propose a solution
// Also notifies all group members for this problem
// ─────────────────────────────────────────
router.post('/:id/solutions', authMiddleware, async (req, res) => {
  const problem_id = parseInt(req.params.id);
  const user_id = req.user.id;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Solution content is required.' });
  }

  if (content.length > 5000) {
    return res.status(400).json({ error: 'Solution must be under 5000 characters.' });
  }

  try {
    // Check problem exists
    const problem = await pool.query(
      'SELECT id, title FROM problems WHERE id = $1',
      [problem_id]
    );
    if (problem.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    // Insert solution
    const result = await pool.query(
      `INSERT INTO solutions (problem_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, score, created_at`,
      [problem_id, user_id, content.trim()]
    );

    const solution = result.rows[0];

    // Notify all group members for groups linked to this problem
    const groups = await pool.query(
      'SELECT id FROM groups WHERE problem_id = $1',
      [problem_id]
    );

    for (const group of groups.rows) {
      const members = await pool.query(
        `SELECT user_id FROM group_members
         WHERE group_id = $1 AND user_id != $2`,
        [group.id, user_id]
      );

      for (const member of members.rows) {
        const msg = `A new solution was proposed for: "${problem.rows[0].title}"`;
        await pool.query(
          `INSERT INTO notifications (user_id, type, reference_id, message)
           VALUES ($1, 'new_solution', $2, $3)`,
          [member.user_id, solution.id, msg]
        );
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        sendNotificationEmail(member.user_id, `New solution: ${problem.rows[0].title}`, `
          <p style="font-size:14px;color:#aaa;line-height:1.6;margin:0 0 16px;">${msg}</p>
          <a href="${appUrl}/problems/${problem_id}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;">View solution</a>
        `).catch(() => {});
      }
    }

    // Parse @mentions and notify mentioned users
    const mentionMatches = content.match(/@([a-zA-Z0-9_]+)/g) || [];
    const mentionedUsernames = [...new Set(mentionMatches.map(m => m.slice(1)))];

    for (const username of mentionedUsernames) {
      const mentioned = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      if (mentioned.rows.length > 0 && mentioned.rows[0].id !== user_id) {
        const poster = await pool.query('SELECT username FROM users WHERE id = $1', [user_id]);
        const msg = `${poster.rows[0].username} mentioned you in a solution for "${problem.rows[0].title}"`;
        await pool.query(
          `INSERT INTO notifications (user_id, type, reference_id, message)
           VALUES ($1, 'mention', $2, $3)`,
          [mentioned.rows[0].id, problem_id, msg]
        );
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        sendNotificationEmail(mentioned.rows[0].id, `You were mentioned on HiveCollective`, `
          <p style="font-size:14px;color:#aaa;line-height:1.6;margin:0 0 16px;">${msg}</p>
          <a href="${appUrl}/problems/${problem_id}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:13px;">View problem</a>
        `).catch(() => {});
      }
    }

    return res.status(201).json({
      message: 'Solution posted successfully.',
      solution,
    });

  } catch (err) {
    console.error('Post solution error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// POST /api/problems/:id/solutions/:solutionId/vote
// Protected — upvote (+1) or downvote (-1), one per user
// ─────────────────────────────────────────
router.post('/:id/solutions/:solutionId/vote', authMiddleware, async (req, res) => {
  const solution_id = parseInt(req.params.solutionId);
  const user_id = req.user.id;
  const { value } = req.body;

  if (value !== 1 && value !== -1) {
    return res.status(400).json({ error: 'Vote value must be 1 or -1.' });
  }

  try {
    const solution = await pool.query(
      'SELECT id, user_id FROM solutions WHERE id = $1',
      [solution_id]
    );
    if (solution.rows.length === 0) {
      return res.status(404).json({ error: 'Solution not found.' });
    }

    if (solution.rows[0].user_id === user_id) {
      return res.status(403).json({ error: 'You cannot vote on your own solution.' });
    }

    const existing = await pool.query(
      'SELECT id, value FROM votes WHERE solution_id = $1 AND user_id = $2',
      [solution_id, user_id]
    );

    if (existing.rows.length > 0) {
      const previousValue = existing.rows[0].value;

      if (previousValue === value) {
        await pool.query('DELETE FROM votes WHERE solution_id = $1 AND user_id = $2', [solution_id, user_id]);
        await pool.query('UPDATE solutions SET score = score - $1 WHERE id = $2', [value, solution_id]);
        const updated = await pool.query('SELECT score FROM solutions WHERE id = $1', [solution_id]);
        return res.status(200).json({ message: 'Vote removed.', score: updated.rows[0].score, userVote: 0 });
      } else {
        await pool.query('UPDATE votes SET value = $1 WHERE solution_id = $2 AND user_id = $3', [value, solution_id, user_id]);
        await pool.query('UPDATE solutions SET score = score + $1 WHERE id = $2', [value * 2, solution_id]);
        const updated = await pool.query('SELECT score FROM solutions WHERE id = $1', [solution_id]);
        return res.status(200).json({ message: 'Vote updated.', score: updated.rows[0].score, userVote: value });
      }
    }

    await pool.query(
      'INSERT INTO votes (solution_id, user_id, value) VALUES ($1, $2, $3)',
      [solution_id, user_id, value]
    );
    await pool.query('UPDATE solutions SET score = score + $1 WHERE id = $2', [value, solution_id]);
    const updated = await pool.query('SELECT score FROM solutions WHERE id = $1', [solution_id]);
    return res.status(200).json({ message: 'Vote recorded.', score: updated.rows[0].score, userVote: value });

  } catch (err) {
    console.error('Vote error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/problems/:id/solutions/:solutionId
// Protected — only the original poster can delete
// ─────────────────────────────────────────
router.delete('/:id/solutions/:solutionId', authMiddleware, async (req, res) => {
  const solution_id = parseInt(req.params.solutionId);
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      'DELETE FROM solutions WHERE id = $1 AND user_id = $2 RETURNING id',
      [solution_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Solution not found or you do not have permission to delete it.' });
    }

    return res.status(200).json({ message: 'Solution deleted.' });

  } catch (err) {
    console.error('Delete solution error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
