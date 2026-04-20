const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { sendPushToUser } = require('../utils/push');

const router = express.Router();

pool.query(`
  CREATE TABLE IF NOT EXISTS direct_messages (
    id           SERIAL PRIMARY KEY,
    sender_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content      TEXT NOT NULL,
    read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('Failed to create direct_messages table:', err));

// GET /api/messages — list all conversations
router.get('/', authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (other_id)
         other_id,
         u.username AS other_username,
         dm.content AS last_message,
         dm.created_at,
         dm.sender_id,
         (SELECT COUNT(*) FROM direct_messages
          WHERE recipient_id = $1 AND sender_id = other_id AND read = FALSE)::int AS unread
       FROM (
         SELECT CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS other_id, *
         FROM direct_messages WHERE sender_id = $1 OR recipient_id = $1
       ) dm
       JOIN users u ON u.id = dm.other_id
       ORDER BY other_id, dm.created_at DESC`,
      [user_id]
    );
    // Sort by most recent
    const conversations = result.rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json({ conversations });
  } catch (err) {
    console.error('List conversations error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/messages/unread-count
router.get('/unread-count', authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM direct_messages WHERE recipient_id = $1 AND read = FALSE',
      [user_id]
    );
    return res.json({ count: result.rows[0].count });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/messages/:username — conversation with a user
router.get('/:username', authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  const { username } = req.params;
  try {
    const other = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (other.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const other_id = other.rows[0].id;

    const messages = await pool.query(
      `SELECT dm.id, dm.content, dm.created_at, dm.sender_id, dm.read,
              u.username AS sender_username
       FROM direct_messages dm
       JOIN users u ON u.id = dm.sender_id
       WHERE (dm.sender_id = $1 AND dm.recipient_id = $2)
          OR (dm.sender_id = $2 AND dm.recipient_id = $1)
       ORDER BY dm.created_at ASC`,
      [user_id, other_id]
    );

    // Mark received messages as read
    await pool.query(
      'UPDATE direct_messages SET read = TRUE WHERE sender_id = $1 AND recipient_id = $2 AND read = FALSE',
      [other_id, user_id]
    );

    return res.json({ messages: messages.rows });
  } catch (err) {
    console.error('Get conversation error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/messages/:username — send a message
router.post('/:username', authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  const { username } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });
  if (content.length > 2000) return res.status(400).json({ error: 'Message must be under 2000 characters.' });

  try {
    const other = await pool.query('SELECT id, username FROM users WHERE username = $1', [username]);
    if (other.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const other_id = other.rows[0].id;
    if (other_id === user_id) return res.status(400).json({ error: 'You cannot message yourself.' });

    const result = await pool.query(
      `INSERT INTO direct_messages (sender_id, recipient_id, content)
       VALUES ($1, $2, $3) RETURNING id, content, created_at, sender_id, read`,
      [user_id, other_id, content.trim()]
    );
    const msg = result.rows[0];

    const sender = await pool.query('SELECT username FROM users WHERE id = $1', [user_id]);
    const senderName = sender.rows[0].username;

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    sendPushToUser(other_id, {
      title: `Message from ${senderName}`,
      body: content.trim().slice(0, 80),
      url: `${appUrl}/messages/${senderName}`,
    }).catch(() => {});

    return res.status(201).json({ message: { ...msg, sender_username: senderName } });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
