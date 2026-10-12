import { Router, type IRouter } from "express";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db, users, businesses, customers, transactions, inventoryProducts, crmInteractions, dailyLedgerEntries } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { fromMinorUnits } from "../lib/money";

const router: IRouter = Router();

router.get("/admin/platform/records", requireAdmin, async (_req, res) => {
  const [userRows, businessRows, customerRows, transactionRows] = await Promise.all([
    db.select({
      id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email,
      phoneCountryCode: users.phoneCountryCode, phoneNumber: users.phoneNumber, role: users.role,
      status: users.status, businessId: users.businessId, businessName: businesses.name, createdAt: users.createdAt,
    }).from(users).leftJoin(businesses, eq(businesses.id, users.businessId))
      .orderBy(desc(users.createdAt)).limit(300),
    db.select({
      id: businesses.id, name: businesses.name, type: businesses.type, industry: businesses.industry,
      country: businesses.country, city: businesses.city, phone: businesses.phone, email: businesses.email,
      status: businesses.status, createdAt: businesses.createdAt,
    }).from(businesses).orderBy(desc(businesses.createdAt)).limit(300),
    db.select({
      id: customers.id, firstName: customers.firstName, lastName: customers.lastName,
      email: customers.email, phone: customers.phone, company: customers.company,
      status: customers.status, businessName: businesses.name, createdAt: customers.createdAt,
    }).from(customers).innerJoin(businesses, eq(businesses.id, customers.businessId))
      .orderBy(desc(customers.createdAt)).limit(300),
    db.select({
      id: transactions.id, reference: transactions.reference, amountMinor: transactions.amountMinor,
      currency: transactions.currency, type: transactions.type, status: transactions.status,
      description: transactions.description, businessName: businesses.name, createdAt: transactions.createdAt,
    }).from(transactions).innerJoin(businesses, eq(businesses.id, transactions.businessId))
      .orderBy(desc(transactions.createdAt)).limit(300),
  ]);
  res.json({
    users: userRows.map((row) => ({
      id: row.id, name: [row.firstName, row.lastName].filter(Boolean).join(" ") || "Name pending",
      email: row.email, phone: row.phoneCountryCode + " " + row.phoneNumber, role: row.role,
      status: row.status, businessName: row.businessName, createdAt: row.createdAt.toISOString(),
    })),
    businesses: businessRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    customers: customerRows.map((row) => ({
      ...row, name: [row.firstName, row.lastName].filter(Boolean).join(" "),
      createdAt: row.createdAt.toISOString(),
    })),
    transactions: transactionRows.map((row) => ({
      ...row, amount: fromMinorUnits(Number(row.amountMinor), row.currency),
      createdAt: row.createdAt.toISOString(),
    })),
  });
});

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

router.get("/admin/platform/daily-ledger", requireAdmin, async (_req, res) => {
  const rows = await db.select({
    id: dailyLedgerEntries.id,
    businessId: dailyLedgerEntries.businessId,
    businessName: businesses.name,
    entryType: dailyLedgerEntries.entryType,
    description: dailyLedgerEntries.description,
    category: dailyLedgerEntries.category,
    amountMinor: dailyLedgerEntries.amountMinor,
    balanceMinor: dailyLedgerEntries.balanceMinor,
    currency: dailyLedgerEntries.currency,
    customerName: dailyLedgerEntries.customerName,
    dueDate: dailyLedgerEntries.dueDate,
    status: dailyLedgerEntries.status,
    recordedDate: dailyLedgerEntries.recordedDate,
    createdAt: dailyLedgerEntries.createdAt,
  }).from(dailyLedgerEntries)
    .innerJoin(businesses, eq(businesses.id, dailyLedgerEntries.businessId))
    .orderBy(desc(dailyLedgerEntries.recordedDate), desc(dailyLedgerEntries.createdAt))
    .limit(500);
  res.json(rows.map((row) => ({
    ...row,
    amount: fromMinorUnits(Number(row.amountMinor), row.currency),
    balance: row.entryType === "debt" ? fromMinorUnits(Number(row.balanceMinor ?? row.amountMinor), row.currency) : null,
    createdAt: row.createdAt.toISOString(),
  })));
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
