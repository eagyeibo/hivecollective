const { Resend } = require('resend');
const pool = require('../db');

function getResend() { return new Resend(process.env.RESEND_API_KEY); }
const EMAIL_FROM = process.env.EMAIL_FROM || 'HiveCollective <onboarding@resend.dev>';

async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) return;
  await getResend().emails.send({ from: EMAIL_FROM, to, subject, html });
}

async function sendNotificationEmail(userId, subject, bodyHtml) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const result = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return;
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 24px;background:#0d0d14;color:#e2e0f0;border-radius:12px;">
        <div style="font-size:18px;font-weight:600;color:#a78bfa;margin-bottom:20px;">HiveCollective</div>
        ${bodyHtml}
        <div style="margin-top:24px;padding-top:16px;border-top:0.5px solid rgba(255,255,255,0.08);font-size:11px;color:#444;">
          <a href="${appUrl}" style="color:#7c3aed;text-decoration:none;">HiveCollective</a> ·
          <a href="${appUrl}/settings" style="color:#555;text-decoration:none;">Manage notifications</a>
        </div>
      </div>`;
    await sendEmail(result.rows[0].email, subject, html);
  } catch (err) {
    console.error('sendNotificationEmail error:', err.message);
  }
}

module.exports = { sendEmail, sendNotificationEmail };
