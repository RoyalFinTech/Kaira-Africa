import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db, crmInteractions, customers, transactions, users } from "@workspace/db";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { displayName } from "../lib/display-name";
import { recordActivity } from "../repositories/activity-logs";
import { BadRequestError, HttpError, NotFoundError } from "../lib/http-errors";
import { requireSupabaseStorageConfig } from "../lib/supabase-storage";
import { supabaseStorageHeaders } from "../lib/supabase-storage-headers";
import { extractSignedCustomerPhotoUrl, isCustomerPhotoPathForCustomer, parseCustomerPhotoDataUrl } from "../lib/crm-photo";

const router: IRouter = Router();
const profileDataSchema = z.record(z.string(), z.unknown()).default({});
function cleanProfileData(value: Record<string, unknown> | undefined) {
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).filter(([, item]) => {
    if (typeof item === "string") return item.trim().length > 0;
    if (Array.isArray(item)) return item.length > 0;
    return item !== null && item !== undefined;
  }).map(([key, item]) => [key, typeof item === "string" ? item.trim() : item]));
}
const customerInput = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  country: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  profileData: profileDataSchema.optional(),
});
const profilePatchSchema = customerInput.partial().refine((v) => Object.keys(v).length > 0, "Provide at least one field to update.");
const interactionInput = z.object({
  customerId: z.string().uuid(),
  type: z.enum(["note", "call", "meeting", "email", "follow_up"]).default("note"),
  title: z.string().trim().min(1).max(120),
  note: z.string().trim().min(1).max(4000),
  nextActionAt: z.string().datetime().optional(),
});

async function signCustomerPhoto(path: string | null, businessId: string, customerId: string) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // legacy external URLs remain readable
  if (!isCustomerPhotoPathForCustomer(path, businessId, customerId)) return null;
  try {
    const { base, key } = requireSupabaseStorageConfig("Private customer photo storage");
    const objectPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${base}/storage/v1/object/sign/customer-photos/${objectPath}`, {
      method: "POST",
      headers: supabaseStorageHeaders(key, { "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!response.ok) return null;
    return extractSignedCustomerPhotoUrl(await response.json(), base);
  } catch { return null; }
}
async function removeUploadedCustomerPhoto(businessId: string, customerId: string, path: string) {
  if (!isCustomerPhotoPathForCustomer(path, businessId, customerId)) return;
  try {
    const { base, key } = requireSupabaseStorageConfig("Private customer photo storage");
    const response = await fetch(`${base}/storage/v1/object/customer-photos`, {
      method: "DELETE",
      headers: supabaseStorageHeaders(key, { "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: [path] }),
    });
    if (!response.ok) console.warn("CRM uploaded photo cleanup failed", { customerId, statusCode: response.status });
  } catch {
    console.warn("CRM uploaded photo cleanup was unreachable", { customerId });
  }
}
async function serializeCustomer(row: typeof customers.$inferSelect) {
  return { ...row, avatarUrl: await signCustomerPhoto(row.avatarUrl, row.businessId, row.id), profileData: row.profileData ?? {} };
}
async function uploadCustomerPhoto(businessId: string, customerId: string, dataUrl: string) {
  let parsed: ReturnType<typeof parseCustomerPhotoDataUrl>;
  try { parsed = parseCustomerPhotoDataUrl(dataUrl); }
  catch (error) { throw new BadRequestError(error instanceof Error ? error.message : "Choose a valid customer photo."); }
  const { mime, extension: ext, bytes } = parsed;
  const path = `${businessId}/${customerId}/${randomUUID()}.${ext}`;
  const { base, key } = requireSupabaseStorageConfig("Private customer photo storage");
  const response = await fetch(`${base}/storage/v1/object/customer-photos/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: supabaseStorageHeaders(key, { "Content-Type": mime, "x-upsert": "false" }),
    body: bytes,
  });
  if (!response.ok) throw new HttpError(502, "photo_upload_failed", "The customer photo could not be uploaded. Your customer record has not been changed.");
  return path;
}

// Customer-facing CRM endpoints. profileData keeps industry-specific fields optional
// and flexible; first and last name are the only required personal fields.
router.get("/crm/customers", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const rawSearch = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 120) : "";
  const term = rawSearch.replace(/[,%_]/g, (ch) => "\\" + ch);
  const parsedLimit = Number.parseInt(String(req.query.limit ?? "200"), 10);
  const parsedOffset = Number.parseInt(String(req.query.offset ?? "0"), 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(200, Math.max(1, parsedLimit)) : 200;
  const offset = Number.isFinite(parsedOffset) ? Math.min(1_000_000, Math.max(0, parsedOffset)) : 0;
  const where = and(eq(customers.businessId, businessId), rawSearch ? or(
    ilike(customers.firstName, `%${term}%`), ilike(customers.lastName, `%${term}%`),
    ilike(customers.email, `%${term}%`), ilike(customers.phone, `%${term}%`),
    ilike(customers.company, `%${term}%`), sql`${customers.profileData}::text ILIKE ${`%${term}%`}`,
  ) : undefined);
  const [rows, totals] = await Promise.all([
    db.select().from(customers).where(where).orderBy(desc(customers.updatedAt), desc(customers.id)).limit(limit).offset(offset),
    db.select({ total: count() }).from(customers).where(where),
  ]);
  res.json({ customers: await Promise.all(rows.map(serializeCustomer)), total: Number(totals[0]?.total ?? 0), limit, offset });
});

router.post("/crm/customers", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const input = customerInput.parse(req.body);
  const businessId = requireBusiness(req);
  const [created] = await db.insert(customers).values({
    businessId, firstName: input.firstName, lastName: input.lastName,
    email: input.email || null, phone: input.phone || null, company: input.company || null,
    country: input.country || null, city: input.city || null, status: input.status ?? "active",
    profileData: cleanProfileData(input.profileData),
  }).returning();
  await recordActivity({ businessId, userId: req.user!.id, userName: displayName(req.user!), action: "created",
    entityType: "customer", entityId: created.id, entityName: `${created.firstName} ${created.lastName}`,
    description: `${displayName(req.user!)} added a CRM customer record`, status: "success" });
  res.status(201).json(await serializeCustomer(created));
});

router.put("/crm/customers/:id", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const input = profilePatchSchema.parse(req.body);
  const businessId = requireBusiness(req);
  const [existing] = await db.select().from(customers).where(and(eq(customers.id, req.params.id as string), eq(customers.businessId, businessId))).limit(1);
  if (!existing) throw new NotFoundError("Customer not found");
  const { profileData, ...basic } = input;
  const [updated] = await db.update(customers).set({
    ...basic,
    ...(profileData !== undefined ? { profileData: cleanProfileData(profileData) } : {}),
    email: basic.email === undefined ? undefined : basic.email === "" ? null : basic.email,
    phone: basic.phone === undefined ? undefined : basic.phone === "" ? null : basic.phone,
    company: basic.company === undefined ? undefined : basic.company === "" ? null : basic.company,
    country: basic.country === undefined ? undefined : basic.country === "" ? null : basic.country,
    city: basic.city === undefined ? undefined : basic.city === "" ? null : basic.city,
    updatedAt: new Date(),
  }).where(and(eq(customers.id, existing.id), eq(customers.businessId, businessId))).returning();
  res.json(await serializeCustomer(updated));
});

router.post("/crm/customers/:id/photo", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const businessId = requireBusiness(req);
  const [customer] = await db.select().from(customers).where(and(eq(customers.id, req.params.id as string), eq(customers.businessId, businessId))).limit(1);
  if (!customer) throw new NotFoundError("Customer not found");
  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  const previousPath = customer.avatarUrl;
  const path = await uploadCustomerPhoto(businessId, customer.id, dataUrl);
  const signedPreviewUrl = await signCustomerPhoto(path, businessId, customer.id);
  if (!signedPreviewUrl) {
    await removeUploadedCustomerPhoto(businessId, customer.id, path);
    throw new HttpError(502, "photo_preview_failed", "The photo was uploaded but its private preview could not be created. Your existing customer photo was kept; please retry.");
  }
  let updated: typeof customer | undefined;
  try {
    [updated] = await db.update(customers).set({ avatarUrl: path, updatedAt: new Date() })
      .where(and(eq(customers.id, customer.id), eq(customers.businessId, businessId))).returning();
    if (!updated) throw new NotFoundError("Customer not found");
  } catch (error) {
    // The database did not adopt the new object path; remove only the new upload.
    await removeUploadedCustomerPhoto(businessId, customer.id, path);
    throw error;
  }

  // The replacement is persisted. Clean up the previous private object afterward.
  if (previousPath && previousPath !== path && !/^https?:\/\//i.test(previousPath)) {
    try {
      const { base, key } = requireSupabaseStorageConfig("Private customer photo storage");
      const cleanup = await fetch(`${base}/storage/v1/object/customer-photos`, {
        method: "DELETE",
        headers: supabaseStorageHeaders(key, { "Content-Type": "application/json" }),
        body: JSON.stringify({ prefixes: [previousPath] }),
      });
      if (!cleanup.ok) {
        console.warn("Previous CRM customer photo cleanup failed after replacement", { customerId: customer.id, statusCode: cleanup.status });
      }
    } catch {
      // Do not report a failed upload when the replacement is already saved.
      console.warn("Previous CRM customer photo cleanup was unreachable after replacement", { customerId: customer.id });
    }
  }
  // Use the already-verified signed URL for this response so a second,
  // transient signing failure cannot make a successful upload look blank.
  res.json({ ...updated, avatarUrl: signedPreviewUrl, profileData: updated.profileData ?? {} });
});

router.delete("/crm/customers/:id/photo", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const businessId = requireBusiness(req);
  const [customer] = await db.select().from(customers).where(and(eq(customers.id, req.params.id as string), eq(customers.businessId, businessId))).limit(1);
  if (!customer) throw new NotFoundError("Customer not found");

  // Clear the DB reference first: Postgres and Storage cannot share a transaction.
  // This avoids leaving a broken avatar path if the DB write fails after object removal.
  const previousPath = customer.avatarUrl;
  const [updated] = await db.update(customers).set({ avatarUrl: null, updatedAt: new Date() })
    .where(and(eq(customers.id, customer.id), eq(customers.businessId, businessId))).returning();
  if (!updated) throw new NotFoundError("Customer not found");

  // Record removal is complete. A storage cleanup failure leaves only a private
  // orphan object, not a customer row pointing at a missing photo.
  if (previousPath && !/^https?:\/\//i.test(previousPath)) {
    try {
      const { base, key } = requireSupabaseStorageConfig("Private customer photo storage");
      const response = await fetch(`${base}/storage/v1/object/customer-photos`, {
        method: "DELETE",
        headers: supabaseStorageHeaders(key, { "Content-Type": "application/json" }),
        body: JSON.stringify({ prefixes: [previousPath] }),
      });
      if (!response.ok) console.warn("CRM photo cleanup failed after record removal", { customerId: customer.id, statusCode: response.status });
    } catch {
      console.warn("CRM photo cleanup was unreachable after record removal", { customerId: customer.id });
    }
  }
  res.json(await serializeCustomer(updated));
});

router.get("/crm/overview", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const [customerRows, spendRows, interactions, [{ openFollowUps }]] = await Promise.all([
    db.select({
      id: customers.id, firstName: customers.firstName, lastName: customers.lastName,
      email: customers.email, phone: customers.phone, company: customers.company, status: customers.status,
      createdAt: customers.createdAt,
      transactionCount: sql.raw("count(transactions.id) filter (where transactions.status = 'completed')"),
    }).from(customers).leftJoin(transactions, eq(transactions.customerId, customers.id))
      .where(eq(customers.businessId, businessId)).groupBy(customers.id).orderBy(desc(customers.createdAt)).limit(100),
    db.select({
      customerId: transactions.customerId,
      currency: transactions.currency,
      amountMinor: sql.raw("coalesce(sum(case when transactions.status = 'completed' and transactions.type = 'payment' then transactions.amount_minor else 0 end), 0)"),
    }).from(transactions).where(and(
      eq(transactions.businessId, businessId),
      sql`transactions.customer_id IS NOT NULL`,
    )).groupBy(transactions.customerId, transactions.currency),
    db.select({
      id: crmInteractions.id, customerId: crmInteractions.customerId,
      customerName: sql.raw("concat(customers.first_name, ' ', customers.last_name)"),
      userName: sql.raw("coalesce(concat(users.first_name, ' ', users.last_name), 'System')"),
      type: crmInteractions.type, title: crmInteractions.title, note: crmInteractions.note,
      nextActionAt: crmInteractions.nextActionAt, completedAt: crmInteractions.completedAt, createdAt: crmInteractions.createdAt,
    }).from(crmInteractions).innerJoin(customers, eq(customers.id, crmInteractions.customerId))
      .leftJoin(users, eq(users.id, crmInteractions.userId)).where(eq(crmInteractions.businessId, businessId))
      .orderBy(desc(crmInteractions.createdAt)).limit(25),
    db.select({ openFollowUps: count() }).from(crmInteractions).where(and(
      eq(crmInteractions.businessId, businessId), isNull(crmInteractions.completedAt)
    )),
  ]);
  const spendByCustomer = new Map<string, Record<string, number>>();
  for (const row of spendRows) {
    if (!row.customerId) continue;
    const currencies = spendByCustomer.get(row.customerId) ?? {};
    currencies[row.currency] = Number(row.amountMinor) / 100;
    spendByCustomer.set(row.customerId, currencies);
  }
  res.json({
    customers: customerRows.map((c) => ({ ...c, spendByCurrency: spendByCustomer.get(c.id) ?? {},
      transactionCount: Number(c.transactionCount), createdAt: c.createdAt.toISOString() })),
    interactions: interactions.map((i) => ({ ...i, customerName: String(i.customerName), userName: String(i.userName),
      nextActionAt: i.nextActionAt?.toISOString() || null, completedAt: i.completedAt?.toISOString() || null,
      createdAt: i.createdAt.toISOString() })),
    metrics: { totalCustomers: customerRows.length, activeCustomers: customerRows.filter((c) => c.status === "active").length, openFollowUps: Number(openFollowUps) },
  });
});

router.post("/crm/interactions", requireUser, requireRole("owner", "admin", "manager"), async (req, res) => {
  const input = interactionInput.parse(req.body);
  const businessId = requireBusiness(req);
  const [customer] = await db.select({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName })
    .from(customers).where(and(eq(customers.id, input.customerId), eq(customers.businessId, businessId))).limit(1);
  if (!customer) throw new NotFoundError("Customer not found");
  const [created] = await db.insert(crmInteractions).values({
    businessId, customerId: customer.id, userId: req.user!.id, type: input.type,
    title: input.title, note: input.note, nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
  }).returning();
  await recordActivity({ businessId, userId: req.user!.id, userName: displayName(req.user!), action: "created",
    entityType: "crm_interaction", entityId: created.id, entityName: created.title,
    description: displayName(req.user!) + " added a CRM " + created.type + " for " + customer.firstName + " " + customer.lastName,
    status: "success" });
  res.status(201).json({ ...created, nextActionAt: created.nextActionAt?.toISOString() || null, createdAt: created.createdAt.toISOString() });
});

router.patch("/crm/interactions/:id/complete", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const businessId = requireBusiness(req);
  const [updated] = await db.update(crmInteractions).set({ completedAt: new Date() })
    .where(and(eq(crmInteractions.id, req.params.id as string), eq(crmInteractions.businessId, businessId))).returning();
  if (!updated) throw new NotFoundError("CRM interaction not found");
  res.json({ id: updated.id, completedAt: updated.completedAt?.toISOString() || null });
});

export default router;
