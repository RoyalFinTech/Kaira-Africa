import { Router, type IRouter } from "express";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, investmentPlans, investmentDailyRecords } from "@workspace/db";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { BadRequestError, NotFoundError } from "../lib/http-errors";
import { fromMinorUnits, toMinorUnits } from "../lib/money";

const router: IRouter = Router();
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function isValidCalendarDate(value: string) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
const calendarDate = z.string().refine(isValidCalendarDate, "Enter a valid calendar date in YYYY-MM-DD format.");
const currencies = ["GMD", "NGN", "USD"] as const;
const categories = [
  "Retail shop / mini-market", "Wholesale / distribution", "Foodstuff / grocery",
  "Restaurant / fast food", "Catering / event food", "Bakery / confectionery",
  "Agriculture / farming", "Livestock / poultry / fishery", "Food processing",
  "Fashion / tailoring", "Beauty salon / barbershop", "Cosmetics / skincare",
  "Mobile money / agent services", "Transport / logistics", "Real estate / property",
  "Construction / building materials", "Manufacturing / production", "Education / training",
  "Health / pharmacy", "Electronics / phone accessories", "Repair / maintenance",
  "Hospitality / hotel / guesthouse", "Events / entertainment", "Professional services",
  "Online store / e-commerce", "Digital services / software", "Content / media",
  "Import / export", "Personal services", "Other",
] as const;
const createPlanInput = z.object({
  name: z.string().trim().min(2).max(120),
  businessCategory: z.enum(categories),
  customCategory: z.string().trim().max(100).optional(),
  businessModel: z.enum(["offline", "online", "hybrid"]).default("offline"),
  description: z.string().trim().max(1000).optional(),
  currency: z.enum(currencies).default("GMD"),
  initialInvestment: z.number().finite().min(0).max(1_000_000_000),
  additionalCosts: z.number().finite().min(0).max(1_000_000_000).default(0),
  expectedRevenue: z.number().finite().positive().max(1_000_000_000),
  expectedProfit: z.number().finite().min(0).max(1_000_000_000),
  targetDate: calendarDate.optional(),
});
const createDailyInput = z.object({
  recordDate: calendarDate.optional(),
  sales: z.number().finite().min(0).max(1_000_000_000),
  expenses: z.number().finite().min(0).max(1_000_000_000),
  notes: z.string().trim().max(500).optional(),
});
function serializePlan(p: typeof investmentPlans.$inferSelect) {
  return {
    id: p.id, name: p.name, businessCategory: p.businessCategory, customCategory: p.customCategory,
    businessModel: p.businessModel, description: p.description, currency: p.currency,
    initialInvestment: fromMinorUnits(Number(p.initialInvestmentMinor), p.currency),
    additionalCosts: fromMinorUnits(Number(p.additionalCostsMinor), p.currency),
    expectedRevenue: fromMinorUnits(Number(p.expectedRevenueMinor), p.currency),
    expectedProfit: fromMinorUnits(Number(p.expectedProfitMinor), p.currency),
    targetDate: p.targetDate, status: p.status, createdAt: p.createdAt.toISOString(),
  };
}
function serializeDaily(r: typeof investmentDailyRecords.$inferSelect, currency: string) {
  return { id: r.id, planId: r.planId, recordDate: r.recordDate,
    sales: fromMinorUnits(Number(r.salesMinor), currency),
    expenses: fromMinorUnits(Number(r.expensesMinor), currency), notes: r.notes, createdAt: r.createdAt.toISOString() };
}
router.get("/investment-plans", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const plans = await db.select().from(investmentPlans).where(eq(investmentPlans.businessId, businessId)).orderBy(desc(investmentPlans.createdAt));
  const records = await db.select({
    planId: investmentDailyRecords.planId,
    salesMinor: sql<number>`coalesce(sum(${investmentDailyRecords.salesMinor}),0)`,
    expensesMinor: sql<number>`coalesce(sum(${investmentDailyRecords.expensesMinor}),0)`,
    days: sql<number>`count(*)`,
  }).from(investmentDailyRecords).where(eq(investmentDailyRecords.businessId, businessId)).groupBy(investmentDailyRecords.planId);
  const byPlan = new Map(records.map(r => [r.planId, r]));
  res.json({ plans: plans.map(p => {
    const r = byPlan.get(p.id);
    const actualSales = fromMinorUnits(Number(r?.salesMinor ?? 0), p.currency);
    const actualExpenses = fromMinorUnits(Number(r?.expensesMinor ?? 0), p.currency);
    return { ...serializePlan(p), actualSales, actualExpenses, actualNet: Number((actualSales-actualExpenses).toFixed(2)), daysRecorded: Number(r?.days ?? 0) };
  }) });
});
router.post("/investment-plans", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const input = createPlanInput.parse(req.body);
  if (input.businessCategory === "Other" && !input.customCategory?.trim()) throw new BadRequestError("Enter the business type when you select Other.");
  const totalCost = input.initialInvestment + input.additionalCosts;
  if (input.expectedRevenue < totalCost) throw new BadRequestError("Expected revenue should be at least the total planned cost. Review the assumptions if a loss is expected.");
  if (input.expectedProfit > input.expectedRevenue - totalCost) throw new BadRequestError("Expected profit cannot exceed expected revenue minus planned costs.");
  const [p] = await db.insert(investmentPlans).values({
    businessId, createdBy: req.user!.id, name: input.name, businessCategory: input.businessCategory,
    customCategory: input.customCategory || null, businessModel: input.businessModel, description: input.description || null,
    currency: input.currency, initialInvestmentMinor: toMinorUnits(input.initialInvestment,input.currency),
    additionalCostsMinor: toMinorUnits(input.additionalCosts,input.currency),
    expectedRevenueMinor: toMinorUnits(input.expectedRevenue,input.currency),
    expectedProfitMinor: toMinorUnits(input.expectedProfit,input.currency), targetDate: input.targetDate || null,
  }).returning();
  res.status(201).json(serializePlan(p));
});
router.patch("/investment-plans/:id/status", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const input = z.object({ status: z.enum(["active","paused","completed","archived"]) }).parse(req.body);
  const [p] = await db.update(investmentPlans).set({ status: input.status, updatedAt: new Date() })
    .where(and(eq(investmentPlans.id, z.string().uuid().parse(req.params.id)),eq(investmentPlans.businessId,businessId))).returning();
  if (!p) throw new NotFoundError("Investment plan not found.");
  res.json(serializePlan(p));
});
router.get("/investment-plans/:id/daily", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const [plan] = await db.select().from(investmentPlans).where(and(eq(investmentPlans.id,z.string().uuid().parse(req.params.id)),eq(investmentPlans.businessId,businessId))).limit(1);
  if (!plan) throw new NotFoundError("Investment plan not found.");
  const query = z.object({ startDate: calendarDate.optional(), endDate: calendarDate.optional() }).parse(req.query);
  const conditions = [eq(investmentDailyRecords.businessId,businessId),eq(investmentDailyRecords.planId,plan.id)];
  if (query.startDate) conditions.push(gte(investmentDailyRecords.recordDate,query.startDate));
  if (query.endDate) conditions.push(lte(investmentDailyRecords.recordDate,query.endDate));
  const records = await db.select().from(investmentDailyRecords).where(and(...conditions)).orderBy(desc(investmentDailyRecords.recordDate),desc(investmentDailyRecords.createdAt)).limit(200);
  res.json({ records: records.map(r => serializeDaily(r,plan.currency)) });
});
router.post("/investment-plans/:id/daily", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const input = createDailyInput.parse(req.body);
  if (input.recordDate && input.recordDate > new Date().toISOString().slice(0, 10)) {
    throw new BadRequestError("Daily records cannot be dated in the future.");
  }
  const [plan] = await db.select().from(investmentPlans).where(and(eq(investmentPlans.id,z.string().uuid().parse(req.params.id)),eq(investmentPlans.businessId,businessId))).limit(1);
  if (!plan) throw new NotFoundError("Investment plan not found.");
  if (plan.status !== "active") throw new BadRequestError("Only active investment plans can receive daily records.");
  const [record] = await db.insert(investmentDailyRecords).values({
    planId: plan.id, businessId, createdBy: req.user!.id, recordDate: input.recordDate || new Date().toISOString().slice(0,10),
    salesMinor: toMinorUnits(input.sales,plan.currency), expensesMinor: toMinorUnits(input.expenses,plan.currency), notes: input.notes || null,
  }).returning();
  res.status(201).json(serializeDaily(record,plan.currency));
});
export default router;
