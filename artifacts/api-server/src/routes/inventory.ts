import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, inventoryProducts, inventoryMovements } from "@workspace/db";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { displayName } from "../lib/display-name";
import { recordActivity } from "../repositories/activity-logs";
import { BadRequestError, HttpError, NotFoundError } from "../lib/http-errors";
import { hasSupabaseStorageConfig, requireSupabaseStorageConfig } from "../lib/supabase-storage";

const router: IRouter = Router();

const productInput = z.object({
  name: z.string().trim().min(1).max(160), sku: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9._-]+$/),
  category: z.string().trim().max(80).optional(), unit: z.string().trim().max(30).default("unit"),
  quantity: z.number().int().min(0).default(0), reorderLevel: z.number().int().min(0).default(5),
  unitCost: z.number().min(0).default(0), salePrice: z.number().min(0).default(0),
  currency: z.enum(["GMD", "NGN", "USD"]).default("GMD"),
});
const adjustmentInput = z.object({
  quantityDelta: z.number().int().refine((v) => v !== 0, "Quantity change cannot be zero"),
  type: z.enum(["purchase", "sale", "return", "adjustment"]).default("adjustment"),
  reason: z.string().trim().max(200).optional(),
});
function serialize(p: typeof inventoryProducts.$inferSelect) {
  return { ...p, unitCost: Number(p.unitCostMinor) / 100, salePrice: Number(p.salePriceMinor) / 100,
    createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
}

async function serializeWithImage(p: typeof inventoryProducts.$inferSelect) {
  const product = serialize(p);
  if (!p.imageUrl || /^https?:\/\//i.test(p.imageUrl)) return product;
  if (!hasSupabaseStorageConfig()) return { ...product, imageUrl: null };
  const storage = requireSupabaseStorageConfig("Inventory product image storage");

  // Product photos are private. Store the object path in Postgres and return
  // a short-lived signed URL to authenticated business users only.
  const baseUrl = storage.base;
  const objectPath = p.imageUrl.split("/").map(encodeURIComponent).join("/");
  try {
    const response = await fetch(`${baseUrl}/storage/v1/object/sign/inventory-images/${objectPath}`, {
      method: "POST",
      headers: {
        ...storage.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 86400 }),
    });
    if (!response.ok) return { ...product, imageUrl: null };
    const result = await response.json() as { signedURL?: string; signedUrl?: string };
    const signedUrl = result.signedURL ?? result.signedUrl;
    if (!signedUrl) return { ...product, imageUrl: null };
    const fullUrl = signedUrl.startsWith("http")
      ? signedUrl
      : signedUrl.startsWith("/storage/v1/")
        ? baseUrl + signedUrl
        : `${baseUrl}/storage/v1${signedUrl.startsWith("/") ? "" : "/"}${signedUrl}`;
    return { ...product, imageUrl: fullUrl };
  } catch {
    // Keep product and stock information available even if image signing fails.
    return { ...product, imageUrl: null };
  }
}

router.get("/inventory/products", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const products = await db.select().from(inventoryProducts).where(eq(inventoryProducts.businessId, businessId)).orderBy(asc(inventoryProducts.name));
  res.json(await Promise.all(products.map(serializeWithImage)));
});

router.post("/inventory/products", requireUser, requireRole("owner", "admin", "manager"), async (req, res) => {
  const input = productInput.parse(req.body); const businessId = requireBusiness(req);
  try {
    const [created] = await db.insert(inventoryProducts).values({
      businessId, name: input.name, sku: input.sku, category: input.category || null, unit: input.unit,
      quantity: input.quantity, reorderLevel: input.reorderLevel, unitCostMinor: Math.round(input.unitCost * 100),
      salePriceMinor: Math.round(input.salePrice * 100), currency: input.currency,
    }).returning();
    if (input.quantity) await db.insert(inventoryMovements).values({
      businessId, productId: created.id, userId: req.user!.id, quantityDelta: input.quantity, type: "initial", reason: "Opening stock",
    });
    await recordActivity({
      businessId, userId: req.user!.id, userName: displayName(req.user!), action: "created",
      entityType: "inventory_product", entityId: created.id, entityName: created.name,
      description: displayName(req.user!) + " added inventory product " + created.name, status: "success",
    });
    res.status(201).json(await serializeWithImage(created));
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new BadRequestError("That SKU already exists for this business");
    throw error;
  }
});

router.post("/inventory/products/:id/image", requireUser, requireRole("owner", "admin", "manager"), async (req, res) => {
  const businessId = requireBusiness(req);
  const [product] = await db.select().from(inventoryProducts).where(and(
    eq(inventoryProducts.id, req.params.id as string), eq(inventoryProducts.businessId, businessId)
  )).limit(1);
  if (!product) throw new NotFoundError("Inventory product not found");
  if (!hasSupabaseStorageConfig()) {
    throw new HttpError(503, "service_unavailable", "Product image storage is not configured yet. You can still save the product without a photo.");
  }
  const storage = requireSupabaseStorageConfig("Inventory product image storage");
  const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new BadRequestError("Upload a JPEG product photo. Images are resized before upload.");
  const bytes = Buffer.from(match[1], "base64");
  if (!bytes.length || bytes.length > 204800) {
    throw new BadRequestError("Product photos must be 200 KB or smaller.");
  }
  const objectPath = `${businessId}/${product.id}/${Date.now()}.jpg`;
  const storageUrl = `${storage.base}/storage/v1/object/inventory-images/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
  const upload = await fetch(storageUrl, {
    method: "POST",
    headers: {
      ...storage.headers,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!upload.ok) {
    throw new HttpError(503, "service_unavailable", "The photo could not be saved to storage. Please try again.");
  }
  const imageUrl = objectPath;
  const [updated] = await db.update(inventoryProducts).set({ imageUrl, updatedAt: new Date() })
    .where(and(eq(inventoryProducts.id, product.id), eq(inventoryProducts.businessId, businessId))).returning();
  res.json(await serializeWithImage(updated));
});

router.post("/inventory/products/:id/adjust", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const input = adjustmentInput.parse(req.body); const businessId = requireBusiness(req);
  const [product] = await db.select().from(inventoryProducts).where(and(
    eq(inventoryProducts.id, req.params.id as string), eq(inventoryProducts.businessId, businessId)
  )).limit(1);
  if (!product) throw new NotFoundError("Inventory product not found");
  const nextQuantity = product.quantity + input.quantityDelta;
  if (nextQuantity < 0) throw new BadRequestError("Stock cannot fall below zero");
  const [updated] = await db.update(inventoryProducts).set({ quantity: nextQuantity, updatedAt: new Date() })
    .where(eq(inventoryProducts.id, product.id)).returning();
  await db.insert(inventoryMovements).values({
    businessId, productId: product.id, userId: req.user!.id, quantityDelta: input.quantityDelta,
    type: input.type, reason: input.reason || null,
  });
  await recordActivity({
    businessId, userId: req.user!.id, userName: displayName(req.user!), action: "updated",
    entityType: "inventory_product", entityId: product.id, entityName: product.name,
    description: displayName(req.user!) + " adjusted " + product.name + " stock by " + (input.quantityDelta > 0 ? "+" : "") + input.quantityDelta,
    status: "success",
  });
  res.json(await serializeWithImage(updated));
});

export default router;
