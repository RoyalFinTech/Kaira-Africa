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
  messageId?: string;
}

async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!transporter) {
    // Never write one-time tokens or invitation links into logs.
    logger.info(
      { to: input.to, subject: input.subject },
      "[DEV EMAIL] Email not sent because SMTP is not configured",
    );
    return false;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM ?? "Kaira Africa <no-reply@kairaafrica.com>",
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    messageId: input.messageId,
  });
  return true;
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

export async function sendTeamInvitationEmail(input: {
  to: string;
  firstName: string;
  jobTitle: string;
  accessRole: string;
  businessName: string;
  inviterName: string;
  inviteUrl: string;
  expiresInDays: number;
}): Promise<boolean> {
  const safeFirstName = escapeHtml(input.firstName);
  const safeJobTitle = escapeHtml(input.jobTitle);
  const safeRole = escapeHtml(input.accessRole);
  const safeBusinessName = escapeHtml(input.businessName);
  const safeInviterName = escapeHtml(input.inviterName);
  const safeUrl = escapeHtml(input.inviteUrl);
  const text = "Hello " + input.firstName + ", " + input.inviterName +
    " invited you to join " + input.businessName + " on Kaira Africa as " +
    input.jobTitle + " (" + input.accessRole + "). Accept your invitation: " +
    input.inviteUrl + "\nSign in with the Gambian phone number this invitation was sent to. " +
    "This link expires in " + input.expiresInDays + " days.";
  return sendEmail({
    to: input.to,
    subject: "You are invited to join " + input.businessName.replace(/[\r\n]+/g, " ").slice(0, 120) + " on Kaira Africa",
    text,
    html: "<p>Hello " + safeFirstName + ",</p>" +
      "<p>" + safeInviterName + " invited you to join <strong>" + safeBusinessName +
      "</strong> on Kaira Africa.</p>" +
      "<p>Role: " + safeJobTitle + " · Kaira access: " + safeRole + "</p>" +
      "<p><a href=\"" + safeUrl + "\">Review and accept your invitation</a></p>" +
      "<p>Sign in with the Gambian phone number this invitation was sent to. " +
      "This link expires in " + input.expiresInDays + " days.</p>",
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

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\x27/g, "&#39;");
}

export function isEmailDeliveryConfigured(): boolean {
  return transporter !== null;
}

export async function sendTaskReminderEmail(input: {
  to: string;
  subject: string;
  message: string;
  actionUrl: string;
  messageId?: string;
}): Promise<boolean> {
  const safeMessage = escapeHtml(input.message);
  const baseUrl = env.FRONTEND_URL ?? (isProd ? "https://kaira-africa-frontend.onrender.com" : env.WEB_BASE_URL);
  const absoluteUrl = new URL(input.actionUrl, baseUrl).toString();
  const safeUrl = escapeHtml(absoluteUrl);
  return sendEmail({
    to: input.to,
    subject: input.subject,
    text: input.message + "\nOpen Kaira Africa: " + absoluteUrl,
    html: "<p>" + safeMessage + "</p><p><a href=\"" + safeUrl + "\">Open Kaira Africa</a></p>",
    messageId: input.messageId,
  });
}
