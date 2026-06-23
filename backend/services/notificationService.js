const twilio = require('twilio');

// ─────────────────────────────────────────────
// SMS via Twilio
// ─────────────────────────────────────────────
const sendSms = async (to, body) => {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    console.log(`[SMS] Twilio not configured. Would send to ${to}: "${body}"`);
    return { sid: 'dev-sms', status: 'skipped', body };
  }

  try {
    const client = twilio(sid, token);
    const msg = await client.messages.create({ to, from, body });
    console.log(`[SMS] Sent to ${to} — SID: ${msg.sid}`);
    return { sid: msg.sid, status: msg.status };
  } catch (err) {
    console.error(`[SMS] Failed to send to ${to}:`, err.message);
    return { error: err.message };
  }
};

// ─────────────────────────────────────────────
// Email via nodemailer (SMTP)
// ─────────────────────────────────────────────
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return transporter;
  } catch (err) {
    console.warn('[Email] nodemailer not available:', err.message);
    return null;
  }
};

const sendEmail = async (to, subject, html, text) => {
  if (!to) {
    console.log(`[Email] No recipient address provided — skipping.`);
    return { status: 'skipped', reason: 'no-email' };
  }

  const t = getTransporter();
  if (!t) {
    console.log(`[Email] SMTP not configured. Would send "${subject}" to ${to}`);
    return { status: 'skipped', reason: 'smtp-not-configured' };
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const info = await t.sendMail({ from, to, subject, html, text });
    console.log(`[Email] Sent "${subject}" to ${to} — MessageID: ${info.messageId}`);
    return { messageId: info.messageId, status: 'sent' };
  } catch (err) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message);
    return { error: err.message };
  }
};

// ─────────────────────────────────────────────
// Browser / In-App notification (console log)
// Used as fallback and logged for debugging
// ─────────────────────────────────────────────
const logInApp = (userId, message) => {
  console.log(`[InApp] User #${userId}: ${message}`);
};

// ─────────────────────────────────────────────
// Master: send event due alert via all channels
// ─────────────────────────────────────────────
const sendEventDueAlert = async ({ user, event, daysLeft }) => {
  const isToday = daysLeft === 0;
  const isPast  = daysLeft < 0;

  const timeLabel = isPast
    ? `was due ${Math.abs(daysLeft)} day(s) ago`
    : isToday
    ? 'is due TODAY'
    : `is due in ${daysLeft} day(s)`;

  const shortMsg = `📅 Cluster Suite Alert: Your event "${event.name}" ${timeLabel}. Budget: ${event.budget_goal}, Saved: ${event.current_savings}.`;

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
      <h2 style="color:#6366f1">📅 Event Reminder — Cluster Suite</h2>
      <p>Hello <strong>${user.username}</strong>,</p>
      <p>Your event <strong>"${event.name}"</strong> <span style="color:${isToday || isPast ? '#ef4444' : '#f59e0b'}">${timeLabel}</span>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f8fafc">
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Event Date</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${event.date || 'Not set'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Budget Goal</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${event.budget_goal}</td>
        </tr>
        <tr style="background:#f8fafc">
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Current Savings</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${event.current_savings}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600">Progress</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${event.budget_goal > 0 ? ((event.current_savings / event.budget_goal) * 100).toFixed(1) : 0}%</td>
        </tr>
      </table>
      ${event.notes ? `<p style="color:#64748b;font-size:14px">Notes: ${event.notes}</p>` : ''}
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">This alert was sent automatically by Cluster Suite.</p>
    </div>
  `;

  const results = {};

  // 1️⃣ SMS
  if (user.phone) {
    results.sms = await sendSms(user.phone, shortMsg);
  } else {
    results.sms = { status: 'skipped', reason: 'no-phone' };
  }

  // 2️⃣ Email
  results.email = await sendEmail(
    user.email,
    `📅 Event Reminder: "${event.name}" ${timeLabel}`,
    htmlBody,
    shortMsg
  );

  // 3️⃣ In-app / console log (always fires)
  logInApp(user.id, shortMsg);
  results.inApp = { status: 'logged' };

  return results;
};

module.exports = { sendSms, sendEmail, logInApp, sendEventDueAlert };
