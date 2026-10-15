import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  db, transactions,
} from "@workspace/db";
import {
  ListTransactionsQueryParams,
  ListTransactionsResponse,
  CreateTransactionBody,
  CreateTransactionResponse,
  GetTransactionParams,
  GetTransactionResponse,
} from "@workspace/api-zod";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  type TransactionWithCustomer,
} from "../repositories/transactions";
import { recordActivity } from "../repositories/activity-logs";
import { displayName } from "../lib/display-name";
import { NotFoundError, BadRequestError, HttpError } from "../lib/http-errors";
import { toMinorUnits, fromMinorUnits } from "../lib/money";
import { requireSupabaseStorageConfig } from "../lib/supabase-storage";
import { supabaseStorageHeaders } from "../lib/supabase-storage-headers";

const router: IRouter = Router();
const CURRENCIES = ["GMD", "NGN", "USD", "EUR", "GBP"] as const;
const PAYMENT_METHODS = ["manual_entry", "cash", "bank_transfer", "mobile_money", "card", "paypal", "cheque", "other"] as const;
const transactionInput = CreateTransactionBody.extend({
  currency: z.enum(CURRENCIES),
  paymentMethod: z.enum(PAYMENT_METHODS).default("manual_entry"),
  notes: z.string().trim().max(4000).optional(),
});
const transactionUpdateInput = z.object({
  status: z.enum(["completed", "pending", "failed", "cancelled"]).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one transaction field to update.");

async function signAttachment(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  try {
    const { base, key } = requireSupabaseStorageConfig("Private transaction attachment storage");
    const objectPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(`${base}/storage/v1/object/sign/transaction-attachments/${objectPath}`, {
      method: "POST",
      headers: supabaseStorageHeaders(key, { "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn: 3600 }),
    });
    if (!response.ok) return null;
    const body = await response.json() as { signedURL?: string; signedUrl?: string };
    const signed = body.signedURL ?? body.signedUrl;
    if (!signed) return null;
    return signed.startsWith("http") ? signed
      : signed.startsWith("/storage/v1/") ? base + signed
      : `${base}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
  } catch {
    // Financial records remain accessible if an attachment can't be signed.
    return null;
  }
}

async function serialize(tx: TransactionWithCustomer) {
  return {
    id: tx.id,
    reference: tx.reference,
    amount: fromMinorUnits(tx.amountMinor, tx.currency),
    currency: tx.currency,
    type: tx.type,
    status: tx.status,
    customerId: tx.customerId,
    customerName: tx.customerName,
    description: tx.description,
    paymentMethod: tx.paymentMethod ?? "manual_entry",
    notes: tx.notes,
    attachmentUrl: await signAttachment(tx.attachmentPath),
    createdAt: tx.createdAt.toISOString(),
    completedAt: tx.completedAt?.toISOString() ?? null,
    updatedAt: tx.updatedAt.toISOString(),
  };
}

router.get(
  "/transactions",
  requireUser,
  validate({ query: ListTransactionsQueryParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const q = req.validatedQuery as unknown as {
      search?: string;
      status?: "completed" | "pending" | "failed" | "cancelled";
      type?: "payment" | "refund" | "transfer" | "withdrawal" | "deposit";
      customerId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    };
    const { transactions: rows, total } = await listTransactions(businessId, {
      ...q, page: q.page ?? 1, limit: q.limit ?? 20,
    });
    res.json(ListTransactionsResponse.parse({
      transactions: await Promise.all(rows.map(serialize)),
      total, page: q.page ?? 1, limit: q.limit ?? 20,
    }));
  },
);

router.post(
  "/transactions",
  requireUser,
  validate({ body: transactionInput }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const input = transactionInput.parse(req.body);
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new BadRequestError("Amount must be greater than zero.");
    }
    const tx = await createTransaction(businessId, {
      amountMinor: toMinorUnits(input.amount, input.currency),
      currency: input.currency,
      type: input.type,
      customerId: input.customerId,
      description: input.description,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
    });
    await recordActivity({
      businessId, userId: req.user!.id, userName: displayName(req.user!),
      action: "created", entityType: "transaction", entityId: tx.id, entityName: tx.reference,
      description: `${displayName(req.user!)} recorded a ${tx.type} of ${fromMinorUnits(tx.amountMinor, tx.currency)} ${tx.currency} (${input.paymentMethod})`,
      status: "success",
    });
    res.status(201).json(CreateTransactionResponse.parse(await serialize(tx)));
  },
);

router.get(
  "/transactions/:id",
  requireUser,
  validate({ params: GetTransactionParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const tx = await getTransaction(businessId, req.params.id as string);
    if (!tx) throw new NotFoundError("Transaction not found");
    res.json(GetTransactionResponse.parse(await serialize(tx)));
  },
);

router.patch("/transactions/:id", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const input = transactionUpdateInput.parse(req.body);
  const businessId = requireBusiness(req);
  const before = await getTransaction(businessId, req.params.id as string);
  if (!before) throw new NotFoundError("Transaction not found");
  const updated = await updateTransaction(businessId, before.id, input);
  if (!updated) throw new NotFoundError("Transaction not found");
  await recordActivity({
    businessId, userId: req.user!.id, userName: displayName(req.user!),
    action: "updated", entityType: "transaction", entityId: updated.id, entityName: updated.reference,
    description: `${displayName(req.user!)} updated transaction ${updated.reference}${input.status ? ` status to ${input.status}` : ""}`,
    status: "success",
  });
  res.json(GetTransactionResponse.parse(await serialize(updated)));
});

router.post("/transactions/:id/attachment", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const businessId = requireBusiness(req);
  const tx = await getTransaction(businessId, req.params.id as string);
  if (!tx) throw new NotFoundError("Transaction not found");
  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  const match = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new BadRequestError("Attach a JPEG, PNG, WebP or PDF receipt.");
  const mimeType = match[1];
  const encoded = match[2];
  const bytes = Buffer.from(encoded, "base64");
  if (!bytes.length || bytes.length > 5 * 1024 * 1024 || bytes.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) {
    throw new BadRequestError("The receipt must be a valid file no larger than 5 MB.");
  }
  const { base, key } = requireSupabaseStorageConfig("Private transaction attachment storage");
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "pdf";
  const path = `${businessId}/${tx.id}/${Date.now()}-${randomUUID()}.${extension}`;
  const url = `${base}/storage/v1/object/transaction-attachments/${path.split("/").map(encodeURIComponent).join("/")}`;
  const upload = await fetch(url, {
    method: "POST",
    headers: supabaseStorageHeaders(key, { "Content-Type": mimeType, "x-upsert": "false" }),
    body: bytes,
  });
  if (!upload.ok) throw new HttpError(502, "attachment_upload_failed", "The receipt could not be saved to private storage. The transaction remains saved; please retry the upload.");
  const [updated] = await db.update(transactions).set({ attachmentPath: path, updatedAt: new Date() }).where(
    and(eq(transactions.id, tx.id), eq(transactions.businessId, businessId)),
  ).returning();
  if (!updated) throw new NotFoundError("Transaction not found");
  const result = await getTransaction(businessId, updated.id);
  if (!result) throw new NotFoundError("Transaction not found");
  await recordActivity({
    businessId, userId: req.user!.id, userName: displayName(req.user!),
    action: "uploaded", entityType: "transaction_attachment", entityId: tx.id, entityName: tx.reference,
    description: `${displayName(req.user!)} attached a receipt to transaction ${tx.reference}`, status: "success",
  });
  res.json(GetTransactionResponse.parse(await serialize(result)));
});

router.delete("/transactions/:id/attachment", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const businessId = requireBusiness(req);
  const tx = await getTransaction(businessId, req.params.id as string);
  if (!tx) throw new NotFoundError("Transaction not found");
  if (tx.attachmentPath && !/^https?:\/\//i.test(tx.attachmentPath)) {
    const { base, key } = requireSupabaseStorageConfig("Private transaction attachment storage");
    let response: Response;
    try {
      response = await fetch(`${base}/storage/v1/object/transaction-attachments`, {
        method: "DELETE",
        headers: supabaseStorageHeaders(key, { "Content-Type": "application/json" }),
        body: JSON.stringify({ prefixes: [tx.attachmentPath] }),
      });
    } catch {
      throw new HttpError(502, "attachment_remove_failed", "The receipt could not be removed from private storage. Please try again.");
    }
    if (!response.ok) throw new HttpError(502, "attachment_remove_failed", "The receipt could not be removed from private storage. Please try again.");
  }
  const [updated] = await db.update(transactions).set({ attachmentPath: null, updatedAt: new Date() }).where(
    and(eq(transactions.id, tx.id), eq(transactions.businessId, businessId)),
  ).returning();
  if (!updated) throw new NotFoundError("Transaction not found");
  const result = await getTransaction(businessId, updated.id);
  if (!result) throw new NotFoundError("Transaction not found");
  res.json(GetTransactionResponse.parse(await serialize(result)));
});

export default router;
