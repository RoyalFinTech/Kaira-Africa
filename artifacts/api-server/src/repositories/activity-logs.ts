import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { db, activityLogs, type ActivityLog } from "@workspace/db";

export interface ListActivityFilters {
  userId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export async function listActivity(
  businessId: string,
  filters: ListActivityFilters,
): Promise<{ activity: ActivityLog[]; total: number }> {
  const conditions = [eq(activityLogs.businessId, businessId)];

  if (filters.userId) conditions.push(eq(activityLogs.userId, filters.userId));
  if (filters.type) conditions.push(eq(activityLogs.entityType, filters.type));
  if (filters.startDate)
    conditions.push(gte(activityLogs.createdAt, new Date(filters.startDate)));
  if (filters.endDate)
    conditions.push(lte(activityLogs.createdAt, new Date(filters.endDate)));

  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(activityLogs)
      .where(where)
      .orderBy(desc(activityLogs.createdAt))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit),
    db.select({ total: count() }).from(activityLogs).where(where),
  ]);

  return { activity: rows, total };
}

/**
 * Internal helper other repositories/services call to record an
 * activity entry as a side effect of a real write (e.g. creating a
 * transaction). Not exposed as its own route — activity is a
 * byproduct of other actions, never created directly by a client.
 */
export async function recordActivity(entry: {
  businessId: string;
  userId?: string | null;
  userName: string;
  userAvatarUrl?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  status?: "success" | "warning" | "error" | "info";
}): Promise<ActivityLog> {
  const [row] = await db
    .insert(activityLogs)
    .values({ status: "info", ...entry })
    .returning();
  return row;
}
