const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const VALID_REASONS = [
  'spam',
  'inappropriate',
  'misinformation',
  'harassment',
  'off_topic',
  'other',
];

// ─────────────────────────────────────────
// POST /api/reports
// Protected — any logged-in user can file a report
// ─────────────────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { type, reference_id, reason, notes } = req.body;
  const reporter_id = req.user.id;

  if (!['problem', 'solution', 'comment'].includes(type)) {
    return res.status(400).json({ error: 'Type must be problem, solution, or comment.' });
  }
  if (!reference_id) {
    return res.status(400).json({ error: 'reference_id is required.' });
  }
  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: 'Invalid reason.' });
  }

  try {
    // Prevent duplicate reports from the same user on same content
    const existing = await pool.query(
      'SELECT id FROM reports WHERE reporter_id = $1 AND type = $2 AND reference_id = $3',
      [reporter_id, type, reference_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reported this content.' });
    }

    await pool.query(
      `INSERT INTO reports (reporter_id, type, reference_id, reason, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [reporter_id, type, reference_id, reason, notes?.trim() || null]
    );

    return res.status(201).json({ message: 'Report submitted. Thank you.' });
  } catch (err) {
    console.error('Report error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
