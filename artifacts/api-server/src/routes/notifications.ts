import { Router, type IRouter } from "express";
import {
  ListNotificationsQueryParams,
  ListNotificationsResponse,
  MarkNotificationReadParams,
} from "@workspace/api-zod";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { db, workTaskReminderPreferences } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { validate } from "../middlewares/validate";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../repositories/notifications";
import { NotFoundError } from "../lib/http-errors";

const router: IRouter = Router();


const ReminderPreferencesInput = z.object({
  dueTodayEnabled: z.boolean(),
  overdueEnabled: z.boolean(),
}).strict();

router.get("/notifications/preferences", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const userId = req.user!.id;
  const [preferences] = await db.select().from(workTaskReminderPreferences).where(and(
    eq(workTaskReminderPreferences.businessId, businessId),
    eq(workTaskReminderPreferences.userId, userId),
  )).limit(1);
  res.json({
    dueTodayEnabled: preferences?.dueTodayEnabled ?? true,
    overdueEnabled: preferences?.overdueEnabled ?? true,
  });
});

router.patch("/notifications/preferences", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const userId = req.user!.id;
  const input = ReminderPreferencesInput.parse(req.body);
  const [preferences] = await db.insert(workTaskReminderPreferences).values({
    businessId, userId, ...input, updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [workTaskReminderPreferences.businessId, workTaskReminderPreferences.userId],
    set: { ...input, updatedAt: new Date() },
  }).returning();
  res.json({
    dueTodayEnabled: preferences.dueTodayEnabled,
    overdueEnabled: preferences.overdueEnabled,
  });
});

router.get(
  "/notifications",
  requireUser,
  validate({ query: ListNotificationsQueryParams }),
  async (req, res) => {
    const q = req.validatedQuery as unknown as { unreadOnly?: boolean };
    const rows = await listNotifications(req.user!.id, q.unreadOnly);
    res.json(
      ListNotificationsResponse.parse(
        rows.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: n.isRead,
          actionUrl: n.actionUrl,
          createdAt: n.createdAt.toISOString(),
        })),
      ),
    );
  },
);

router.post("/notifications/read-all", requireUser, async (req, res) => {
  await markAllNotificationsRead(req.user!.id);
  res.status(204).end();
});

router.post(
  "/notifications/:id/read",
  requireUser,
  validate({ params: MarkNotificationReadParams }),
  async (req, res) => {
    const updated = await markNotificationRead(req.user!.id, (req.params.id as string));
    if (!updated) throw new NotFoundError("Notification not found");
    res.status(204).end();
  },
);

export default router;
