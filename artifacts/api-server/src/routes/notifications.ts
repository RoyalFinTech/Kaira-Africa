import { Router, type IRouter } from "express";
import {
  ListNotificationsQueryParams,
  ListNotificationsResponse,
  MarkNotificationReadParams,
} from "@workspace/api-zod";
import { requireUser } from "../middlewares/auth";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { validate } from "../middlewares/validate";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../repositories/notifications";
import { NotFoundError } from "../lib/http-errors";

const router: IRouter = Router();


const NotificationPreferencesInput = z.object({
  taskReminders: z.boolean(),
}).strict();

router.get("/notifications/preferences", requireUser, async (req, res) => {
  const [user] = await db.select({ preferences: users.notificationPreferences })
    .from(users).where(eq(users.id, req.user!.id)).limit(1);
  if (!user) throw new NotFoundError("User not found");
  res.json({ taskReminders: user.preferences?.taskReminders ?? true });
});

router.patch("/notifications/preferences", requireUser, async (req, res) => {
  const input = NotificationPreferencesInput.parse(req.body);
  const [user] = await db.update(users)
    .set({ notificationPreferences: { taskReminders: input.taskReminders }, updatedAt: new Date() })
    .where(eq(users.id, req.user!.id))
    .returning({ preferences: users.notificationPreferences });
  if (!user) throw new NotFoundError("User not found");
  res.json({ taskReminders: user.preferences?.taskReminders ?? true });
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
