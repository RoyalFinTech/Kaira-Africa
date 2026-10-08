import { Router, type IRouter } from "express";
import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, crmInteractions, customers, transactions, users } from "@workspace/db";
import { requireUser, requireBusiness, requireRole } from "../middlewares/auth";
import { displayName } from "../lib/display-name";
import { recordActivity } from "../repositories/activity-logs";
import { NotFoundError } from "../lib/http-errors";

const router: IRouter = Router();

const interactionInput = z.object({
  customerId: z.string().uuid(),
  type: z.enum(["note", "call", "meeting", "email", "follow_up"]).default("note"),
  title: z.string().trim().min(1).max(120),
  note: z.string().trim().min(1).max(4000),
  nextActionAt: z.string().datetime().optional(),
});

router.get("/crm/overview", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const [customerRows, interactions, [{ openFollowUps }]] = await Promise.all([
    db.select({
      id: customers.id, firstName: customers.firstName, lastName: customers.lastName,
      email: customers.email, phone: customers.phone, company: customers.company, status: customers.status,
      createdAt: customers.createdAt,
      totalSpend: sql.raw("coalesce(sum(case when transactions.status = 'completed' and transactions.type = 'payment' then transactions.amount_minor else 0 end), 0)"),
      transactionCount: sql.raw("count(transactions.id) filter (where transactions.status = 'completed')"),
    }).from(customers).leftJoin(transactions, eq(transactions.customerId, customers.id))
      .where(eq(customers.businessId, businessId)).groupBy(customers.id).orderBy(desc(customers.createdAt)).limit(100),
    db.select({
      id: crmInteractions.id, customerId: crmInteractions.customerId,
      customerName: sql.raw("concat(customers.first_name, ' ', customers.last_name)"),
      userName: sql.raw("coalesce(concat(users.first_name, ' ', users.last_name), 'System')"),
      type: crmInteractions.type, title: crmInteractions.title, note: crmInteractions.note,
      nextActionAt: crmInteractions.nextActionAt, completedAt: crmInteractions.completedAt, createdAt: crmInteractions.createdAt,
    }).from(crmInteractions).innerJoin(customers, eq(customers.id, crmInteractions.customerId))
      .leftJoin(users, eq(users.id, crmInteractions.userId)).where(eq(crmInteractions.businessId, businessId))
      .orderBy(desc(crmInteractions.createdAt)).limit(25),
    db.select({ openFollowUps: count() }).from(crmInteractions).where(and(
      eq(crmInteractions.businessId, businessId), isNull(crmInteractions.completedAt), gte(crmInteractions.nextActionAt, new Date())
    )),
  ]);

  res.json({
    customers: customerRows.map((c) => ({
      ...c, totalSpend: Number(c.totalSpend) / 100, transactionCount: Number(c.transactionCount),
      createdAt: c.createdAt.toISOString(),
    })),
    interactions: interactions.map((i) => ({
      ...i, customerName: String(i.customerName), userName: String(i.userName),
      nextActionAt: i.nextActionAt?.toISOString() || null, completedAt: i.completedAt?.toISOString() || null,
      createdAt: i.createdAt.toISOString(),
    })),
    metrics: { totalCustomers: customerRows.length, activeCustomers: customerRows.filter((c) => c.status === "active").length, openFollowUps: Number(openFollowUps) },
  });
});

router.post("/crm/interactions", requireUser, requireRole("owner", "admin", "manager"), async (req, res) => {
  const input = interactionInput.parse(req.body);
  const businessId = requireBusiness(req);
  const [customer] = await db.select({ id: customers.id, firstName: customers.firstName, lastName: customers.lastName })
    .from(customers).where(and(eq(customers.id, input.customerId), eq(customers.businessId, businessId))).limit(1);
  if (!customer) throw new NotFoundError("Customer not found");

  const [created] = await db.insert(crmInteractions).values({
    businessId, customerId: customer.id, userId: req.user!.id, type: input.type,
    title: input.title, note: input.note, nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
  }).returning();

  await recordActivity({
    businessId, userId: req.user!.id, userName: displayName(req.user!), action: "created",
    entityType: "crm_interaction", entityId: created.id, entityName: created.title,
    description: displayName(req.user!) + " added a CRM " + created.type + " for " + customer.firstName + " " + customer.lastName,
    status: "success",
  });

  res.status(201).json({
    ...created, nextActionAt: created.nextActionAt?.toISOString() || null, createdAt: created.createdAt.toISOString(),
  });
});

router.patch("/crm/interactions/:id/complete", requireUser, requireRole("owner", "admin", "manager", "staff"), async (req, res) => {
  const businessId = requireBusiness(req);
  const [updated] = await db.update(crmInteractions).set({ completedAt: new Date() })
    .where(and(eq(crmInteractions.id, req.params.id as string), eq(crmInteractions.businessId, businessId))).returning();
  if (!updated) throw new NotFoundError("CRM interaction not found");
  res.json({ id: updated.id, completedAt: updated.completedAt?.toISOString() || null });
});

export default router;
