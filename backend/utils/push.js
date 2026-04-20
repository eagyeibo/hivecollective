const webpush = require('web-push');
const pool = require('../db');

pool.query(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('Failed to create push_subscriptions table:', err));

function getWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return null;
  webpush.setVapidDetails(
    'mailto:hivecollective4@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return webpush;
}

async function sendPushToUser(userId, payload) {
  const wp = getWebPush();
  if (!wp) return;

  const subs = await pool.query(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );

  for (const sub of subs.rows) {
    try {
      await wp.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
      }
    }
  }
}

module.exports = { sendPushToUser };
