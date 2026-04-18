const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────
// Helper — check if a user is a moderator of a group
// ─────────────────────────────────────────
async function isModerator(group_id, user_id) {
  const result = await pool.query(
    `SELECT id FROM group_members
     WHERE group_id = $1 AND user_id = $2 AND role = 'moderator'`,
    [group_id, user_id]
  );
  return result.rows.length > 0;
}

// ─────────────────────────────────────────
// POST /api/groups
// Protected — create a group linked to a problem
// Creator automatically becomes moderator
// ─────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { problem_id, name, description } = req.body;
  const user_id = req.user.id;

  if (!problem_id || !name) {
    return res.status(400).json({ error: 'Problem ID and group name are required.' });
  }

  try {
    // Check problem exists
    const problem = await pool.query('SELECT id FROM problems WHERE id = $1', [problem_id]);
    if (problem.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    // Create the group
    const groupResult = await pool.query(
      `INSERT INTO groups (problem_id, created_by, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, created_at`,
      [problem_id, user_id, name, description || null]
    );

    const group = groupResult.rows[0];

    // Add creator as moderator
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'moderator')`,
      [group.id, user_id]
    );

    return res.status(201).json({
      message: 'Group created successfully.',
      group,
    });

  } catch (err) {
    console.error('Create group error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// GET /api/groups/:id
// Public — get group details, members, and linked problem
// ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const groupResult = await pool.query(
      `SELECT
        g.id, g.name, g.description, g.created_at,
        p.id AS problem_id, p.title AS problem_title,
        p.scope, p.location_tag,
        u.username AS created_by
       FROM groups g
       JOIN problems p ON p.id = g.problem_id
       JOIN users u ON u.id = g.created_by
       WHERE g.id = $1`,
      [id]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const membersResult = await pool.query(
      `SELECT u.id, u.username, gm.role, gm.joined_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.role DESC, gm.joined_at ASC`,
      [id]
    );

    return res.status(200).json({
      group: groupResult.rows[0],
      members: membersResult.rows,
      member_count: membersResult.rows.length,
    });

  } catch (err) {
    console.error('Get group error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// GET /api/groups?problem_id=:id
// Public — get all groups for a specific problem
// ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const { problem_id } = req.query;

  if (!problem_id) {
    return res.status(400).json({ error: 'problem_id query parameter is required.' });
  }

  try {
    const result = await pool.query(
      `SELECT
        g.id, g.name, g.description, g.created_at,
        u.username AS created_by,
        COUNT(gm.id) AS member_count
       FROM groups g
       JOIN users u ON u.id = g.created_by
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE g.problem_id = $1
       GROUP BY g.id, u.username
       ORDER BY g.created_at DESC`,
      [problem_id]
    );

    return res.status(200).json({ groups: result.rows });

  } catch (err) {
    console.error('Get groups error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// POST /api/groups/:id/join
// Protected — any member can join an open group
// ─────────────────────────────────────────
router.post('/:id/join', authMiddleware, async (req, res) => {
  const group_id = parseInt(req.params.id);
  const user_id = req.user.id;

  try {
    const group = await pool.query('SELECT id FROM groups WHERE id = $1', [group_id]);
    if (group.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    // Check already a member
    const existing = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You are already a member of this group.' });
    }

    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'member')`,
      [group_id, user_id]
    );

    return res.status(200).json({ message: 'Joined group successfully.' });

  } catch (err) {
    console.error('Join group error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// POST /api/groups/:id/leave
// Protected — members can leave a group
// ─────────────────────────────────────────
router.post('/:id/leave', authMiddleware, async (req, res) => {
  const group_id = parseInt(req.params.id);
  const user_id = req.user.id;

  try {
    // Prevent the original creator from leaving
    const group = await pool.query('SELECT created_by FROM groups WHERE id = $1', [group_id]);
    if (group.rows[0].created_by === user_id) {
      return res.status(403).json({ error: 'Group creator cannot leave. Transfer ownership first.' });
    }

    const result = await pool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING id',
      [group_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'You are not a member of this group.' });
    }

    return res.status(200).json({ message: 'Left group successfully.' });

  } catch (err) {
    console.error('Leave group error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// POST /api/groups/:id/moderators
// Protected — moderator only — assign another member as moderator
// ─────────────────────────────────────────
router.post('/:id/moderators', authMiddleware, async (req, res) => {
  const group_id = parseInt(req.params.id);
  const requesting_user = req.user.id;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required.' });
  }

  try {
    // Check requester is a moderator
    if (!await isModerator(group_id, requesting_user)) {
      return res.status(403).json({ error: 'Only moderators can assign other moderators.' });
    }

    // Check target user is a member
    const member = await pool.query(
      'SELECT id, role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, user_id]
    );

    if (member.rows.length === 0) {
      return res.status(404).json({ error: 'User is not a member of this group.' });
    }

    if (member.rows[0].role === 'moderator') {
      return res.status(409).json({ error: 'User is already a moderator.' });
    }

    await pool.query(
      `UPDATE group_members SET role = 'moderator' WHERE group_id = $1 AND user_id = $2`,
      [group_id, user_id]
    );

    return res.status(200).json({ message: 'User assigned as moderator.' });

  } catch (err) {
    console.error('Assign moderator error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
module.exports.isModerator = isModerator;
