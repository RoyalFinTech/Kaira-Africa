import { and, eq, gt, inArray, lte, sql } from "drizzle-orm";
import {
  db,
  notifications,
  teamMembers,
  workMeetings,
  workMeetingReminderDeliveries,
} from "@workspace/db";
import { logger } from "../lib/logger";

const REMINDER_WINDOW_MS = 15 * 60 * 1000;
const SCHEDULER_INTERVAL_MS = 60 * 1000;

function meetingTimeLabel(startsAt: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(startsAt);
  } catch {
    // API writes validate IANA time zones; UTC remains a safe fallback for
    // any legacy row that predates that validation.
    return new Intl.DateTimeFormat("en", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(startsAt);
  }
}

/**
 * Deliver one in-app reminder to each selected, active Kaira team attendee
 * when a scheduled meeting is within 15 minutes of starting. A transaction,
 * advisory lock and unique delivery key make restarts/repeated runs safe.
 * The scheduledFor key means rescheduling a meeting can trigger a reminder
 * for its new start time without duplicating the previous reminder.
 */
export async function runMeetingStartReminders(now = new Date()): Promise<number> {
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('kaira-work-meeting-reminders', 0))`);

    const meetings = await tx.select({
      id: workMeetings.id,
      businessId: workMeetings.businessId,
      createdBy: workMeetings.createdBy,
      title: workMeetings.title,
      startsAt: workMeetings.startsAt,
      timeZone: workMeetings.timeZone,
      attendeeUserIds: workMeetings.attendeeUserIds,
    }).from(workMeetings).where(and(
      eq(workMeetings.status, "scheduled"),
      gt(workMeetings.startsAt, now),
      lte(workMeetings.startsAt, windowEnd),
    ));

    let createdCount = 0;
    for (const meeting of meetings) {
      if (!meeting.startsAt) continue;

      const requestedRecipients = [...new Set(meeting.attendeeUserIds ?? [])]
        .filter((userId) => userId !== meeting.createdBy);
      if (requestedRecipients.length === 0) continue;

      // Re-check active membership at delivery time. This prevents stale
      // attendee IDs from notifying removed or cross-business users.
      const activeMembers = await tx.select({ userId: teamMembers.userId })
        .from(teamMembers).where(and(
          eq(teamMembers.businessId, meeting.businessId),
          eq(teamMembers.status, "active"),
          inArray(teamMembers.userId, requestedRecipients),
        ));
      const recipients = [...new Set(activeMembers.flatMap((member) => member.userId ? [member.userId] : []))];

      const minutesUntilStart = Math.max(1, Math.ceil(
        (meeting.startsAt.getTime() - now.getTime()) / 60_000,
      ));
      const timeLabel = meetingTimeLabel(meeting.startsAt, meeting.timeZone || "Africa/Banjul");
      const message = minutesUntilStart === 1
        ? `${meeting.title} starts in about 1 minute (${timeLabel}). Open Work Management to review the agenda and meeting notes.`
        : `${meeting.title} starts in about ${minutesUntilStart} minutes (${timeLabel}). Open Work Management to review the agenda and meeting notes.`;

      for (const recipientUserId of recipients) {
        const [delivery] = await tx.insert(workMeetingReminderDeliveries).values({
          businessId: meeting.businessId,
          meetingId: meeting.id,
          recipientUserId,
          scheduledFor: meeting.startsAt,
        }).onConflictDoNothing().returning({ id: workMeetingReminderDeliveries.id });

        if (!delivery) continue;

        await tx.insert(notifications).values({
          recipientUserId,
          title: "Meeting starting soon",
          message,
          type: "meeting",
          actionUrl: "/work-management/meetings",
        });
        createdCount += 1;
      }
    }

    return createdCount;
  });
}

export function startMeetingReminderScheduler(): void {
  let running = false;
  const runSafely = async () => {
    if (running) return;
    running = true;
    try {
      const count = await runMeetingStartReminders();
      if (count > 0) logger.info({ count }, "Created upcoming meeting reminders");
    } catch (error) {
      logger.error({ error }, "Meeting reminder run failed; it will retry on the next interval");
    } finally {
      running = false;
    }
  };

  void runSafely();
  setInterval(() => { void runSafely(); }, SCHEDULER_INTERVAL_MS);
}
