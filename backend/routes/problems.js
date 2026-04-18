const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const VALID_TAGS = ['health','education','infrastructure','agriculture','environment','economy','security','governance','technology','other'];

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
        p.status, p.tags, p.created_at,
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
        u.username AS posted_by, u.id AS user_id
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
  const { title, description, scope, location_tag, tags } = req.body;
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
    const result = await pool.query(
      `INSERT INTO problems (user_id, title, description, scope, location_tag, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, scope, location_tag, status, tags, created_at`,
      [user_id, title, description, scope, location_tag, cleanTags]
    );

    return res.status(201).json({
      message: 'Problem posted successfully.',
      problem: result.rows[0],
    });

  } catch (err) {
    console.error('Post problem error:', err);
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
