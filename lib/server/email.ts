import nodemailer from 'nodemailer';

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || 'Traderlogify <support@traderlogify.online>';

  if (!host || !user || !pass) return null;

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from,
  };
}

export async function sendPasswordResetEmail({
  to,
  resetToken,
}: {
  to: string;
  resetToken: string;
}) {
  const resetUrl = `${getSiteUrl().replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const smtp = getSmtpConfig();

  if (!smtp) {
    console.info('[password-reset] SMTP not configured. Reset link:', { to, resetUrl });
    return { delivered: false as const, resetUrl };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: 'Reset your Traderlogify password',
    text: [
      'We received a request to reset your Traderlogify password.',
      '',
      `Reset your password: ${resetUrl}`,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <p>We received a request to reset your Traderlogify password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });

  return { delivered: true as const, resetUrl };
}
