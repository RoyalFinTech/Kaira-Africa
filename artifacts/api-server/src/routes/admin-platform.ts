import { Router, type IRouter } from "express";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db, users, businesses, customers, transactions, inventoryProducts, crmInteractions } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/platform/overview", requireAdmin, async (_req, res) => {
  const since = new Date(); since.setDate(since.getDate() - 13);
  const results = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(businesses),
    db.select({ value: count() }).from(customers),
    db.select({ value: count() }).from(transactions),
    db.select({ value: sql.raw("coalesce(sum(transactions.amount_minor), 0)") }).from(transactions).where(and(eq(transactions.type, "payment"), eq(transactions.status, "completed"))),
    db.select({ label: transactions.status, value: count() }).from(transactions).groupBy(transactions.status),
    db.select({ label: businesses.country, value: count() }).from(businesses).groupBy(businesses.country).orderBy(desc(count())),
    db.select({ label: sql.raw("to_char(date_trunc('day', transactions.created_at), 'YYYY-MM-DD')"), value: sql.raw("coalesce(sum(case when transactions.type = 'payment' and transactions.status = 'completed' then transactions.amount_minor else 0 end), 0)") })
      .from(transactions).where(gte(transactions.createdAt, since)).groupBy(sql.raw("date_trunc('day', transactions.created_at)")).orderBy(sql.raw("date_trunc('day', transactions.created_at)")),
  ]);
  const userCount = results[0][0]?.value ?? 0, businessCount = results[1][0]?.value ?? 0, customerCount = results[2][0]?.value ?? 0;
  const transactionCount = results[3][0]?.value ?? 0, revenue = results[4][0]?.value ?? 0;
  res.json({
    metrics: { users: Number(userCount), businesses: Number(businessCount), customers: Number(customerCount), transactions: Number(transactionCount), revenue: Number(revenue) / 100 },
    transactionsByStatus: results[5].map((r) => ({ label: r.label, value: Number(r.value) })),
    businessesByCountry: results[6].map((r) => ({ label: r.label || "Unknown", value: Number(r.value) })),
    revenueTrend: results[7].map((r) => ({ label: String(r.label), value: Number(r.value) / 100 })),
  });
});

router.get("/admin/platform/crm", requireAdmin, async (_req, res) => {
  const rows = await db.select({
    customerId: customers.id, customerName: sql.raw("concat(customers.first_name, ' ', customers.last_name)"),
    businessName: businesses.name, phone: customers.phone, email: customers.email,
    customerStatus: customers.status, createdAt: customers.createdAt,
    interactionCount: sql.raw("count(crm_interactions.id)"),
  }).from(customers).innerJoin(businesses, eq(businesses.id, customers.businessId))
    .leftJoin(crmInteractions, eq(crmInteractions.customerId, customers.id))
    .groupBy(customers.id, businesses.id).orderBy(desc(customers.createdAt)).limit(200);
  res.json(rows.map((r) => ({ ...r, customerName: String(r.customerName), interactionCount: Number(r.interactionCount), createdAt: r.createdAt.toISOString() })));
});

router.get("/admin/platform/inventory", requireAdmin, async (_req, res) => {
  const rows = await db.select({
    id: inventoryProducts.id, name: inventoryProducts.name, sku: inventoryProducts.sku,
    businessName: businesses.name, quantity: inventoryProducts.quantity, reorderLevel: inventoryProducts.reorderLevel,
    inventoryValueMinor: sql.raw("(inventory_products.quantity * inventory_products.unit_cost_minor)"),
  }).from(inventoryProducts).innerJoin(businesses, eq(businesses.id, inventoryProducts.businessId))
    .orderBy(inventoryProducts.quantity).limit(200);
  res.json(rows.map((r) => ({ ...r, inventoryValue: Number(r.inventoryValueMinor) / 100 })));
});

export default router;
