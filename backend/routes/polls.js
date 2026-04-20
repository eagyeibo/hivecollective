const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

pool.query(`
  CREATE TABLE IF NOT EXISTS polls (
    id          SERIAL PRIMARY KEY,
    solution_id INTEGER NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS poll_options (
    id         SERIAL PRIMARY KEY,
    poll_id    INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    text       TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS poll_votes (
    id         SERIAL PRIMARY KEY,
    poll_id    INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id  INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (poll_id, user_id)
  );
`).catch(err => console.error('Failed to create poll tables:', err));

// GET /api/solutions/:solutionId/poll
router.get('/:solutionId/poll', async (req, res) => {
  const { solutionId } = req.params;
  const userId = req.headers.authorization
    ? (() => { try { return require('jsonwebtoken').verify(req.headers.authorization.replace('Bearer ', ''), process.env.JWT_SECRET).id; } catch { return null; } })()
    : null;

  try {
    const pollRes = await pool.query(
      'SELECT id, question, created_at FROM polls WHERE solution_id = $1',
      [solutionId]
    );
    if (pollRes.rows.length === 0) return res.json({ poll: null });

    const poll = pollRes.rows[0];
    const options = await pool.query(
      `SELECT po.id, po.text, COUNT(pv.id)::int AS votes
       FROM poll_options po
       LEFT JOIN poll_votes pv ON pv.option_id = po.id
       WHERE po.poll_id = $1
       GROUP BY po.id ORDER BY po.id`,
      [poll.id]
    );

    let userVote = null;
    if (userId) {
      const voteRes = await pool.query(
        'SELECT option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
        [poll.id, userId]
      );
      if (voteRes.rows.length > 0) userVote = voteRes.rows[0].option_id;
    }

    return res.json({ poll: { ...poll, options: options.rows, userVote } });
  } catch (err) {
    console.error('Get poll error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/solutions/:solutionId/poll — solution author only
router.post('/:solutionId/poll', authMiddleware, async (req, res) => {
  const { solutionId } = req.params;
  const { question, options } = req.body;
  const user_id = req.user.id;

  if (!question || !question.trim()) return res.status(400).json({ error: 'Question is required.' });
  if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
    return res.status(400).json({ error: 'Provide 2–6 options.' });
  }
  const cleanOptions = options.map(o => o.trim()).filter(Boolean);
  if (cleanOptions.length < 2) return res.status(400).json({ error: 'At least 2 non-empty options required.' });

  try {
    const sol = await pool.query('SELECT user_id FROM solutions WHERE id = $1', [solutionId]);
    if (sol.rows.length === 0) return res.status(404).json({ error: 'Solution not found.' });
    if (sol.rows[0].user_id !== user_id) return res.status(403).json({ error: 'Only the solution author can add a poll.' });

    const existing = await pool.query('SELECT id FROM polls WHERE solution_id = $1', [solutionId]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'A poll already exists for this solution.' });

    const pollRes = await pool.query(
      'INSERT INTO polls (solution_id, question) VALUES ($1, $2) RETURNING id, question, created_at',
      [solutionId, question.trim()]
    );
    const poll = pollRes.rows[0];

    for (const text of cleanOptions) {
      await pool.query('INSERT INTO poll_options (poll_id, text) VALUES ($1, $2)', [poll.id, text]);
    }

    const optionsRes = await pool.query(
      'SELECT id, text, 0::int AS votes FROM poll_options WHERE poll_id = $1 ORDER BY id',
      [poll.id]
    );

    return res.status(201).json({ poll: { ...poll, options: optionsRes.rows, userVote: null } });
  } catch (err) {
    console.error('Create poll error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/solutions/:solutionId/poll/vote
router.post('/:solutionId/poll/vote', authMiddleware, async (req, res) => {
  const { solutionId } = req.params;
  const { option_id } = req.body;
  const user_id = req.user.id;

  try {
    const pollRes = await pool.query('SELECT id FROM polls WHERE solution_id = $1', [solutionId]);
    if (pollRes.rows.length === 0) return res.status(404).json({ error: 'No poll found.' });
    const poll_id = pollRes.rows[0].id;

    const optRes = await pool.query('SELECT id FROM poll_options WHERE id = $1 AND poll_id = $2', [option_id, poll_id]);
    if (optRes.rows.length === 0) return res.status(400).json({ error: 'Invalid option.' });

    await pool.query(
      `INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1, $2, $3)
       ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = $2`,
      [poll_id, option_id, user_id]
    );

    const options = await pool.query(
      `SELECT po.id, po.text, COUNT(pv.id)::int AS votes
       FROM poll_options po LEFT JOIN poll_votes pv ON pv.option_id = po.id
       WHERE po.poll_id = $1 GROUP BY po.id ORDER BY po.id`,
      [poll_id]
    );

    return res.json({ options: options.rows, userVote: option_id });
  } catch (err) {
    console.error('Poll vote error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/solutions/:solutionId/poll — author only
router.delete('/:solutionId/poll', authMiddleware, async (req, res) => {
  const { solutionId } = req.params;
  const user_id = req.user.id;
  try {
    const sol = await pool.query('SELECT user_id FROM solutions WHERE id = $1', [solutionId]);
    if (sol.rows.length === 0) return res.status(404).json({ error: 'Solution not found.' });
    if (sol.rows[0].user_id !== user_id) return res.status(403).json({ error: 'Permission denied.' });
    await pool.query('DELETE FROM polls WHERE solution_id = $1', [solutionId]);
    return res.json({ message: 'Poll deleted.' });
  } catch (err) {
    console.error('Delete poll error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
