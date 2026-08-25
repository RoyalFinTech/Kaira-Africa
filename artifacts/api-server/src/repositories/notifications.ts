import { and, desc, eq } from "drizzle-orm";
import { db, notifications, type Notification } from "@workspace/db";

export async function listNotifications(
  userId: string,
  unreadOnly?: boolean,
): Promise<Notification[]> {
  const conditions = [eq(notifications.recipientUserId, userId)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationRead(
  userId: string,
  id: string,
): Promise<Notification | undefined> {
  const [row] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.recipientUserId, userId), eq(notifications.id, id)),
    )
    .returning();
  return row;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.recipientUserId, userId), eq(notifications.isRead, false)),
    );
}

export async function createNotification(entry: {
  recipientUserId: string;
  title: string;
  message: string;
  type: Notification["type"];
  actionUrl?: string | null;
}): Promise<Notification> {
  const [row] = await db.insert(notifications).values(entry).returning();
  return row;
}
