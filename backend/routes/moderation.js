const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { isModerator } = require('./groups');
const { logEvent } = require('../utils/events');

const router = express.Router();

// ─────────────────────────────────────────
// Helper — create a notification for a user
// ─────────────────────────────────────────
async function createNotification(user_id, type, reference_id, message) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, reference_id, message)
     VALUES ($1, $2, $3, $4)`,
    [user_id, type, reference_id, message]
  );
}

// ─────────────────────────────────────────
// Helper — notify all members of a group
// ─────────────────────────────────────────
async function notifyGroupMembers(group_id, exclude_user_id, type, reference_id, message) {
  const members = await pool.query(
    `SELECT user_id FROM group_members
     WHERE group_id = $1 AND user_id != $2`,
    [group_id, exclude_user_id]
  );

  for (const member of members.rows) {
    await createNotification(member.user_id, type, reference_id, message);
  }
}

// ─────────────────────────────────────────
// POST /api/moderation/groups/:groupId/solutions/:solutionId/implement
// Moderator only — mark a solution as implemented + credit contributors
// Body: { contributor_ids: [userId, userId, ...] }
// ─────────────────────────────────────────
router.post('/groups/:groupId/solutions/:solutionId/implement', authMiddleware, async (req, res) => {
  const group_id = parseInt(req.params.groupId);
  const solution_id = parseInt(req.params.solutionId);
  const moderator_id = req.user.id;
  const { contributor_ids = [] } = req.body;

  try {
    // Check moderator permission
    if (!await isModerator(group_id, moderator_id)) {
      return res.status(403).json({ error: 'Only moderators can mark solutions as implemented.' });
    }

    // Get the solution
    const solutionResult = await pool.query(
      'SELECT id, user_id, content FROM solutions WHERE id = $1',
      [solution_id]
    );
    if (solutionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Solution not found.' });
    }

    const solution = solutionResult.rows[0];

    // Mark as implemented
    await pool.query(
      'UPDATE solutions SET is_implemented = TRUE WHERE id = $1',
      [solution_id]
    );

    // Always credit the original poster first
    const allContributors = [solution.user_id, ...contributor_ids.filter(id => id !== solution.user_id)];

    for (const user_id of allContributors) {
      try {
        await pool.query(
          `INSERT INTO solution_credits (solution_id, user_id, credited_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (solution_id, user_id) DO NOTHING`,
          [solution_id, user_id, moderator_id]
        );

        // Notify each credited user
        await createNotification(
          user_id,
          'solution_implemented',
          solution_id,
          `Your contribution to a solution has been marked as implemented. Well done!`
        );
      } catch (err) {
        // Skip duplicate credits silently
      }
    }

    // Notify all group members
    await notifyGroupMembers(
      group_id,
      moderator_id,
      'solution_implemented',
      solution_id,
      `A solution in your group has been marked as implemented.`
    );

    logEvent(solution.problem_id, 'solution_implemented', `A solution was marked as implemented`);
    return res.status(200).json({ message: 'Solution marked as implemented and contributors credited.' });

  } catch (err) {
    console.error('Implement solution error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/moderation/groups/:groupId/solutions/:solutionId
// Moderator only — soft-remove an inappropriate solution
// ─────────────────────────────────────────
router.delete('/groups/:groupId/solutions/:solutionId', authMiddleware, async (req, res) => {
  const group_id = parseInt(req.params.groupId);
  const solution_id = parseInt(req.params.solutionId);
  const moderator_id = req.user.id;

  try {
    if (!await isModerator(group_id, moderator_id)) {
      return res.status(403).json({ error: 'Only moderators can remove contributions.' });
    }

    const result = await pool.query(
      'UPDATE solutions SET is_removed = TRUE WHERE id = $1 RETURNING id, user_id',
      [solution_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solution not found.' });
    }

    // Notify the author their contribution was removed
    await createNotification(
      result.rows[0].user_id,
      'contribution_removed',
      solution_id,
      'One of your contributions was removed by a moderator for violating community guidelines.'
    );

    return res.status(200).json({ message: 'Contribution removed.' });

  } catch (err) {
    console.error('Remove solution error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────
// Export the notification helpers for use in other routes
// ─────────────────────────────────────────
module.exports = router;
module.exports.createNotification = createNotification;
module.exports.notifyGroupMembers = notifyGroupMembers;
