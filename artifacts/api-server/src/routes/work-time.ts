import { Router, type IRouter } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, workTimeEntries, workTasks, users } from "@workspace/db";
import { requireBusiness, requireUser } from "../middlewares/auth";

const router: IRouter = Router();
const startInput = z.object({
  taskId: z.string().uuid().optional().nullable(),
  note: z.string().trim().max(500).optional(),
});

router.get("/work/time-entries", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const query = z.object({
    mine: z.enum(["true", "false"]).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  }).parse(req.query);
  const filters = [eq(workTimeEntries.businessId, businessId)];
  if (query.mine === "true" || !["owner", "admin", "manager"].includes(req.user!.role)) {
    filters.push(eq(workTimeEntries.userId, req.user!.id));
  }
  const rows = await db.select({
    id: workTimeEntries.id,
    userId: workTimeEntries.userId,
    taskId: workTimeEntries.taskId,
    note: workTimeEntries.note,
    startedAt: workTimeEntries.startedAt,
    endedAt: workTimeEntries.endedAt,
    createdAt: workTimeEntries.createdAt,
    firstName: users.firstName,
    lastName: users.lastName,
  }).from(workTimeEntries)
    .innerJoin(users, eq(workTimeEntries.userId, users.id))
    .where(and(...filters))
    .orderBy(desc(workTimeEntries.startedAt))
    .limit(query.limit);
  res.json(rows);
});

router.get("/work/time-entries/current", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const [entry] = await db.select().from(workTimeEntries)
    .where(and(eq(workTimeEntries.businessId, businessId), eq(workTimeEntries.userId, req.user!.id), isNull(workTimeEntries.endedAt)))
    .limit(1);
  res.json({ entry: entry ?? null });
});

router.post("/work/time-entries/start", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const input = startInput.parse(req.body);
  if (input.taskId) {
    const [task] = await db.select({ id: workTasks.id }).from(workTasks)
      .where(and(eq(workTasks.id, input.taskId), eq(workTasks.businessId, businessId))).limit(1);
    if (!task) { res.status(404).json({ error: "Task not found in this business workspace" }); return; }
  }
  // The database enforces one open session per user across all businesses.
  // Check the same scope here so a cross-business active session returns a
  // deliberate conflict instead of leaking a raw unique-index error as HTTP 500.
  const [openEntry] = await db.select({
    id: workTimeEntries.id,
    businessId: workTimeEntries.businessId,
  }).from(workTimeEntries)
    .where(and(eq(workTimeEntries.userId, req.user!.id), isNull(workTimeEntries.endedAt))).limit(1);
  if (openEntry) {
    const message = openEntry.businessId === businessId
      ? "You already have an active time entry. Stop it before starting another."
      : "You have an active time entry in another business workspace. Stop that session before starting a new one.";
    res.status(409).json({ error: message });
    return;
  }
  const [entry] = await db.insert(workTimeEntries).values({
    businessId, userId: req.user!.id, taskId: input.taskId ?? null, note: input.note || null,
  }).returning();
  res.status(201).json(entry);
});

router.post("/work/time-entries/:id/stop", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const id = z.string().uuid().parse(req.params.id);
  const [entry] = await db.select().from(workTimeEntries)
    .where(and(eq(workTimeEntries.id, id), eq(workTimeEntries.businessId, businessId), eq(workTimeEntries.userId, req.user!.id), isNull(workTimeEntries.endedAt))).limit(1);
  if (!entry) { res.status(404).json({ error: "Active time entry not found for your account" }); return; }
  const [stopped] = await db.update(workTimeEntries).set({ endedAt: new Date() })
    .where(and(eq(workTimeEntries.id, id), eq(workTimeEntries.businessId, businessId), eq(workTimeEntries.userId, req.user!.id), isNull(workTimeEntries.endedAt))).returning();
  if (!stopped) { res.status(409).json({ error: "Time entry was already stopped" }); return; }
  res.json(stopped);
});

export default router;
