const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE')
  .catch(err => console.error('Failed to add google_id column:', err));

function callbackUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  return `${proto}://${req.get('host')}/api/auth/google/callback`;
}

// GET /api/auth/google
router.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(req),
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  if (!code) return res.redirect(`${appUrl}/login?error=oauth_cancelled`);

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl(req),
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('Google token exchange failed:', tokenData);
      return res.redirect(`${appUrl}/login?error=oauth_failed`);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json();

    if (!googleUser.email) return res.redirect(`${appUrl}/login?error=oauth_failed`);

    const existing = await pool.query(
      'SELECT * FROM users WHERE google_id = $1 OR email = $2',
      [googleUser.id, googleUser.email.toLowerCase()]
    );

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleUser.id, user.id]);
      }
    } else {
      let baseUsername = (googleUser.name || 'user')
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 20) || 'user';
      let username = baseUsername;
      let suffix = 1;
      while (true) {
        const taken = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (taken.rows.length === 0) break;
        username = `${baseUsername}${suffix++}`;
      }
      const result = await pool.query(
        `INSERT INTO users (username, email, google_id, password_hash, email_verified, preferred_language)
         VALUES ($1, $2, $3, 'GOOGLE_OAUTH', TRUE, 'en') RETURNING *`,
        [username, googleUser.email.toLowerCase(), googleUser.id]
      );
      user = result.rows[0];
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, preferred_language: user.preferred_language || 'en' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
      preferred_language: user.preferred_language || 'en',
      is_admin: user.is_admin || false,
      email_verified: true,
    }));

    res.redirect(`${appUrl}/auth/callback?token=${token}&user=${userData}`);
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.redirect(`${appUrl}/login?error=oauth_failed`);
  }
});

module.exports = router;
