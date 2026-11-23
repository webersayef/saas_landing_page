// Email: always queued into the outbox store collection first (so the
// billing flow is fully testable for free). Real sending happens only
// when RESEND_API_KEY is set; otherwise the mail stays 'queued'.
import { queueEmail, markEmailSent } from './store.js';

export async function sendEmail({ userId, to, kind, subject, body }) {
  const mail = queueEmail({ userId, to, kind, subject, body });
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return mail;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Shera IT <noreply@example.com>',
        to: [to], subject, text: body,
      }),
    });
    if (res.ok) {
      markEmailSent(mail.id);
      mail.status = 'sent';
    }
  } catch { /* stays queued — never break billing over email */ }
  return mail;
}
