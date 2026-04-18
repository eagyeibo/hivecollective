const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../db');

// Auto-create password_reset_tokens table
pool.query(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('Failed to create password_reset_tokens table:', err));

function createMailTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const router = express.Router();
const SALT_ROUNDS = 12;
const VALID_LANGUAGES = ['en', 'fr', 'es', 'sw', 'ha', 'ar', 'pt', 'ak'];

// ─────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { username, email, password, preferred_language = 'en' } = req.body;

  // 1. Validate required fields
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  // 2. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  // 3. Validate password strength
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  // 4. Validate language
  if (!VALID_LANGUAGES.includes(preferred_language)) {
    return res.status(400).json({ error: 'Invalid language code.' });
  }

  try {
    // 5. Check if email or username already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username is already taken.' });
    }

    // 6. Hash the password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 7. Insert new user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, preferred_language)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, preferred_language, created_at`,
      [username, email.toLowerCase(), password_hash, preferred_language]
    );

    const user = result.rows[0];

    // 8. Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, preferred_language: user.preferred_language },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        preferred_language: user.preferred_language,
        created_at: user.created_at,
      },
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // 1. Validate required fields
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // 2. Look up user by email
    const result = await pool.query(
      'SELECT id, username, email, password_hash, preferred_language, is_admin FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Use a generic message — never reveal whether email exists
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // 3. Compare password against stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 4. Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, preferred_language: user.preferred_language },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        preferred_language: user.preferred_language,
        is_admin: user.is_admin,
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────
// GET /api/auth/me  (protected route example)
// Returns the currently logged-in user's profile
// ─────────────────────────────────────────
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, preferred_language, is_admin, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// PUT /api/auth/me
// Protected — update username and/or preferred_language
// ─────────────────────────────────────────
router.put('/me', authMiddleware, async (req, res) => {
  const { username, preferred_language } = req.body;
  const user_id = req.user.id;

  if (username !== undefined) {
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3–50 characters and contain only letters, numbers, and underscores.' });
    }
    const taken = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, user_id]
    );
    if (taken.rows.length > 0) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }
  }

  if (preferred_language !== undefined && !VALID_LANGUAGES.includes(preferred_language)) {
    return res.status(400).json({ error: 'Invalid language code.' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET username           = COALESCE($1, username),
           preferred_language = COALESCE($2, preferred_language)
       WHERE id = $3
       RETURNING id, username, email, preferred_language, is_admin, created_at`,
      [username ?? null, preferred_language ?? null, user_id]
    );
    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Update me error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// PUT /api/auth/password
// Protected — change password (requires current password)
// ─────────────────────────────────────────
router.put('/password', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  const user_id = req.user.id;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user_id]
    );
    const match = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const new_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [new_hash, user_id]);

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/auth/me
// Protected — delete own account (requires password confirmation)
// Solutions are reassigned to an anonymous placeholder user
// ─────────────────────────────────────────
router.delete('/me', authMiddleware, async (req, res) => {
  const { password } = req.body;
  const user_id = req.user.id;

  if (!password) {
    return res.status(400).json({ error: 'Password is required to delete your account.' });
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [user_id]
    );
    const match = await bcrypt.compare(password, result.rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    // Ensure a placeholder "deleted" user exists to receive orphaned solutions
    let placeholderResult = await pool.query(
      "SELECT id FROM users WHERE username = '[deleted]'"
    );
    let placeholderId;
    if (placeholderResult.rows.length === 0) {
      const ph = await pool.query(
        `INSERT INTO users (username, email, password_hash, preferred_language)
         VALUES ('[deleted]', 'deleted@hivecollective.internal', 'DISABLED', 'en')
         RETURNING id`
      );
      placeholderId = ph.rows[0].id;
    } else {
      placeholderId = placeholderResult.rows[0].id;
    }

    // Reassign solutions to placeholder before deleting user
    await pool.query(
      'UPDATE solutions SET user_id = $1 WHERE user_id = $2',
      [placeholderId, user_id]
    );

    // Delete the user (cascades: problems, votes, groups, bookmarks, notifications, etc.)
    await pool.query('DELETE FROM users WHERE id = $1', [user_id]);

    return res.json({ message: 'Account deleted.' });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/forgot-password
// Sends a password-reset email with a 1-hour token
// ─────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const result = await pool.query(
      'SELECT id, username FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return 200 so we don't leak whether an email exists
    if (result.rows.length === 0) {
      return res.json({ message: 'If that email is registered, you will receive a reset link shortly.' });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing tokens for this user, then insert new one
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // Fire-and-forget — don't block the response on SMTP
    try {
      const transport = createMailTransport();
      transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Reset your HiveCollective password',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0d0d14;color:#e2e0f0;border-radius:12px;">
            <div style="font-size:22px;font-weight:600;color:#a78bfa;margin-bottom:8px;">HiveCollective</div>
            <h2 style="font-size:18px;font-weight:500;margin:0 0 16px;">Password Reset</h2>
            <p style="font-size:14px;color:#aaa;line-height:1.6;margin-bottom:24px;">
              Hi <strong style="color:#e2e0f0;">${user.username}</strong>,<br><br>
              We received a request to reset your password. Click the button below to choose a new one.
              This link expires in <strong>1 hour</strong>.
            </p>
            <a href="${resetLink}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;">
              Reset Password
            </a>
            <p style="font-size:12px;color:#555;margin-top:24px;line-height:1.5;">
              If you didn't request this, you can safely ignore this email.
              Your password will not change until you click the link above and create a new one.
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error('Password reset email failed (SMTP not configured?):', mailErr.message);
    }

    return res.json({ message: 'If that email is registered, you will receive a reset link shortly.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/reset-password
// Verifies the token and sets a new password
// ─────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await pool.query(
      `SELECT prt.user_id, prt.id AS token_id
       FROM password_reset_tokens prt
       WHERE prt.token_hash = $1 AND prt.expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }

    const { user_id, token_id } = result.rows[0];
    const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user_id]);
    await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [token_id]);

    return res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
