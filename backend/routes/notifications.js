const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────
// GET /api/notifications
// Protected — returns notifications for logged-in user
// Unread first, then read, max 50
// ─────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT id, type, reference_id, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY is_read ASC, created_at DESC
       LIMIT 50`,
      [user_id]
    );

    const unread_count = result.rows.filter(n => !n.is_read).length;

    return res.status(200).json({
      notifications: result.rows,
      unread_count,
    });

  } catch (err) {
    console.error('Get notifications error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// PUT /api/notifications/:id/read
// Protected — mark a single notification as read
// ─────────────────────────────────────────
router.put('/:id/read', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    return res.status(200).json({ message: 'Notification marked as read.' });

  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// PUT /api/notifications/read-all
// Protected — mark all notifications as read
// ─────────────────────────────────────────
router.put('/read-all', authMiddleware, async (req, res) => {
  const user_id = req.user.id;

  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [user_id]
    );

    return res.status(200).json({ message: 'All notifications marked as read.' });

  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
