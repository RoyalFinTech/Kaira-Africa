import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, aiInsights, inventoryProducts } from "@workspace/db";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { getRevenueAnalytics, getCustomerAnalytics, getTransactionAnalytics } from "../repositories/analytics";

const router: IRouter = Router();

async function inventorySnapshot(businessId: string) {
  const products = await db.select({
    quantity: inventoryProducts.quantity, reorderLevel: inventoryProducts.reorderLevel, unitCostMinor: inventoryProducts.unitCostMinor,
  }).from(inventoryProducts).where(and(eq(inventoryProducts.businessId, businessId), eq(inventoryProducts.active, true)));
  return {
    products: products.length,
    lowStock: products.filter((p) => p.quantity <= p.reorderLevel).length,
    inventoryValue: products.reduce((sum, p) => sum + p.quantity * Number(p.unitCostMinor), 0) / 100,
  };
}

router.post("/ai/insights/generate", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const [revenue, customers, transactions, inventory] = await Promise.all([
    getRevenueAnalytics(businessId, "month"), getCustomerAnalytics(businessId, "month"),
    getTransactionAnalytics(businessId, "month"), inventorySnapshot(businessId),
  ]);
  const generated = [
    { kind: "sales", title: revenue.changePercent >= 0 ? "Revenue momentum is positive" : "Revenue needs attention",
      summary: "Revenue for this period is " + revenue.total.toLocaleString("en-GM", { maximumFractionDigits: 2 }) + " GMD, " + Math.abs(revenue.changePercent) + "% " + (revenue.changePercent >= 0 ? "above" : "below") + " the previous period.",
      payload: { changePercent: revenue.changePercent, total: revenue.total } },
    { kind: "customers", title: "Customer base signal",
      summary: String(customers.total) + " customers were added in the selected period, with a " + String(customers.changePercent) + "% change from the prior period.",
      payload: { total: customers.total, changePercent: customers.changePercent } },
    { kind: "inventory", title: inventory.lowStock ? "Inventory reorder watch" : "Inventory is healthy",
      summary: inventory.lowStock ? String(inventory.lowStock) + " products are at or below their reorder level. Review these items before the next sales cycle." : "No products are currently at or below their configured reorder level.",
      payload: inventory },
    { kind: "transactions", title: "Transaction pattern",
      summary: String(transactions.total) + " transactions were recorded in this period with a total volume of " + transactions.volume.toLocaleString("en-GM", { maximumFractionDigits: 2 }) + " GMD.",
      payload: { total: transactions.total, volume: transactions.volume } },
  ];
  const rows = await Promise.all(generated.map((x) => db.insert(aiInsights).values({
    businessId, kind: x.kind, title: x.title, summary: x.summary, payload: x.payload,
  }).returning()));
  res.status(201).json(rows.map(([row]) => ({ ...row, generatedAt: row.generatedAt.toISOString(), createdAt: row.createdAt.toISOString() })));
});

router.get("/ai/insights", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const rows = await db.select().from(aiInsights).where(eq(aiInsights.businessId, businessId)).orderBy(desc(aiInsights.generatedAt)).limit(20);
  res.json(rows.map((row) => ({ ...row, generatedAt: row.generatedAt.toISOString(), createdAt: row.createdAt.toISOString() })));
});

export default router;
