import nodemailer, { type Transporter } from "nodemailer";
import { env, isProd } from "../config/env";
import { logger } from "../lib/logger";

const hasSmtpConfig = !!(
  env.SMTP_HOST &&
  env.SMTP_PORT &&
  env.SMTP_USER &&
  env.SMTP_PASSWORD
);

/**
 * If SMTP isn't configured (typical in development), emails are
 * logged instead of sent — mirroring the dev OTP pattern in
 * routes/auth.ts (devOtp / devResetToken). In production, env.ts
 * refuses to boot without SMTP_* set, so this path is unreachable
 * there.
 */
const transporter: Transporter | null = hasSmtpConfig
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : null;

if (!transporter && isProd) {
  // Should be unreachable — env.ts's production schema requires all
  // SMTP_* vars — but fail loudly rather than silently no-op-ing mail
  // in production if that invariant is ever weakened.
  throw new Error("SMTP is not configured but NODE_ENV=production");
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!transporter) {
    logger.info(
      { to: input.to, subject: input.subject },
      `[DEV EMAIL] Would send email (no SMTP configured):\n${input.text ?? input.html}`,
    );
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM ?? "Kaira Africa <no-reply@kairaafrica.com>",
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  resetUrl: string;
  expiresInMinutes: number;
}): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: "Reset your Kaira Africa admin password",
    text: `Reset your password: ${input.resetUrl}\nThis link expires in ${input.expiresInMinutes} minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <p>Someone requested a password reset for your Kaira Africa admin account.</p>
      <p><a href="${input.resetUrl}">Reset your password</a></p>
      <p>This link expires in ${input.expiresInMinutes} minutes. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

export async function sendAdminNotificationEmail(input: {
  to: string;
  subject: string;
  message: string;
}): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: input.subject,
    text: input.message,
    html: `<p>${input.message}</p>`,
  });
}

export async function verifyEmailTransport(): Promise<boolean> {
  if (!transporter) return false;
  try {
    await transporter.verify();
    return true;
  } catch (err) {
    logger.error({ err }, "SMTP transport verification failed");
    return false;
  }
}
