import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, inventoryProducts, inventoryMovements } from "@workspace/db";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { displayName } from "../lib/display-name";
import { recordActivity } from "../repositories/activity-logs";
import { BadRequestError, NotFoundError } from "../lib/http-errors";

const router: IRouter = Router();

const productInput = z.object({
  name: z.string().trim().min(1).max(160), sku: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9._-]+$/),
  category: z.string().trim().max(80).optional(), unit: z.string().trim().max(30).default("unit"),
  quantity: z.number().int().min(0).default(0), reorderLevel: z.number().int().min(0).default(5),
  unitCost: z.number().min(0).default(0), salePrice: z.number().min(0).default(0),
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

router.get("/inventory/products", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const products = await db.select().from(inventoryProducts).where(eq(inventoryProducts.businessId, businessId)).orderBy(asc(inventoryProducts.name));
  res.json(products.map(serialize));
});

router.post("/inventory/products", requireUser, requireRole("owner", "admin", "manager"), async (req, res) => {
  const input = productInput.parse(req.body); const businessId = requireBusiness(req);
  try {
    const [created] = await db.insert(inventoryProducts).values({
      businessId, name: input.name, sku: input.sku, category: input.category || null, unit: input.unit,
      quantity: input.quantity, reorderLevel: input.reorderLevel, unitCostMinor: Math.round(input.unitCost * 100),
      salePriceMinor: Math.round(input.salePrice * 100),
    }).returning();
    if (input.quantity) await db.insert(inventoryMovements).values({
      businessId, productId: created.id, userId: req.user!.id, quantityDelta: input.quantity, type: "initial", reason: "Opening stock",
    });
    await recordActivity({
      businessId, userId: req.user!.id, userName: displayName(req.user!), action: "created",
      entityType: "inventory_product", entityId: created.id, entityName: created.name,
      description: displayName(req.user!) + " added inventory product " + created.name, status: "success",
    });
    res.status(201).json(serialize(created));
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new BadRequestError("That SKU already exists for this business");
    throw error;
  }
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
  res.json(serialize(updated));
});

export default router;
