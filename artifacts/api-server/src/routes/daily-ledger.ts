import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, dailyLedgerEntries, inventoryProducts, inventoryMovements } from "@workspace/db";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { displayName } from "../lib/display-name";
import { recordActivity } from "../repositories/activity-logs";
import { BadRequestError, NotFoundError } from "../lib/http-errors";
import { fromMinorUnits, toMinorUnits } from "../lib/money";
import { allocateDebtPayment } from "../lib/debt-allocation";

const router: IRouter = Router();
const entryTypes = ["sale", "expense", "debt", "debt_payment", "other_income"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const createEntryInput = z.object({
  entryType: z.enum(entryTypes),
  description: z.string().trim().min(2).max(200),
  category: z.string().trim().max(80).optional(),
  amount: z.number().finite().positive().max(1_000_000_000),
  currency: z.enum(["GMD", "NGN", "USD"]).default("GMD"),
  customerName: z.string().trim().max(160).optional(),
  productId: z.string().uuid().optional(),
  quantity: z.number().int().positive().max(100000).optional(),
  dueDate: z.string().regex(datePattern, "Use YYYY-MM-DD for due date").optional(),
  recordedDate: z.string().regex(datePattern, "Use YYYY-MM-DD for record date").optional(),
  recordedTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM for record time").optional(),
  paymentMethod: z.enum(["cash", "bank_transfer", "mobile_money", "card", "credit", "other"]).optional(),
  remarks: z.string().trim().max(500).optional(),
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
    balance: entry.entryType === "debt" ? fromMinorUnits(Number(entry.balanceMinor ?? entry.amountMinor), entry.currency) : null,
    currency: entry.currency,
    customerName: entry.customerName,
    productId: entry.productId,
    quantity: entry.quantity,
    dueDate: entry.dueDate,
    status: entry.status,
    recordedDate: entry.recordedDate,
    recordedTime: entry.recordedTime,
    paymentMethod: entry.paymentMethod,
    remarks: entry.remarks,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

router.get("/daily-ledger", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const query = z.object({
    startDate: z.string().regex(datePattern).optional(),
    endDate: z.string().regex(datePattern).optional(),
    currency: z.enum(["GMD", "NGN", "USD"]).default("GMD"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  }).parse(req.query);
  const startDate = query.startDate ?? monthStartToday();
  const endDate = query.endDate ?? dateOnlyNow();
  const offset = (query.page - 1) * query.pageSize;
  if (startDate > endDate) throw new BadRequestError("Start date must be on or before end date");

  const conditions = and(
    eq(dailyLedgerEntries.businessId, businessId),
    gte(dailyLedgerEntries.recordedDate, startDate),
    lte(dailyLedgerEntries.recordedDate, endDate),
    eq(dailyLedgerEntries.currency, query.currency),
  );

  const [entries, [totals], [outstandingTotals], trend, expensesByCategory] = await Promise.all([
    db.select().from(dailyLedgerEntries).where(conditions)
      .orderBy(desc(dailyLedgerEntries.recordedDate), desc(dailyLedgerEntries.createdAt))
      .limit(query.pageSize).offset(offset),
    db.select({
      salesMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'sale' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
      expenseMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'expense' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
      debtPaymentMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'debt_payment' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
      otherIncomeMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'other_income' then ${dailyLedgerEntries.amountMinor} else 0 end), 0)`,
      totalRecords: sql<number>`count(*)`,
    }).from(dailyLedgerEntries).where(conditions),
    db.select({
      outstandingDebtMinor: sql<number>`coalesce(sum(case when ${dailyLedgerEntries.entryType} = 'debt' and ${dailyLedgerEntries.status} = 'unpaid' then coalesce(${dailyLedgerEntries.balanceMinor}, ${dailyLedgerEntries.amountMinor}) else 0 end), 0)`,
    }).from(dailyLedgerEntries).where(and(
      eq(dailyLedgerEntries.businessId, businessId),
      eq(dailyLedgerEntries.currency, query.currency),
    )),
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

  const sales = fromMinorUnits(Number(totals.salesMinor), query.currency);
  const expenses = fromMinorUnits(Number(totals.expenseMinor), query.currency);
  res.json({
    startDate, endDate, currency: query.currency,
    entries: entries.map(serialize),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total: Number(totals.totalRecords),
      totalPages: Math.max(1, Math.ceil(Number(totals.totalRecords) / query.pageSize)),
    },
    summary: {
      sales,
      expenses,
      outstandingDebt: fromMinorUnits(Number(outstandingTotals.outstandingDebtMinor), query.currency),
      debtPayments: fromMinorUnits(Number(totals.debtPaymentMinor), query.currency),
      otherIncome: fromMinorUnits(Number(totals.otherIncomeMinor), query.currency),
      salesLessExpenses: Number((sales - expenses).toFixed(2)),
      totalRecords: Number(totals.totalRecords),
    },
    dailyTrend: trend.map((row) => ({
      date: row.date,
      sales: fromMinorUnits(Number(row.salesMinor), query.currency),
      expenses: fromMinorUnits(Number(row.expenseMinor), query.currency),
    })),
    expensesByCategory: expensesByCategory.map((row) => ({
      label: row.label,
      value: fromMinorUnits(Number(row.amountMinor), query.currency),
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
  if ((input.entryType === "debt" || input.entryType === "debt_payment") && !input.customerName?.trim()) {
    throw new BadRequestError(input.entryType === "debt"
      ? "Add the debtor or customer name for an unpaid debt"
      : "Add the customer name so this payment can be applied to their outstanding debt");
  }
  if (input.productId && input.entryType !== "sale") {
    throw new BadRequestError("Inventory products can only be attached to a sale");
  }
  if (input.productId && (!input.quantity || input.quantity < 1)) {
    throw new BadRequestError("Enter the quantity sold from inventory");
  }

  const entry = await db.transaction(async (tx) => {
    let amountMinor = toMinorUnits(input.amount, input.currency);
    let productId: string | null = null;
    let quantity: number | null = null;
    let description = input.description;

    // Allocate payments oldest-first under row locks to prevent double spending.
    if (input.entryType === "debt_payment") {
      const customerKey = input.customerName!.trim().toLocaleLowerCase();
      const openDebts = await tx.select().from(dailyLedgerEntries).where(and(
        eq(dailyLedgerEntries.businessId, businessId),
        eq(dailyLedgerEntries.entryType, "debt"),
        eq(dailyLedgerEntries.status, "unpaid"),
        eq(dailyLedgerEntries.currency, input.currency),
        sql`lower(trim(coalesce(${dailyLedgerEntries.customerName}, ''))) = ${customerKey}`,
      )).orderBy(asc(dailyLedgerEntries.recordedDate), asc(dailyLedgerEntries.createdAt)).for("update");
      const totalDueMinor = openDebts.reduce((sum, debt) => sum + Number(debt.balanceMinor ?? debt.amountMinor), 0);
      const allocation = allocateDebtPayment(amountMinor, openDebts);
      if (!allocation && totalDueMinor <= 0) {
        throw new BadRequestError("No unpaid debt was found for " + input.customerName + ". Check the name against the original debtor record.");
      }
      if (!allocation && amountMinor > totalDueMinor) {
        throw new BadRequestError("This payment exceeds " + input.customerName + "'s remaining debt of " +
          fromMinorUnits(totalDueMinor, input.currency).toLocaleString("en", { maximumFractionDigits: 2 }) + " " + input.currency + ".");
      }
      if (!allocation) throw new BadRequestError("Enter a valid payment amount and try again.");
      for (const item of allocation.allocations) {
        await tx.update(dailyLedgerEntries).set({
          balanceMinor: item.balanceMinor,
          status: item.status,
          updatedAt: new Date(),
        }).where(and(
          eq(dailyLedgerEntries.id, item.id),
          eq(dailyLedgerEntries.businessId, businessId),
        ));
      }
    }

    if (input.productId) {
      const [product] = await tx.select().from(inventoryProducts).where(and(
        eq(inventoryProducts.id, input.productId),
        eq(inventoryProducts.businessId, businessId),
        eq(inventoryProducts.active, true),
      )).limit(1).for("update");
      if (!product) throw new NotFoundError("Inventory product not found in this business");
      if (product.currency !== input.currency) {
        throw new BadRequestError("The selected inventory product uses " + product.currency + ". Change the ledger currency to match the product, or select a product priced in " + input.currency + ".");
      }
      if (product.salePriceMinor <= 0) {
        throw new BadRequestError("Set a sale price for this inventory product before recording a sale");
      }
      if (product.quantity < input.quantity!) {
        throw new BadRequestError("Not enough stock. Available: " + product.quantity + " " + product.unit);
      }
      amountMinor = product.salePriceMinor * input.quantity!;
      productId = product.id;
      quantity = input.quantity!;
      description = input.description + " · " + quantity + " × " + product.name;
      await tx.update(inventoryProducts).set({
        quantity: product.quantity - quantity,
        updatedAt: new Date(),
      }).where(and(
        eq(inventoryProducts.id, product.id),
        eq(inventoryProducts.businessId, businessId),
      ));
      await tx.insert(inventoryMovements).values({
        businessId,
        productId: product.id,
        userId: req.user!.id,
        quantityDelta: -quantity,
        type: "sale",
        reason: input.description,
      });
    }

    const [created] = await tx.insert(dailyLedgerEntries).values({
      businessId,
      createdBy: req.user!.id,
      entryType: input.entryType,
      description,
      category: input.category || null,
      amountMinor,
      balanceMinor: input.entryType === "debt" ? amountMinor : null,
      currency: input.currency,
      customerName: input.customerName?.trim() || null,
      productId,
      quantity,
      dueDate: input.dueDate || null,
      status: input.entryType === "debt" ? "unpaid" : "recorded",
      recordedDate,
      recordedTime: input.recordedTime || null,
      paymentMethod: input.paymentMethod || null,
      remarks: input.remarks?.trim() || null,
    }).returning();
    return created;
  });

  await recordActivity({
    businessId, userId: req.user!.id, userName: displayName(req.user!), action: "created",
    entityType: "daily_ledger_entry", entityId: entry.id, entityName: entry.description,
    description: displayName(req.user!) + " recorded a daily " + entry.entryType.replace("_", " ") + " of " +
      input.amount.toLocaleString("en", { maximumFractionDigits: 2 }) + " " + input.currency,
    status: "success",
  });
  res.status(201).json(serialize(entry));
});

router.patch("/daily-ledger/:id/status", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const businessId = requireBusiness(req);
  const input = z.object({ status: z.enum(["paid", "unpaid"]) }).parse(req.body);
  const entryId = req.params.id as string;
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(dailyLedgerEntries).where(and(
      eq(dailyLedgerEntries.id, entryId),
      eq(dailyLedgerEntries.businessId, businessId),
    )).limit(1).for("update");
    if (!existing) throw new NotFoundError("Daily ledger entry not found");
    if (existing.entryType !== "debt") throw new BadRequestError("Only debtor records can be marked paid or unpaid");
    if (input.status === "unpaid" && existing.status === "paid") {
      throw new BadRequestError("A paid debtor entry cannot be reopened because payments have already been allocated. Record a new credit sale instead.");
    }
    const remainingMinor = Number(existing.balanceMinor ?? existing.amountMinor);
    if (input.status === "paid" && existing.status !== "paid" && remainingMinor > 0) {
      await tx.insert(dailyLedgerEntries).values({
        businessId,
        createdBy: req.user!.id,
        entryType: "debt_payment",
        description: "Full settlement: " + existing.description,
        category: "Debt payment",
        amountMinor: remainingMinor,
        balanceMinor: null,
        currency: existing.currency,
        customerName: existing.customerName,
        productId: null,
        quantity: null,
        dueDate: null,
        status: "recorded",
        recordedDate: dateOnlyNow(),
      });
    }
    const [row] = await tx.update(dailyLedgerEntries).set({
      status: input.status,
      balanceMinor: input.status === "paid" ? 0 : remainingMinor,
      updatedAt: new Date(),
    }).where(and(eq(dailyLedgerEntries.id, existing.id), eq(dailyLedgerEntries.businessId, businessId))).returning();
    return row;
  });
  await recordActivity({
    businessId, userId: req.user!.id, userName: displayName(req.user!), action: "updated",
    entityType: "daily_ledger_entry", entityId: updated.id, entityName: updated.description,
    description: "Debtor record marked " + input.status + ": " + updated.description,
    status: "success",
  });
  res.json(serialize(updated));
});

export default router;
