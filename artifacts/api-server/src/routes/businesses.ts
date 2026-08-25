import { Router, type IRouter } from "express";
import {
  GetMyBusinessResponse,
  UpdateBusinessBody,
  UpdateBusinessResponse,
  GetBusinessStatsResponse,
  CreateBusinessBody,
  CreateBusinessResponse,
} from "@workspace/api-zod";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { getBusinessById, updateBusiness, createBusinessForUser } from "../repositories/businesses";
import { listTransactions } from "../repositories/transactions";
import { listActivity } from "../repositories/activity-logs";
import { getRevenueAnalytics, getCustomerAnalytics } from "../repositories/analytics";
import { db, customers, teamMembers } from "@workspace/db";
import { count, eq } from "drizzle-orm";
import { NotFoundError } from "../lib/http-errors";
import { fromMinorUnits } from "../lib/money";
import type { Business } from "@workspace/db";

const router: IRouter = Router();

function serializeBusiness(business: Business) {
  return {
    id: business.id,
    name: business.name,
    type: business.type,
    industry: business.industry,
    country: business.country,
    city: business.city,
    phone: business.phone,
    email: business.email,
    website: business.website,
    description: business.description,
    logoUrl: business.logoUrl,
    address: business.address,
    teamSize: business.teamSize,
    status: business.status,
    createdAt: business.createdAt.toISOString(),
  };
}

router.post(
  "/businesses",
  requireUser,
  validate({ body: CreateBusinessBody }),
  async (req, res) => {
    const business = await createBusinessForUser(req.user!.id, req.body);
    res.status(201).json(CreateBusinessResponse.parse(serializeBusiness(business)));
  },
);

router.get("/businesses/me", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const business = await getBusinessById(businessId);
  if (!business) throw new NotFoundError("Business not found");
  res.json(GetMyBusinessResponse.parse(serializeBusiness(business)));
});

router.patch(
  "/businesses/me",
  requireUser,
  requireRole("owner"),
  validate({ body: UpdateBusinessBody }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const updated = await updateBusiness(businessId, req.body);
    if (!updated) throw new NotFoundError("Business not found");
    res.json(UpdateBusinessResponse.parse(serializeBusiness(updated)));
  },
);

router.get("/businesses/me/stats", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);

  const [revenue, customerAnalytics, [{ teamCount }], recentTx, recentActivity] =
    await Promise.all([
      getRevenueAnalytics(businessId, "month"),
      getCustomerAnalytics(businessId, "month"),
      db
        .select({ teamCount: count() })
        .from(teamMembers)
        .where(eq(teamMembers.businessId, businessId)),
      listTransactions(businessId, { page: 1, limit: 5 }),
      listActivity(businessId, { page: 1, limit: 5 }),
    ]);

  const stats = {
    totalRevenue: revenue.total,
    revenueChange: revenue.changePercent,
    totalTransactions: recentTx.total,
    transactionsChange: 0,
    totalCustomers: (await db.select({ c: count() }).from(customers).where(eq(customers.businessId, businessId)))[0].c,
    customersChange: customerAnalytics.changePercent,
    teamMembers: teamCount,
    teamChange: 0,
    recentTransactions: recentTx.transactions.map((t) => ({
      id: t.id,
      reference: t.reference,
      amount: fromMinorUnits(t.amountMinor, t.currency),
      currency: t.currency,
      type: t.type,
      status: t.status,
      customerId: t.customerId,
      customerName: t.customerName,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
    })),
    recentActivity: recentActivity.activity.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.userName,
      userAvatarUrl: a.userAvatarUrl,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      entityName: a.entityName,
      description: a.description,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  res.json(GetBusinessStatsResponse.parse(stats));
});

export default router;
