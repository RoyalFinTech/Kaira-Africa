import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, inventoryProducts, inventoryMovements } from "@workspace/db";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { displayName } from "../lib/display-name";
import { recordActivitySafely } from "../repositories/activity-logs";
import { BadRequestError, HttpError, NotFoundError } from "../lib/http-errors";
import { hasSupabaseStorageConfig, requireSupabaseStorageConfig } from "../lib/supabase-storage";
import { logger } from "../lib/logger";
import { inventoryImageObjectPath, isInventoryImagePathForProduct, extractSignedInventoryImageUrl, parseInventoryPhotoDataUrl } from "../lib/inventory-image";

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

async function describeInventoryStorageFailure(response: Response, operation: "upload" | "signing"): Promise<string> {
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
    // Use the status-based message when Storage doesn't return JSON.
  }

  if (response.status === 401 || response.status === 403) {
    return "Supabase Storage rejected the API credentials. Confirm SUPABASE_URL matches the Kaira Africa project and that SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is configured on the API service in Render.";
  }
  if (response.status === 404) {
    return "Supabase could not find the private inventory-images bucket or object path. Confirm the bucket exists in the project configured for the Kaira Africa API.";
  }
  if (response.status === 413) {
    return "Supabase rejected the photo because it exceeds the 200 KB inventory image limit. Choose a smaller photo.";
  }
  if (response.status === 400 && /mime|content.?type|image/i.test(remoteMessage)) {
    return "Supabase rejected the photo format. Choose a JPEG image.";
  }
  const action = operation === "upload" ? "photo upload" : "private photo preview link";
  return "Supabase Storage rejected the inventory " + action + " (HTTP " + response.status + ")" +
    (remoteMessage ? ": " + remoteMessage : ". Check the private inventory-images bucket and API Storage configuration.");
}

async function requestSignedInventoryImageUrl(storage: ReturnType<typeof requireSupabaseStorageConfig>, objectPath: string): Promise<string> {
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(storage.base + "/storage/v1/object/sign/inventory-images/" + encodedPath, {
    method: "POST",
    headers: { ...storage.headers, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 86400 }),
  });
  if (!response.ok) {
    const message = await describeInventoryStorageFailure(response, "signing");
    throw new HttpError(502, "inventory_image_signing_failed", message);
  }
  try {
    return extractSignedInventoryImageUrl(await response.json(), storage.base);
  } catch {
    throw new HttpError(502, "inventory_image_signing_failed", "Supabase accepted the photo but did not return a valid private preview link. Try the upload again.");
  }
}

async function removeInventoryImageObject(storage: ReturnType<typeof requireSupabaseStorageConfig>, objectPath: string, businessId: string, productId: string): Promise<void> {
  if (!isInventoryImagePathForProduct(objectPath, businessId, productId)) return;
  try {
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(storage.base + "/storage/v1/object/inventory-images/" + encodedPath, {
      method: "DELETE",
      headers: storage.headers,
    });
    if (!response.ok && response.status !== 404) {
      logger.warn({ statusCode: response.status }, "Could not clean up an unused inventory image object");
    }
  } catch {
    logger.warn("Could not clean up an unused inventory image object");
  }
}

async function serializeWithImage(p: typeof inventoryProducts.$inferSelect) {
  const product = serialize(p);
  if (!p.imageUrl || /^https?:\/\//i.test(p.imageUrl)) return product;
  if (!isInventoryImagePathForProduct(p.imageUrl, p.businessId, p.id)) return { ...product, imageUrl: null };
  if (!hasSupabaseStorageConfig()) return { ...product, imageUrl: null };
  const storage = requireSupabaseStorageConfig("Inventory product image storage");
  try {
    return { ...product, imageUrl: await requestSignedInventoryImageUrl(storage, p.imageUrl) };
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : "Unknown signing error" }, "Could not create a signed URL for an inventory product image");
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
    // Keep opening stock and its initial movement history in sync.
    const created = await db.transaction(async (tx) => {
      const [product] = await tx.insert(inventoryProducts).values({
        businessId, name: input.name, sku: input.sku, category: input.category || null, unit: input.unit,
        quantity: input.quantity, reorderLevel: input.reorderLevel, unitCostMinor: Math.round(input.unitCost * 100),
        salePriceMinor: Math.round(input.salePrice * 100), currency: input.currency,
      }).returning();
      if (input.quantity) await tx.insert(inventoryMovements).values({
        businessId, productId: product.id, userId: req.user!.id, quantityDelta: input.quantity, type: "initial", reason: "Opening stock",
      });
      return product;
    });
    await recordActivitySafely({
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
  let bytes: Buffer;
  try { bytes = parseInventoryPhotoDataUrl(dataUrl); }
  catch (error) { throw new BadRequestError(error instanceof Error ? error.message : "Choose a valid JPEG product photo."); }
  const objectPath = inventoryImageObjectPath(businessId, product.id);
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
    const message = await describeInventoryStorageFailure(upload, "upload");
    logger.error({ statusCode: upload.status }, "Supabase Storage rejected an inventory photo upload");
    throw new HttpError(502, "inventory_image_upload_failed", message);
  }

  let signedUrl: string;
  try {
    // Do not report success or persist a new path until Storage can create
    // the private signed URL that the UI needs to display the uploaded photo.
    signedUrl = await requestSignedInventoryImageUrl(storage, objectPath);
  } catch (error) {
    if (product.imageUrl !== objectPath) await removeInventoryImageObject(storage, objectPath, businessId, product.id);
    if (error instanceof HttpError) throw error;
    logger.error({ error: error instanceof Error ? error.message : "Unknown signing error" }, "Could not verify the inventory image preview URL");
    throw new HttpError(502, "inventory_image_signing_failed", "The photo was uploaded but its private preview link could not be verified. Please retry the photo upload.");
  }

  let updated: typeof inventoryProducts.$inferSelect | undefined;
  try {
    [updated] = await db.update(inventoryProducts).set({ imageUrl: objectPath, updatedAt: new Date() })
      .where(and(eq(inventoryProducts.id, product.id), eq(inventoryProducts.businessId, businessId))).returning();
    if (!updated) throw new NotFoundError("Inventory product not found");
  } catch (error) {
    if (product.imageUrl !== objectPath) await removeInventoryImageObject(storage, objectPath, businessId, product.id);
    throw error;
  }

  if (product.imageUrl && product.imageUrl !== objectPath) {
    await removeInventoryImageObject(storage, product.imageUrl, businessId, product.id);
  }
  res.json({ ...serialize(updated), imageUrl: signedUrl });
});

router.post("/inventory/products/:id/adjust", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const input = adjustmentInput.parse(req.body);
  const businessId = requireBusiness(req);

  // Lock the product row and write the new quantity + movement in one transaction.
  // This prevents concurrent stock adjustments from overwriting each other and
  // prevents a movement record from being committed without its matching quantity.
  const result = await db.transaction(async (tx) => {
    const [product] = await tx.select().from(inventoryProducts).where(and(
      eq(inventoryProducts.id, req.params.id as string),
      eq(inventoryProducts.businessId, businessId),
    )).limit(1).for("update");
    if (!product) throw new NotFoundError("Inventory product not found");
    const nextQuantity = product.quantity + input.quantityDelta;
    if (nextQuantity < 0) throw new BadRequestError("Stock cannot fall below zero");

    const [updated] = await tx.update(inventoryProducts).set({ quantity: nextQuantity, updatedAt: new Date() })
      .where(and(eq(inventoryProducts.id, product.id), eq(inventoryProducts.businessId, businessId))).returning();
    if (!updated) throw new NotFoundError("Inventory product not found");
    await tx.insert(inventoryMovements).values({
      businessId, productId: product.id, userId: req.user!.id, quantityDelta: input.quantityDelta,
      type: input.type, reason: input.reason || null,
    });
    return { product, updated };
  });

  await recordActivitySafely({
    businessId, userId: req.user!.id, userName: displayName(req.user!), action: "updated",
    entityType: "inventory_product", entityId: result.product.id, entityName: result.product.name,
    description: displayName(req.user!) + " adjusted " + result.product.name + " stock by " + (input.quantityDelta > 0 ? "+" : "") + input.quantityDelta,
    status: "success",
  });
  res.json(await serializeWithImage(result.updated));
});

export default router;
