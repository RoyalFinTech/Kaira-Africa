import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, dailyLedgerEntries } from "@workspace/db";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { displayName } from "../lib/display-name";
import { recordActivity } from "../repositories/activity-logs";
import { BadRequestError, NotFoundError } from "../lib/http-errors";
import { fromMinorUnits, toMinorUnits } from "../lib/money";

const router: IRouter = Router();
const entryTypes = ["sale", "expense", "debt", "debt_payment", "other_income"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const createEntryInput = z.object({
  entryType: z.enum(entryTypes),
  description: z.string().trim().min(2).max(200),
  category: z.string().trim().max(80).optional(),
  amount: z.number().finite().positive().max(1_000_000_000),
  currency: z.literal("GMD").default("GMD"),
  customerName: z.string().trim().max(160).optional(),
  dueDate: z.string().regex(datePattern, "Use YYYY-MM-DD for due date").optional(),
  recordedDate: z.string().regex(datePattern, "Use YYYY-MM-DD for record date").optional(),
});

function dateOnlyNow() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartToday() {
  return new Date().toISOString().slice(0, 7) + "-01";
}
function serialize(entry: typeof dailyLedgerEntries.$inferSelect) {
  return {
    id: entry.id,
    entryType: entry.entryType,
    description: entry.description,
    category: entry.category,
    amount: fromMinorUnits(Number(entry.amountMinor), entry.currency),
    currency: entry.currency,
    customerName: entry.customerName,
    dueDate: entry.dueDate,
    status: entry.status,
    recordedDate: entry.recordedDate,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

router.get("/daily-ledger", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const query = z.object({
    startDate: z.string().regex(datePattern).optional(),
    endDate: z.string().regex(datePattern).optional(),
  }).parse(req.query);
  const startDate = query.startDate ?? monthStartToday();
  const endDate = query.endDate ?? dateOnlyNow();
  if (startDate > endDate) throw new BadRequestError("Start date must be on or before end date");

  const conditions = and(
    eq(dailyLedgerEntries.businessId, businessId),
    gte(dailyLedgerEntries.recordedDate, startDate),
    lte(dailyLedgerEntries.recordedDate, endDate),
  );

  const [entries, [totals], trend, expensesByCategory] = await Promise.all([
    db.select().from(dailyLedgerEntries).where(conditions)
      .orderBy(desc(dailyLedgerEntries.recordedDate), desc(dailyLedgerEntries.createdAt)).limit(500),
    db.select({
      salesMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'sale' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
      expenseMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'expense' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
      outstandingDebtMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'debt' and ${dailyLedgerEntries.status} = 'unpaid' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
      debtPaymentMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'debt_payment' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
      otherIncomeMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'other_income' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
      totalRecords: sql<number>`count(*)`,
    }).from(dailyLedgerEntries).where(conditions),
    db.select({
      date: dailyLedgerEntries.recordedDate,
      salesMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'sale' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
      expenseMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'expense' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
    }).from(dailyLedgerEntries).where(conditions).groupBy(dailyLedgerEntries.recordedDate)
      .orderBy(dailyLedgerEntries.recordedDate),
    db.select({
      label: sql<string>`coalesce(${dailyLedgerEntries.category}, 'Other / not categorised')`,
      amountMinor: sql<number>`coalesce(sum(${dailyLedgerEntries.amountMinor}), 0)`,
    }).from(dailyLedgerEntries).where(and(conditions, eq(dailyLedgerEntries.entryType, "expense")))
      .groupBy(sql`coalesce(${dailyLedgerEntries.category}, 'Other / not categorised')`)
      .orderBy(desc(sql`sum(${dailyLedgerEntries.amountMinor})`)),
  ]);

  const sales = fromMinorUnits(Number(totals.salesMinor), "GMD");
  const expenses = fromMinorUnits(Number(totals.expenseMinor), "GMD");
  res.json({
    startDate, endDate,
    entries: entries.map(serialize),
    summary: {
      sales,
      expenses,
      outstandingDebt: fromMinorUnits(Number(totals.outstandingDebtMinor), "GMD"),
      debtPayments: fromMinorUnits(Number(totals.debtPaymentMinor), "GMD"),
      otherIncome: fromMinorUnits(Number(totals.otherIncomeMinor), "GMD"),
      salesLessExpenses: Number((sales - expenses).toFixed(2)),
      totalRecords: Number(totals.totalRecords),
    },
    dailyTrend: trend.map((row) => ({
      date: row.date,
      sales: fromMinorUnits(Number(row.salesMinor), "GMD"),
      expenses: fromMinorUnits(Number(row.expenseMinor), "GMD"),
    })),
    expensesByCategory: expensesByCategory.map((row) => ({
      label: row.label,
      value: fromMinorUnits(Number(row.amountMinor), "GMD"),
    })),
  });
});

router.post("/daily-ledger", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const businessId = requireBusiness(req);
  const input = createEntryInput.parse(req.body);
  const recordedDate = input.recordedDate ?? dateOnlyNow();
  if (input.dueDate && input.dueDate < recordedDate) {
    throw new BadRequestError("Debt due date cannot be earlier than the recorded date");
  }
  if (input.entryType === "debt" && !input.customerName?.trim()) {
    throw new BadRequestError("Add the debtor or customer name for an unpaid debt");
  }
  const [entry] = await db.insert(dailyLedgerEntries).values({
    businessId,
    createdBy: req.user!.id,
    entryType: input.entryType,
    description: input.description,
    category: input.category || null,
    amountMinor: toMinorUnits(input.amount, input.currency),
    currency: input.currency,
    customerName: input.customerName?.trim() || null,
    dueDate: input.dueDate || null,
    status: input.entryType === "debt" ? "unpaid" : "recorded",
    recordedDate,
  }).returning();

  await recordActivity({
    businessId, userId: req.user!.id, userName: displayName(req.user!), action: "created",
    entityType: "daily_ledger_entry", entityId: entry.id, entityName: entry.description,
    description: displayName(req.user!) + " recorded a daily " + entry.entryType.replace("_", " ") + " of " +
      input.amount.toLocaleString("en-GM", { maximumFractionDigits: 2 }) + " GMD",
    status: "success",
  });
  res.status(201).json(serialize(entry));
});

router.patch("/daily-ledger/:id/status", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const businessId = requireBusiness(req);
  const input = z.object({ status: z.enum(["paid", "unpaid"]) }).parse(req.body);
  const [existing] = await db.select().from(dailyLedgerEntries).where(and(
    eq(dailyLedgerEntries.id, req.params.id as string),
    eq(dailyLedgerEntries.businessId, businessId),
  )).limit(1);
  if (!existing) throw new NotFoundError("Daily ledger entry not found");
  if (existing.entryType !== "debt") throw new BadRequestError("Only debtor records can be marked paid or unpaid");
  const [updated] = await db.update(dailyLedgerEntries).set({
    status: input.status, updatedAt: new Date(),
  }).where(and(eq(dailyLedgerEntries.id, existing.id), eq(dailyLedgerEntries.businessId, businessId))).returning();
  await recordActivity({
    businessId, userId: req.user!.id, userName: displayName(req.user!), action: "updated",
    entityType: "daily_ledger_entry", entityId: updated.id, entityName: updated.description,
    description: "Debtor record marked " + input.status + ": " + updated.description,
    status: "success",
  });
  res.json(serialize(updated));
});

export default router;
