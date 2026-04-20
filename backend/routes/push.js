const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/push/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// POST /api/push/subscribe
router.post('/subscribe', authMiddleware, async (req, res) => {
  const { endpoint, keys } = req.body;
  const user_id = req.user.id;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription.' });
  }

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
      [user_id, endpoint, keys.p256dh, keys.auth]
    );
    return res.json({ message: 'Subscribed.' });
  } catch (err) {
    console.error('Push subscribe error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', authMiddleware, async (req, res) => {
  const { endpoint } = req.body;
  const user_id = req.user.id;

  try {
    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [user_id, endpoint]
    );
    return res.json({ message: 'Unsubscribed.' });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
