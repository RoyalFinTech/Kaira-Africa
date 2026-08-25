import { Router, type IRouter } from "express";
import {
  GetMeResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  RequestOtpBody,
  RequestOtpResponse,
  VerifyOtpBody,
  VerifyOtpResponse,
  AdminLoginBody,
  AdminLoginResponse,
  ChangePasswordBody,
  RequestPasswordResetBody,
  RequestPasswordResetResponse,
  ResetPasswordBody,
} from "@workspace/api-zod";
import {
  requireUser,
  requireAdmin,
  requireAnySession,
} from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { rateLimit, requestBodyKey, ipKey } from "../middlewares/rate-limit";
import {
  getUserById,
  updateUserProfile,
  findOrCreateUserByPhone,
  touchLastLogin,
} from "../repositories/users";
import {
  createOtp,
  getActiveOtp,
  getMostRecentOtp,
  incrementOtpAttempts,
  consumeOtp,
} from "../repositories/otp";
import {
  createUserSession,
  createAdminSession,
  revokeUserSession,
  revokeAdminSession,
  revokeAllUserSessions,
  revokeAllAdminSessions,
} from "../repositories/sessions";
import {
  getAdminByEmail,
  recordFailedLogin,
  resetFailedLogins,
  updateAdminPassword,
  isLocked,
} from "../repositories/admin-users";
import {
  createPasswordReset,
  getActivePasswordReset,
  consumePasswordReset,
} from "../repositories/admin-password-resets";
import { recordAuthEvent } from "../repositories/auth-audit";
import { NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError } from "../lib/http-errors";
import { normalizeGambianPhone } from "../lib/phone";
import { generateOtp, hashOtp, OTP_TTL_MINUTES, OTP_RESEND_COOLDOWN_SECONDS } from "../lib/otp";
import { generateSessionToken, hashToken, hashResetToken, tokenKind } from "../lib/tokens";
import { hashPassword, verifyPassword, validatePasswordComplexity } from "../lib/password";
import { sendOtpSms } from "../services/sms.service";
import { sendPasswordResetEmail } from "../services/email.service";
import { env, isProd } from "../config/env";
import type { User } from "@workspace/db";

const router: IRouter = Router();

const IS_PRODUCTION = isProd;
const USER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: `${user.phoneCountryCode}${user.phoneNumber}`,
    avatarUrl: user.avatarUrl,
    role: user.role,
    businessId: user.businessId,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

// ─── Existing profile endpoints (unchanged) ─────────────────────────────────

router.get("/auth/me", requireUser, async (req, res) => {
  const user = await getUserById(req.user!.id);
  if (!user) throw new NotFoundError("User not found");
  res.json(GetMeResponse.parse(serializeUser(user)));
});

router.patch(
  "/auth/profile",
  requireUser,
  validate({ body: UpdateProfileBody }),
  async (req, res) => {
    const updated = await updateUserProfile(req.user!.id, {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      avatarUrl: req.body.avatarUrl,
    });
    if (!updated) throw new NotFoundError("User not found");
    res.json(UpdateProfileResponse.parse(serializeUser(updated)));
  },
);

// ─── Phone + OTP (business users) ───────────────────────────────────────────

router.post(
  "/auth/request-otp",
  rateLimit({ scope: "otp_request_ip", windowMs: 60 * 60 * 1000, max: 8, keyFn: ipKey, message: "Too many OTP requests from this device." }),
  rateLimit({ scope: "otp_request_phone", windowMs: 60 * 60 * 1000, max: 5, keyFn: requestBodyKey("phoneNumber"), message: "Too many OTP requests for this number." }),
  validate({ body: RequestOtpBody }),
  async (req, res) => {
    const { countryCode, number } = normalizeGambianPhone(req.body.phoneNumber);

    const mostRecent = await getMostRecentOtp(countryCode, number);
    if (
      mostRecent &&
      Date.now() - mostRecent.createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000
    ) {
      throw new BadRequestError(
        `Please wait a moment before requesting another code.`,
      );
    }

    const code = generateOtp();
    const codeHash = hashOtp(code, `${countryCode}${number}`);
    await createOtp({
      phoneCountryCode: countryCode,
      phoneNumber: number,
      codeHash,
      purpose: "login",
    });

    // Actually goes through the SMS provider abstraction now — in
    // development/staging (SMS_PROVIDER=mock) this logs instead of
    // sending; in production it calls the configured real provider.
    // Not swallowed: if a real provider genuinely fails to deliver,
    // the request should fail rather than falsely report success.
    await sendOtpSms({ to: `${countryCode}${number}`, code });

    await recordAuthEvent({
      actorType: "unknown",
      event: "otp_requested",
      success: true,
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
      metadata: { phone: `${countryCode}${number}` },
    });

    res.json(
      RequestOtpResponse.parse({
        phoneNumber: `${countryCode}${number}`,
        expiresInSeconds: OTP_TTL_MINUTES * 60,
        devOtp: IS_PRODUCTION ? null : code,
      }),
    );
  },
);

router.post(
  "/auth/verify-otp",
  rateLimit({ scope: "otp_verify_ip", windowMs: 15 * 60 * 1000, max: 10, keyFn: ipKey, message: "Too many attempts from this device." }),
  validate({ body: VerifyOtpBody }),
  async (req, res) => {
    const { countryCode, number } = normalizeGambianPhone(req.body.phoneNumber);
    const phoneKey = `${countryCode}${number}`;

    const otp = await getActiveOtp(countryCode, number);
    if (!otp) {
      await recordAuthEvent({
        actorType: "unknown",
        event: "otp_verify_failed",
        success: false,
        ipAddress: req.ip,
        metadata: { phone: phoneKey, reason: "no_active_otp" },
      });
      throw new BadRequestError("This code has expired — request a new one.");
    }

    if (otp.attempts >= otp.maxAttempts) {
      throw new BadRequestError("Too many incorrect attempts — request a new code.");
    }

    const expectedHash = hashOtp(req.body.code, phoneKey);
    if (expectedHash !== otp.codeHash) {
      await incrementOtpAttempts(otp.id);
      await recordAuthEvent({
        actorType: "unknown",
        event: "otp_verify_failed",
        success: false,
        ipAddress: req.ip,
        metadata: { phone: phoneKey, reason: "code_mismatch" },
      });
      throw new BadRequestError("Incorrect code — please try again.");
    }

    await consumeOtp(otp.id);

    const { user, isNewUser } = await findOrCreateUserByPhone(countryCode, number);
    await touchLastLogin(user.id);

    const rawToken = generateSessionToken("usr");
    await createUserSession({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + USER_SESSION_TTL_MS),
      userAgent: req.header("user-agent") ?? null,
      ipAddress: req.ip ?? null,
    });

    await recordAuthEvent({
      actorType: "user",
      actorId: user.id,
      event: isNewUser ? "signup" : "login",
      success: true,
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
    });

    const refreshedUser = (await getUserById(user.id))!;
    res.json(
      VerifyOtpResponse.parse({
        token: rawToken,
        isNewUser,
        user: serializeUser(refreshedUser),
      }),
    );
  },
);

// ─── Session management (works for either token type) ──────────────────────

router.post("/auth/logout", requireAnySession, async (req, res) => {
  if (tokenKind(req.header("authorization")!.slice(7)) === "usr") {
    await revokeUserSession(req.sessionTokenHash!);
  } else {
    await revokeAdminSession(req.sessionTokenHash!);
  }
  res.status(204).end();
});

router.post("/auth/logout-all", requireAnySession, async (req, res) => {
  if (req.user) {
    await revokeAllUserSessions(req.user.id);
  } else if (req.admin) {
    await revokeAllAdminSessions(req.admin.id);
  }
  res.status(204).end();
});

// ─── Admin auth (email + password, entirely separate surface) ──────────────

router.post(
  "/auth/login",
  rateLimit({ scope: "admin_login_ip", windowMs: 15 * 60 * 1000, max: 20, keyFn: ipKey, message: "Too many login attempts from this device." }),
  rateLimit({ scope: "admin_login_email", windowMs: 15 * 60 * 1000, max: 8, keyFn: requestBodyKey("email"), message: "Too many login attempts for this account." }),
  validate({ body: AdminLoginBody }),
  async (req, res) => {
    const admin = await getAdminByEmail(req.body.email);

    // Constant-shape failure path regardless of whether the email
    // exists, to avoid leaking account existence via response
    // differences (timing is still not perfectly constant since we
    // skip the argon2 verify entirely when there's no admin — that's
    // an accepted tradeoff here rather than hashing a dummy password
    // on every miss, which would meaningfully slow every failed
    // request for likely-fake emails).
    if (!admin) {
      await recordAuthEvent({
        actorType: "unknown",
        event: "admin_login_failed",
        success: false,
        ipAddress: req.ip,
        metadata: { email: req.body.email, reason: "no_such_account" },
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    if (isLocked(admin)) {
      await recordAuthEvent({
        actorType: "admin",
        actorId: admin.id,
        event: "admin_login_blocked",
        success: false,
        ipAddress: req.ip,
        metadata: { reason: "locked" },
      });
      throw new ForbiddenError(
        "This account is temporarily locked due to repeated failed attempts. Try again later.",
      );
    }
    if (admin.status !== "active") {
      throw new ForbiddenError("This administrator account is restricted");
    }

    const validPassword = await verifyPassword(admin.passwordHash, req.body.password);
    if (!validPassword) {
      await recordFailedLogin(admin.id);
      await recordAuthEvent({
        actorType: "admin",
        actorId: admin.id,
        event: "admin_login_failed",
        success: false,
        ipAddress: req.ip,
        metadata: { reason: "bad_password" },
      });
      throw new UnauthorizedError("Invalid email or password");
    }

    await resetFailedLogins(admin.id);

    const rawToken = generateSessionToken("adm");
    await createAdminSession({
      adminUserId: admin.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
      userAgent: req.header("user-agent") ?? null,
      ipAddress: req.ip ?? null,
    });

    await recordAuthEvent({
      actorType: "admin",
      actorId: admin.id,
      event: "admin_login",
      success: true,
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
    });

    res.json(
      AdminLoginResponse.parse({
        token: rawToken,
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
        },
      }),
    );
  },
);

router.post(
  "/auth/change-password",
  requireAdmin,
  validate({ body: ChangePasswordBody }),
  async (req, res) => {
    const admin = await getAdminByEmail(req.admin!.email);
    if (!admin) throw new NotFoundError("Admin not found");

    const validCurrent = await verifyPassword(admin.passwordHash, req.body.currentPassword);
    if (!validCurrent) {
      throw new BadRequestError("Current password is incorrect");
    }

    validatePasswordComplexity(req.body.newPassword);
    const newHash = await hashPassword(req.body.newPassword);
    await updateAdminPassword(admin.id, newHash);

    // Revoke every other session — the current one gets a fresh token
    // implicitly by the client re-logging in, matching common
    // "changing your password signs you out everywhere" behavior.
    await revokeAllAdminSessions(admin.id);

    await recordAuthEvent({
      actorType: "admin",
      actorId: admin.id,
      event: "admin_password_changed",
      success: true,
      ipAddress: req.ip,
    });

    res.status(204).end();
  },
);

router.post(
  "/auth/request-password-reset",
  rateLimit({ scope: "password_reset_email", windowMs: 60 * 60 * 1000, max: 5, keyFn: requestBodyKey("email"), message: "Too many reset requests for this account." }),
  validate({ body: RequestPasswordResetBody }),
  async (req, res) => {
    const admin = await getAdminByEmail(req.body.email);

    let devResetToken: string | null = null;
    if (admin) {
      const rawToken = generateSessionToken("adm").replace("adm_", "reset_");
      await createPasswordReset(admin.id, hashResetToken(rawToken));
      // Actually goes through the email service now — in development
      // (no SMTP_* configured) this logs instead of sending; in
      // production it sends a real email via the configured SMTP
      // transport. Not swallowed: a real delivery failure should
      // surface as an error, not a false "sent: true".
      const resetUrl = `${env.WEB_BASE_URL}/admin/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail({
        to: admin.email,
        resetUrl,
        expiresInMinutes: 30,
      });
      devResetToken = IS_PRODUCTION ? null : rawToken;

      await recordAuthEvent({
        actorType: "admin",
        actorId: admin.id,
        event: "admin_password_reset_requested",
        success: true,
        ipAddress: req.ip,
      });
    }

    // Always 200 with the same response shape whether or not the
    // account exists, to avoid leaking which emails are registered.
    res.json(RequestPasswordResetResponse.parse({ sent: true, devResetToken }));
  },
);

router.post(
  "/auth/reset-password",
  validate({ body: ResetPasswordBody }),
  async (req, res) => {
    const tokenHash = hashResetToken(req.body.token);
    const reset = await getActivePasswordReset(tokenHash);
    if (!reset) {
      throw new BadRequestError("This reset link is invalid or has expired");
    }

    validatePasswordComplexity(req.body.newPassword);
    const newHash = await hashPassword(req.body.newPassword);
    await updateAdminPassword(reset.adminUserId, newHash);
    await consumePasswordReset(reset.id);
    await revokeAllAdminSessions(reset.adminUserId);

    await recordAuthEvent({
      actorType: "admin",
      actorId: reset.adminUserId,
      event: "admin_password_reset_completed",
      success: true,
      ipAddress: req.ip,
    });

    res.status(204).end();
  },
);

export default router;
