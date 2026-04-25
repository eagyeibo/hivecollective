const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { logEvent } = require('../utils/events');

const router = express.Router();

const VALID_TAGS = ['health','education','infrastructure','agriculture','environment','economy','security','governance','technology','other'];

pool.query('ALTER TABLE problems ADD COLUMN IF NOT EXISTS affected_count INTEGER')
  .catch(err => console.error('Failed to add affected_count column:', err));

// ─────────────────────────────────────────
// GET /api/problems
// Public — returns all problems, newest first
// Optional: ?scope=local&location=Accra&search=water&sort=trending&status=open&tag=health
// ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const { scope, location, search, sort, status, tag } = req.query;

  try {
    let query = `
      SELECT
        p.id,
        p.title,
        p.description,
        p.scope,
        p.location_tag,
        p.status,
        p.tags,
        p.created_at,
        u.username AS posted_by,
        COUNT(DISTINCT s.id) AS solution_count,
        COALESCE(SUM(s.score), 0) AS total_score,
        COUNT(DISTINCT v.id) FILTER (WHERE v.created_at > NOW() - INTERVAL '7 days') AS recent_votes
      FROM problems p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN solutions s ON s.problem_id = p.id AND s.is_removed = FALSE
      LEFT JOIN votes v ON v.solution_id = s.id
    `;

    const conditions = [];
    const values = [];

    if (scope) {
      values.push(scope);
      conditions.push(`p.scope = $${values.length}`);
    }

    if (location) {
      values.push(`%${location}%`);
      conditions.push(`p.location_tag ILIKE $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      const n = values.length;
      conditions.push(`(p.title ILIKE $${n} OR p.description ILIKE $${n})`);
    }

    if (status && ['open','in_progress','resolved'].includes(status)) {
      values.push(status);
      conditions.push(`p.status = $${values.length}`);
    }

    if (tag && VALID_TAGS.includes(tag)) {
      values.push(tag);
      conditions.push(`$${values.length} = ANY(p.tags)`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY p.id, u.username';

    if (sort === 'trending') {
      query += ' ORDER BY recent_votes DESC, total_score DESC, p.created_at DESC';
    } else {
      query += ' ORDER BY p.created_at DESC';
    }

    const result = await pool.query(query, values);
    return res.status(200).json({ problems: result.rows });

  } catch (err) {
    console.error('Get problems error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// GET /api/problems/:id
// Public — returns one problem with its solutions ranked by score
// ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const problemResult = await pool.query(
      `SELECT
        p.id, p.title, p.description, p.scope, p.location_tag,
        p.status, p.tags, p.created_at, p.affected_count,
        u.username AS posted_by, u.id AS user_id
       FROM problems p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [id]
    );

    if (problemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    const solutionsResult = await pool.query(
      `SELECT
        s.id, s.content, s.score, s.created_at,
        u.username AS posted_by, u.id AS user_id,
        COALESCE((SELECT SUM(s2.score) FROM solutions s2 WHERE s2.user_id = u.id AND s2.is_removed = FALSE), 0) AS author_score,
        COALESCE((SELECT COUNT(*) FROM solutions s2 WHERE s2.user_id = u.id AND s2.is_removed = FALSE), 0) AS author_solutions_count,
        COALESCE((SELECT COUNT(*) FROM solutions s2 WHERE s2.user_id = u.id AND s2.is_implemented = TRUE), 0) AS author_implemented_count
       FROM solutions s
       JOIN users u ON u.id = s.user_id
       WHERE s.problem_id = $1
       ORDER BY s.score DESC, s.created_at ASC`,
      [id]
    );

    return res.status(200).json({
      problem: problemResult.rows[0],
      solutions: solutionsResult.rows,
    });

  } catch (err) {
    console.error('Get problem error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// POST /api/problems
// Protected — logged-in users post a new problem
// ─────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, scope, location_tag, tags, affected_count } = req.body;
  const user_id = req.user.id;

  if (!title || !description || !scope || !location_tag) {
    return res.status(400).json({ error: 'Title, description, scope, and location are required.' });
  }

  if (!['local', 'national'].includes(scope)) {
    return res.status(400).json({ error: 'Scope must be local or national.' });
  }

  if (title.length > 255) {
    return res.status(400).json({ error: 'Title must be under 255 characters.' });
  }

  const cleanTags = Array.isArray(tags)
    ? tags.filter(t => VALID_TAGS.includes(t))
    : [];

  try {
    const cleanAffected = affected_count && Number.isInteger(Number(affected_count)) && Number(affected_count) > 0
      ? Number(affected_count) : null;

    const result = await pool.query(
      `INSERT INTO problems (user_id, title, description, scope, location_tag, tags, affected_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, scope, location_tag, status, tags, affected_count, created_at`,
      [user_id, title, description, scope, location_tag, cleanTags, cleanAffected]
    );

    const problem = result.rows[0];
    logEvent(problem.id, 'problem_created', `Problem posted by ${req.user.username || 'a user'}`);

    return res.status(201).json({
      message: 'Problem posted successfully.',
      problem,
    });

  } catch (err) {
    console.error('Post problem error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// Problem updates (progress posts by owner)
// ─────────────────────────────────────────
pool.query(`
  CREATE TABLE IF NOT EXISTS problem_updates (
    id         SERIAL PRIMARY KEY,
    problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('Failed to create problem_updates table:', err));

router.get('/:id/updates', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT pu.id, pu.content, pu.created_at, u.username
       FROM problem_updates pu
       JOIN users u ON u.id = pu.user_id
       WHERE pu.problem_id = $1
       ORDER BY pu.created_at DESC`,
      [id]
    );
    return res.json({ updates: result.rows });
  } catch (err) {
    console.error('Get updates error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/:id/updates', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content is required.' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'Update must be under 2000 characters.' });
  }

  try {
    const problem = await pool.query('SELECT user_id FROM problems WHERE id = $1', [id]);
    if (problem.rows.length === 0) return res.status(404).json({ error: 'Problem not found.' });
    if (problem.rows[0].user_id !== user_id) return res.status(403).json({ error: 'Only the problem owner can post updates.' });

    const result = await pool.query(
      `INSERT INTO problem_updates (problem_id, user_id, content)
       VALUES ($1, $2, $3) RETURNING id, content, created_at`,
      [id, user_id, content.trim()]
    );
    logEvent(id, 'update_posted', `Owner posted a progress update`);
    return res.status(201).json({ update: result.rows[0] });
  } catch (err) {
    console.error('Post update error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/:id/updates/:updateId', authMiddleware, async (req, res) => {
  const { id, updateId } = req.params;
  const user_id = req.user.id;
  try {
    const problem = await pool.query('SELECT user_id FROM problems WHERE id = $1', [id]);
    if (problem.rows.length === 0) return res.status(404).json({ error: 'Problem not found.' });
    if (problem.rows[0].user_id !== user_id) return res.status(403).json({ error: 'Permission denied.' });

    await pool.query('DELETE FROM problem_updates WHERE id = $1 AND problem_id = $2', [updateId, id]);
    return res.json({ message: 'Update deleted.' });
  } catch (err) {
    console.error('Delete update error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// GET /api/problems/:id/timeline
// ─────────────────────────────────────────
router.get('/:id/timeline', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, event_type, description, created_at
       FROM problem_events WHERE problem_id = $1
       ORDER BY created_at ASC`,
      [id]
    );
    return res.json({ events: result.rows });
  } catch (err) {
    console.error('Timeline error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// GET /api/problems/:id/related
// Public — up to 4 problems sharing tags or location with this one
// ─────────────────────────────────────────
router.get('/:id/related', async (req, res) => {
  const { id } = req.params;
  try {
    const curr = await pool.query(
      'SELECT tags, location_tag FROM problems WHERE id = $1',
      [id]
    );
    if (curr.rows.length === 0) return res.status(404).json({ error: 'Problem not found.' });

    const { tags, location_tag } = curr.rows[0];
    const hasTags = Array.isArray(tags) && tags.length > 0;

    let result;
    if (hasTags) {
      result = await pool.query(
        `SELECT p.id, p.title, p.scope, p.location_tag, p.tags, p.status,
                u.username AS posted_by,
                COUNT(DISTINCT s.id) AS solution_count
         FROM problems p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN solutions s ON s.problem_id = p.id AND s.is_removed = FALSE
         WHERE p.id != $1
           AND (p.tags && $2 OR p.location_tag ILIKE $3)
         GROUP BY p.id, u.username
         ORDER BY
           (CASE WHEN p.tags && $2 AND p.location_tag ILIKE $3 THEN 2
                 WHEN p.tags && $2 THEN 1
                 ELSE 0 END) DESC,
           COUNT(DISTINCT s.id) DESC
         LIMIT 4`,
        [id, tags, `%${location_tag}%`]
      );
    } else {
      result = await pool.query(
        `SELECT p.id, p.title, p.scope, p.location_tag, p.tags, p.status,
                u.username AS posted_by,
                COUNT(DISTINCT s.id) AS solution_count
         FROM problems p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN solutions s ON s.problem_id = p.id AND s.is_removed = FALSE
         WHERE p.id != $1 AND p.location_tag ILIKE $2
         GROUP BY p.id, u.username
         ORDER BY COUNT(DISTINCT s.id) DESC
         LIMIT 4`,
        [id, `%${location_tag}%`]
      );
    }

    return res.json({ related: result.rows });
  } catch (err) {
    console.error('Related problems error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// PATCH /api/problems/:id/status
// Protected — only the original poster can update status
// ─────────────────────────────────────────
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user_id = req.user.id;

  if (!['open', 'in_progress', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Status must be open, in_progress, or resolved.' });
  }

  try {
    const result = await pool.query(
      `UPDATE problems SET status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, status`,
      [status, id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Problem not found or you do not have permission.' });
    }

    const labels = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };
    logEvent(id, 'status_changed', `Status changed to ${labels[status] || status}`);
    return res.status(200).json({ message: 'Status updated.', status: result.rows[0].status });

  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/problems/:id
// Protected — only the original poster can delete
// ─────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      'DELETE FROM problems WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Problem not found or you do not have permission to delete it.' });
    }

    return res.status(200).json({ message: 'Problem deleted.' });

  } catch (err) {
    console.error('Delete problem error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
