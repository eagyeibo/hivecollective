const pool = require('../db');

pool.query(`
  CREATE TABLE IF NOT EXISTS problem_events (
    id          SERIAL PRIMARY KEY,
    problem_id  INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('Failed to create problem_events table:', err));

async function logEvent(problemId, eventType, description) {
  try {
    await pool.query(
      'INSERT INTO problem_events (problem_id, event_type, description) VALUES ($1, $2, $3)',
      [problemId, eventType, description]
    );
  } catch (err) {
    console.error('logEvent error:', err);
  }
}

module.exports = { logEvent };
