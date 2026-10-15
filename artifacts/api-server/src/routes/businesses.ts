import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod/v4";
import {
  GetMyBusinessResponse,
  UpdateBusinessBody,
  UpdateBusinessResponse,
  GetBusinessStatsResponse,
  CreateBusinessBody,
  CreateBusinessResponse,
} from "@workspace/api-zod";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { getBusinessById, updateBusiness, createBusinessForUser } from "../repositories/businesses";
import { listTransactions } from "../repositories/transactions";
import { listActivity } from "../repositories/activity-logs";
import { getRevenueAnalytics, getCustomerAnalytics } from "../repositories/analytics";
import { db, businesses, customers, teamMembers, type ReceiptBrandingSettings } from "@workspace/db";
import { count, eq } from "drizzle-orm";
import { BadRequestError, HttpError, NotFoundError } from "../lib/http-errors";
import { env } from "../config/env";
import { fromMinorUnits } from "../lib/money";
import type { Business } from "@workspace/db";

const router: IRouter = Router();

const ReceiptSettingsInput = z.object({
  companyName: z.string().trim().max(160).optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(80).optional(),
  email: z.string().trim().max(160).optional(),
  website: z.string().trim().max(200).optional(),
  footerNote: z.string().trim().max(600).optional(),
  showReceiptNumber: z.boolean().optional(),
  showCustomerDetails: z.boolean().optional(),
}).strict();

function receiptStorageConfig() {
  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    throw new HttpError(
      503,
      "receipt_storage_not_configured",
      "Kaira Africa cannot save receipt logos because the API is missing " + missing.join(" and ") +
        ". Configure these on the Kaira Africa API service in Render; SUPABASE_SERVICE_ROLE_KEY must remain server-side only.",
    );
  }
  return { base: env.SUPABASE_URL!.replace(/\/$/, ""), key: env.SUPABASE_SERVICE_ROLE_KEY! };
}

async function describeReceiptLogoUploadFailure(response: Response): Promise<string> {
  let remoteMessage = "";
  try {
    const body: unknown = await response.json();
    const readMessage = (value: unknown, depth = 0): string => {
      if (depth > 3 || value == null) return "";
      if (typeof value === "string") {
        const text = value.trim();
        return text && text !== "[object Object]" ? text.slice(0, 240) : "";
      }
      if (typeof value !== "object") return "";
      const record = value as Record<string, unknown>;
      for (const key of ["message", "error_description", "detail", "error", "code"]) {
        const text = readMessage(record[key], depth + 1);
        if (text) return text;
      }
      return "";
    };
    remoteMessage = readMessage(body);
  } catch {
    // Keep the user-facing fallback below if Storage does not return JSON.
  }

  if (response.status === 401 || response.status === 403) {
    return "Supabase Storage rejected the API credentials. Check that SUPABASE_SERVICE_ROLE_KEY belongs to the project in SUPABASE_URL and is configured on Render's Kaira Africa API service.";
  }
  if (response.status === 404) {
    return "Supabase could not find the private receipt-logos bucket or upload path. Confirm that the receipt-logos bucket exists in the Supabase project used by the Kaira Africa API.";
  }
  if (response.status === 413) {
    return "Supabase rejected the logo because it exceeds the 2 MB storage limit. Choose a smaller image.";
  }
  if (response.status === 400 && /mime|content.?type|image/i.test(remoteMessage)) {
    return "Supabase rejected this image format. Choose a JPEG, PNG or WebP logo.";
  }
  return "Supabase Storage rejected the logo upload (HTTP " + response.status + ")" +
    (remoteMessage ? ": " + remoteMessage : ". Please check the receipt-logos bucket and API Storage configuration.");
}

async function signReceiptLogo(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  try {
    const { base, key } = receiptStorageConfig();
    const objectPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${base}/storage/v1/object/sign/receipt-logos/${objectPath}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!response.ok) return null;
    const result = await response.json() as { signedURL?: string; signedUrl?: string };
    const signed = result.signedURL ?? result.signedUrl;
    if (!signed) return null;
    return signed.startsWith("http") ? signed
      : signed.startsWith("/storage/v1/") ? base + signed
      : `${base}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
  } catch {
    return null;
  }
}

async function serializeReceiptSettings(business: Business) {
  const settings: ReceiptBrandingSettings = business.receiptSettings ?? {};
  return {
    companyName: settings.companyName || business.name,
    address: settings.address ?? business.address ?? "",
    phone: settings.phone ?? business.phone ?? "",
    email: settings.email ?? business.email ?? "",
    website: settings.website ?? business.website ?? "",
    footerNote: settings.footerNote ?? "Thank you for your business.",
    showReceiptNumber: settings.showReceiptNumber ?? true,
    showCustomerDetails: settings.showCustomerDetails ?? true,
    logoUrl: await signReceiptLogo(settings.logoPath),
    hasLogo: Boolean(settings.logoPath),
  };
}

async function removeReceiptLogoObject(path: string | null | undefined) {
  if (!path || /^https?:\/\//i.test(path)) return;
  const { base, key } = receiptStorageConfig();
  let response: Response;
  try {
    response = await fetch(`${base}/storage/v1/object/receipt-logos`, {
      method: "DELETE",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [path] }),
    });
  } catch {
    throw new HttpError(502, "receipt_logo_remove_failed", "The logo could not be removed from private storage. Please try again.");
  }
  if (!response.ok) throw new HttpError(502, "receipt_logo_remove_failed", "The logo could not be removed from private storage. Please try again.");
}


function serializeBusiness(business: Business) {
  return {
    id: business.id,
    name: business.name,
    type: business.type,
    industry: business.industry,
    country: business.country,
    city: business.city,
    phone: business.phone,
    email: business.email,
    website: business.website,
    description: business.description,
    logoUrl: business.logoUrl,
    address: business.address,
    teamSize: business.teamSize,
    status: business.status,
    createdAt: business.createdAt.toISOString(),
  };
}

router.post(
  "/businesses",
  requireUser,
  validate({ body: CreateBusinessBody }),
  async (req, res) => {
    const business = await createBusinessForUser(req.user!.id, req.body);
    res.status(201).json(CreateBusinessResponse.parse(serializeBusiness(business)));
  },
);

router.get("/businesses/me", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const business = await getBusinessById(businessId);
  if (!business) throw new NotFoundError("Business not found");
  res.json(GetMyBusinessResponse.parse(serializeBusiness(business)));
});

router.patch(
  "/businesses/me",
  requireUser,
  requireRole("owner"),
  validate({ body: UpdateBusinessBody }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const updated = await updateBusiness(businessId, req.body);
    if (!updated) throw new NotFoundError("Business not found");
    res.json(UpdateBusinessResponse.parse(serializeBusiness(updated)));
  },
);

router.get("/businesses/me/receipt-settings", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) throw new NotFoundError("Business not found");
  res.json(await serializeReceiptSettings(business));
});

router.patch("/businesses/me/receipt-settings", requireUser, requireRole("owner"), async (req, res) => {
  const businessId = requireBusiness(req);
  const input = ReceiptSettingsInput.parse(req.body);
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) throw new NotFoundError("Business not found");
  const next: ReceiptBrandingSettings = { ...(business.receiptSettings ?? {}), ...input };
  const [updated] = await db.update(businesses).set({ receiptSettings: next, updatedAt: new Date() })
    .where(eq(businesses.id, businessId)).returning();
  if (!updated) throw new NotFoundError("Business not found");
  res.json(await serializeReceiptSettings(updated));
});

router.post("/businesses/me/receipt-logo", requireUser, requireRole("owner"), async (req, res) => {
  const businessId = requireBusiness(req);
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) throw new NotFoundError("Business not found");
  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new BadRequestError("Choose a JPEG, PNG or WebP logo.");
  const mimeType = match[1];
  const encoded = match[2];
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.length > 2 * 1024 * 1024 || bytes.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) {
    throw new BadRequestError("The logo must be valid and no larger than 2 MB.");
  }
  const { base, key } = receiptStorageConfig();
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
  const path = `${businessId}/${Date.now()}-${randomUUID()}.${extension}`;
  const url = `${base}/storage/v1/object/receipt-logos/${path.split("/").map(encodeURIComponent).join("/")}`;
  const upload = await fetch(url, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": mimeType, "x-upsert": "false" },
    body: bytes,
  });
  if (!upload.ok) {
    throw new HttpError(502, "receipt_logo_upload_failed", await describeReceiptLogoUploadFailure(upload));
  }
  const previousPath = business.receiptSettings?.logoPath ?? null;
  const next: ReceiptBrandingSettings = { ...(business.receiptSettings ?? {}), logoPath: path };
  const [updated] = await db.update(businesses).set({ receiptSettings: next, updatedAt: new Date() })
    .where(eq(businesses.id, businessId)).returning();
  if (!updated) throw new NotFoundError("Business not found");
  if (previousPath && previousPath !== path) {
    try { await removeReceiptLogoObject(previousPath); } catch { /* New logo and database reference are already saved. */ }
  }
  res.status(201).json(await serializeReceiptSettings(updated));
});

router.delete("/businesses/me/receipt-logo", requireUser, requireRole("owner"), async (req, res) => {
  const businessId = requireBusiness(req);
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (!business) throw new NotFoundError("Business not found");
  const previousPath = business.receiptSettings?.logoPath ?? null;
  await removeReceiptLogoObject(previousPath);
  const next: ReceiptBrandingSettings = { ...(business.receiptSettings ?? {}), logoPath: null };
  const [updated] = await db.update(businesses).set({ receiptSettings: next, updatedAt: new Date() })
    .where(eq(businesses.id, businessId)).returning();
  if (!updated) throw new NotFoundError("Business not found");
  res.json(await serializeReceiptSettings(updated));
});

router.get("/businesses/me/stats", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);

  const [revenue, customerAnalytics, [{ teamCount }], recentTx, recentActivity] =
    await Promise.all([
      getRevenueAnalytics(businessId, "month"),
      getCustomerAnalytics(businessId, "month"),
      db
        .select({ teamCount: count() })
        .from(teamMembers)
        .where(eq(teamMembers.businessId, businessId)),
      listTransactions(businessId, { page: 1, limit: 5 }),
      listActivity(businessId, { page: 1, limit: 5 }),
    ]);

  const stats = {
    totalRevenue: revenue.total,
    revenueChange: revenue.changePercent,
    totalTransactions: recentTx.total,
    transactionsChange: 0,
    totalCustomers: (await db.select({ c: count() }).from(customers).where(eq(customers.businessId, businessId)))[0].c,
    customersChange: customerAnalytics.changePercent,
    teamMembers: teamCount,
    teamChange: 0,
    recentTransactions: recentTx.transactions.map((t) => ({
      id: t.id,
      reference: t.reference,
      amount: fromMinorUnits(t.amountMinor, t.currency),
      currency: t.currency,
      type: t.type,
      status: t.status,
      customerId: t.customerId,
      customerName: t.customerName,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
    })),
    recentActivity: recentActivity.activity.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.userName,
      userAvatarUrl: a.userAvatarUrl,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      entityName: a.entityName,
      description: a.description,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  res.json(GetBusinessStatsResponse.parse(stats));
});

export default router;
