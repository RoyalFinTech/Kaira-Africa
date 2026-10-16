import { Router, type IRouter, type Request } from "express";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
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
  getUserByPhone,
  updateUserPinHash,
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
import { NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError, HttpError } from "../lib/http-errors";
import { normalizeGambianPhone } from "../lib/phone";
import { generateOtp, hashOtp, OTP_TTL_MINUTES, OTP_RESEND_COOLDOWN_SECONDS } from "../lib/otp";
import { generateSessionToken, hashToken, hashResetToken, tokenKind } from "../lib/tokens";
import { hashPassword, verifyPassword, validatePasswordComplexity } from "../lib/password";
import { hashPin, isSixDigitPin, isStrongPin, verifyPin } from "../lib/pin";
import { sendOtpSms } from "../services/sms.service";
import { sendPasswordResetEmail } from "../services/email.service";
import { env, isProd } from "../config/env";
import { hasSupabaseStorageConfig, requireSupabaseStorageConfig } from "../lib/supabase-storage";
import { supabaseStorageHeaders } from "../lib/supabase-storage-headers";
import { logger } from "../lib/logger";
import { db, users, type User } from "@workspace/db";

const router: IRouter = Router();

const IS_PRODUCTION = isProd;
const USER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const PinLoginBody = z.object({
  phoneNumber: z.string().min(1),
  pin: z.string().refine(isSixDigitPin, "Enter your six-digit PIN."),
});

const SetPinBody = z.object({
  pin: z.string().refine(
    isStrongPin,
    "Choose six digits that are not all the same or sequential.",
  ),
  currentPin: z.string().refine(
    isSixDigitPin,
    "Enter your current six-digit PIN.",
  ).optional(),
});

function pinPhoneKey(req: Request): string {
  const raw = String((req.body as Record<string, unknown> | undefined)?.phoneNumber ?? "");
  try {
    const { countryCode, number } = normalizeGambianPhone(raw);
    return `${countryCode}${number}`;
  } catch {
    // Invalid input still receives an IP-based limit; normalizing here must not
    // throw before the request's schema/phone validation can return its message.
    return raw.replace(/\D/g, "").slice(-16) || "invalid";
  }
}

async function signProfileAvatar(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (!hasSupabaseStorageConfig()) return null;

  try {
    const { base, key } = requireSupabaseStorageConfig("Profile photo storage");
    const objectPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${base}/storage/v1/object/sign/profile-avatars/${objectPath}`, {
      method: "POST",
      headers: supabaseStorageHeaders(key, { "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!response.ok) return null;
    const signed = await response.json() as { signedURL?: string; signedUrl?: string };
    const url = signed.signedURL ?? signed.signedUrl;
    if (!url) return null;
    return url.startsWith("http") ? url
      : url.startsWith("/storage/v1/") ? base + url
      : `${base}/storage/v1${url.startsWith("/") ? "" : "/"}${url}`;
  } catch {
    // The account and profile remain usable even if a signed avatar URL cannot be created.
    return null;
  }
}

async function describeProfilePhotoUploadFailure(response: Response): Promise<string> {
  let remoteMessage = "";
  try {
    const body: unknown = await response.json();
    const readMessage = (value: unknown, depth = 0): string => {
      if (depth > 4 || value == null) return "";
      if (typeof value === "string") {
        const text = value.trim();
        if (!text || /^\[object object\]$/i.test(text)) return "";
        if ((text.startsWith("{") || text.startsWith("[")) && depth < 4) {
          try { return readMessage(JSON.parse(text), depth + 1); } catch { return text.slice(0, 180); }
        }
        return text.slice(0, 180);
      }
      if (Array.isArray(value)) return value.map((item) => readMessage(item, depth + 1)).filter(Boolean).slice(0, 3).join(" · ");
      if (typeof value !== "object") return "";
      const record = value as Record<string, unknown>;
      for (const key of ["message", "detail", "error_description", "error", "issues", "errors", "title"]) {
        const result = readMessage(record[key], depth + 1);
        if (result) return result;
      }
      return "";
    };
    remoteMessage = readMessage(body);
  } catch {
    // Use the safe status-specific message below if Storage did not return JSON.
  }

  if (response.status === 401 || response.status === 403) {
    return "Supabase Storage rejected Kaira Africa's server credentials. Confirm SUPABASE_URL and either SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY are set on the Kaira Africa API service in Render.";
  }
  if (response.status === 404) {
    return "The private profile-avatars bucket or upload path was not found in the Supabase project used by Kaira Africa.";
  }
  if (response.status === 413) {
    return "This photo is too large for profile storage. Choose an image no larger than 2 MB.";
  }
  if (response.status === 400 && /mime|content.?type|image/i.test(remoteMessage)) {
    return "Supabase Storage rejected this image format. Choose a JPEG, PNG or WebP photo.";
  }
  return `Supabase Storage rejected the profile photo upload (HTTP ${response.status})${remoteMessage ? ": " + remoteMessage : ". Check the private profile-avatars bucket and the Kaira Africa API Storage configuration."}`;
}

async function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: `${user.phoneCountryCode}${user.phoneNumber}`,
    avatarUrl: await signProfileAvatar(user.avatarUrl),
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
  res.json(GetMeResponse.parse(await serializeUser(user)));
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
    res.json(UpdateProfileResponse.parse(await serializeUser(updated)));
  },
);


router.post("/auth/profile/avatar", requireUser, async (req, res) => {
  const { base, key } = requireSupabaseStorageConfig("Profile photo storage");
  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new BadRequestError("Choose a JPEG, PNG or WebP image.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024 ||
      bytes.toString("base64").replace(/=+$/, "") !== match[2].replace(/=+$/, "")) {
    throw new BadRequestError("Profile photos must be valid JPEG, PNG or WebP images no larger than 2 MB.");
  }
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const path = `${req.user!.id}/${randomUUID()}.${ext}`;
  let upload: Response;
  try {
    upload = await fetch(`${base}/storage/v1/object/profile-avatars/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST",
      headers: supabaseStorageHeaders(key, { "Content-Type": `image/${match[1]}`, "x-upsert": "false" }),
      body: bytes,
    });
  } catch {
    throw new HttpError(502, "profile_storage_unreachable", "Kaira Africa could not reach Supabase Storage. Check the API's Supabase URL and network connection, then try again.");
  }
  if (!upload.ok) {
    const message = await describeProfilePhotoUploadFailure(upload);
    logger.error({ userId: req.user!.id, statusCode: upload.status }, "Supabase Storage rejected a profile-photo upload");
    throw new HttpError(502, "photo_upload_failed", message);
  }
  const updated = await updateUserProfile(req.user!.id, { avatarUrl: path });
  if (!updated) {
    // Do not leave an unreferenced private file if the user row disappeared mid-request.
    try {
      await fetch(`${base}/storage/v1/object/profile-avatars`, {
        method: "DELETE",
        headers: supabaseStorageHeaders(key, { "Content-Type": "application/json" }),
        body: JSON.stringify({ prefixes: [path] }),
      });
    } catch { /* Best-effort cleanup only; preserve the actual database outcome. */ }
    throw new NotFoundError("User not found");
  }
  res.json(UpdateProfileResponse.parse(await serializeUser(updated)));
});

router.delete("/auth/profile/avatar", requireUser, async (req, res) => {
  const { base, key } = requireSupabaseStorageConfig("Profile photo storage");
  const user = await getUserById(req.user!.id);
  if (!user) throw new NotFoundError("User not found");
  if (user.avatarUrl && !/^https?:\/\//i.test(user.avatarUrl)) {
    let response: Response;
    try {
      response = await fetch(`${base}/storage/v1/object/profile-avatars`, {
        method: "DELETE",
        headers: supabaseStorageHeaders(key, { "Content-Type": "application/json" }),
        body: JSON.stringify({ prefixes: [user.avatarUrl] }),
      });
    } catch {
      throw new HttpError(502, "photo_remove_failed", "Kaira Africa could not reach private storage to remove your photo. Please try again.");
    }
    if (!response.ok) {
      logger.error({ userId: req.user!.id, statusCode: response.status }, "Supabase Storage rejected profile-photo removal");
      throw new HttpError(502, "photo_remove_failed", response.status === 401 || response.status === 403
        ? "Supabase Storage rejected Kaira Africa's server credentials. Check the server-only Supabase key on Render."
        : "The profile photo could not be removed from private storage. Please try again.");
    }
  }
  // Explicitly clear the column rather than leaving a stale storage path.
  const [cleared] = await db.update(users).set({ avatarUrl: null, updatedAt: new Date() }).where(eq(users.id, req.user!.id)).returning();
  if (!cleared) throw new NotFoundError("User not found");
  res.json(UpdateProfileResponse.parse(await serializeUser(cleared)));
});

// ─── PIN sign-in (business users) ────────────────────────────────────────────
// PINs are hashed with Argon2id and never returned to the browser. The PIN
// endpoint has independent IP and normalized-phone rate limits; SMS OTP remains
// available as the recovery/sign-in fallback for people who forget their PIN.

router.get("/auth/pin-status", requireUser, async (req, res) => {
  const user = await getUserById(req.user!.id);
  if (!user) throw new NotFoundError("User not found");
  res.json({ enabled: Boolean(user.pinHash) });
});

router.post(
  "/auth/set-pin",
  requireUser,
  rateLimit({
    scope: "pin_set_user",
    windowMs: 60 * 60 * 1000,
    max: 5,
    keyFn: (req) => req.user?.id ?? ipKey(req),
    message: "Too many PIN updates. Please try again later.",
  }),
  async (req, res) => {
    const userId = req.user!.id;
    await recordAuthEvent({
      actorType: "user",
      actorId: userId,
      event: "user_pin_set_started",
      success: true,
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
      metadata: { stage: "request_received" },
    });

    const parsed = SetPinBody.safeParse(req.body);
    if (!parsed.success) {
      await recordAuthEvent({
        actorType: "user",
        actorId: userId,
        event: "user_pin_set_failed",
        success: false,
        ipAddress: req.ip,
        userAgent: req.header("user-agent"),
        metadata: { reason: "invalid_pin_format" },
      });
      throw new BadRequestError("Choose a valid six-digit PIN that is not all the same or sequential.");
    }
    const user = await getUserById(req.user!.id);
    if (!user) throw new NotFoundError("User not found");
    if (user.status !== "active") {
      throw new ForbiddenError("This account is restricted.");
    }

    // Changing a previously configured PIN requires proof of the old PIN.
    // First-time setup remains available after the user has authenticated.
    if (user.pinHash) {
      const currentPinIsValid = Boolean(
        parsed.data.currentPin
          && await verifyPin(user.pinHash, parsed.data.currentPin),
      );
      if (!currentPinIsValid) {
        await recordAuthEvent({
          actorType: "user",
          actorId: user.id,
          event: "user_pin_change_failed",
          success: false,
          ipAddress: req.ip,
          userAgent: req.header("user-agent"),
        });
        throw new UnauthorizedError("Enter your current PIN to change it.");
      }
    }

    try {
      const pinHash = await hashPin(parsed.data.pin);
      const persisted = await updateUserPinHash(user.id, pinHash);
      if (!persisted) {
        throw new NotFoundError("Your account could not be updated. Please sign in again.");
      }
    } catch (cause) {
      // Keep enough audit detail to distinguish a request timeout from a
      // successful write, but never record the entered PIN or its hash.
      try {
        await recordAuthEvent({
          actorType: "user",
          actorId: user.id,
          event: "user_pin_set_failed",
          success: false,
          ipAddress: req.ip,
          userAgent: req.header("user-agent"),
          metadata: { reason: "hash_or_persistence_failed" },
        });
      } catch {
        // Preserve the original hashing/database failure if the audit write fails.
      }
      throw cause;
    }
    await recordAuthEvent({
      actorType: "user",
      actorId: user.id,
      event: "user_pin_set",
      success: true,
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
    });
    res.status(204).end();
  },
);

router.post(
  "/auth/login-pin",
  rateLimit({
    scope: "pin_login_ip",
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyFn: ipKey,
    message: "Too many sign-in attempts from this device. Try again shortly.",
  }),
  rateLimit({
    scope: "pin_login_phone",
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyFn: pinPhoneKey,
    message: "Too many PIN attempts for this number. Use SMS verification or try again later.",
  }),
  async (req, res) => {
    const parsed = PinLoginBody.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError("Enter a valid Gambian phone number and six-digit PIN.");
    }
    const { phoneNumber, pin } = parsed.data;
    const { countryCode, number } = normalizeGambianPhone(phoneNumber);
    const user = await getUserByPhone(countryCode, number);
    const validPin = Boolean(
      user?.pinHash && await verifyPin(user.pinHash, pin),
    );

    // Keep the visible failure response consistent for unknown phone numbers,
    // accounts without a PIN, and incorrect PINs.
    if (!user || !validPin || user.status !== "active") {
      await recordAuthEvent({
        actorType: user ? "user" : "unknown",
        actorId: user?.id,
        event: "user_pin_login_failed",
        success: false,
        ipAddress: req.ip,
        userAgent: req.header("user-agent"),
        metadata: { reason: "invalid_or_unavailable_credential" },
      });
      throw new UnauthorizedError("Invalid phone number or PIN. You can also sign in with SMS verification.");
    }

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
      event: "user_pin_login",
      success: true,
      ipAddress: req.ip,
      userAgent: req.header("user-agent"),
    });

    const refreshedUser = (await getUserById(user.id))!;
    res.json(
      VerifyOtpResponse.parse({
        token: rawToken,
        isNewUser: false,
        user: await serializeUser(refreshedUser),
      }),
    );
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

    // Returning users with a configured PIN must use PIN sign-in instead of
    // receiving a fresh OTP on every visit. Accounts without a PIN can still
    // recover through verified SMS and configure one from their profile.
    const existingUser = await getUserByPhone(countryCode, number);
    if (existingUser?.pinHash) {
      throw new BadRequestError(
        "This number already has PIN sign-in enabled. Continue with your six-digit PIN instead.",
      );
    }

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
        user: await serializeUser(refreshedUser),
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
