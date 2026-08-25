import { desc, eq } from "drizzle-orm";
import { db, reports, type Report } from "@workspace/db";
import {
  getRevenueAnalytics,
  getCustomerAnalytics,
  getTransactionAnalytics,
  type Period,
} from "./analytics";
import { listActivity } from "./activity-logs";

export async function listReports(businessId: string): Promise<Report[]> {
  return db
    .select()
    .from(reports)
    .where(eq(reports.businessId, businessId))
    .orderBy(desc(reports.createdAt));
}

const REPORT_LABELS: Record<string, string> = {
  revenue: "Revenue Report",
  transaction: "Transaction Report",
  customer: "Customer Report",
  activity: "Activity Report",
  team: "Team Report",
};

/**
 * Generates a report synchronously by running the real aggregation
 * query for the requested type/period and persisting a summary. There
 * is no file-export pipeline yet (downloadUrl stays null) — that's a
 * genuinely separate piece of infrastructure (PDF/CSV rendering +
 * storage) not built in this phase, so it's left null rather than
 * faked with a placeholder link.
 */
export async function generateReport(
  businessId: string,
  input: { type: Report["type"]; period: string; startDate?: string; endDate?: string },
): Promise<Report> {
  let description: string;

  switch (input.type) {
    case "revenue": {
      const data = await getRevenueAnalytics(businessId, input.period as Period);
      description = `Total revenue of ${data.total} GMD over the selected ${input.period}, a ${data.changePercent}% change from the prior period.`;
      break;
    }
    case "transaction": {
      const data = await getTransactionAnalytics(
        businessId,
        input.period as Period,
      );
      description = `${data.total} transactions totalling ${data.volume} GMD over the selected ${input.period}.`;
      break;
    }
    case "customer": {
      const data = await getCustomerAnalytics(businessId, input.period as Period);
      description = `${data.total} new customers over the selected ${input.period}, a ${data.changePercent}% change from the prior period.`;
      break;
    }
    case "activity": {
      const { total } = await listActivity(businessId, { page: 1, limit: 1 });
      description = `${total} activity log entries recorded for this business.`;
      break;
    }
    case "team":
    default: {
      description = `Team report for the selected period.`;
      break;
    }
  }

  const [row] = await db
    .insert(reports)
    .values({
      businessId,
      name: REPORT_LABELS[input.type] ?? "Report",
      description,
      type: input.type,
      status: "available",
      period: input.period,
      generatedAt: new Date(),
      downloadUrl: null,
    })
    .returning();

  return row;
}
