import { and, count, desc, eq, gte, lt, sql, type SQLWrapper } from "drizzle-orm";
import { db, transactions, customers } from "@workspace/db";
import { fromMinorUnits } from "../lib/money";

/**
 * `bucket` only ever comes from `resolveRange()` below (day/week/month
 * — never user input), so it's safe to inline as raw SQL. This matters
 * beyond convenience: Postgres's GROUP BY validity check requires the
 * SELECT-list expression and the GROUP BY expression to be
 * *syntactically* identical. If `bucket` were passed as a bound
 * parameter (`${bucket}`), each occurrence becomes a distinct `$n`
 * placeholder — even with identical runtime values, Postgres treats
 * `date_trunc($1, ...)` and `date_trunc($4, ...)` as different
 * expressions and rejects the query. Using `sql.raw` for the literal
 * keeps the text identical across SELECT/GROUP BY/ORDER BY.
 */
function bucketExpr(bucket: "day" | "week" | "month", column: SQLWrapper) {
  return sql`date_trunc(${sql.raw(`'${bucket}'`)}, ${column})`;
}

export type Period = "week" | "month" | "quarter" | "year";

interface Range {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
  bucket: "day" | "week" | "month";
}

/**
 * Defines the lookback window and bucketing granularity per period.
 * `previous*` is the equal-length window immediately before `start`,
 * used for the change/changePercent comparison.
 */
function resolveRange(period: Period, now: Date = new Date()): Range {
  const end = now;
  switch (period) {
    case "week": {
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      const previousStart = new Date(start);
      previousStart.setDate(previousStart.getDate() - 7);
      return { start, end, previousStart, previousEnd: start, bucket: "day" };
    }
    case "month": {
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      const previousStart = new Date(start);
      previousStart.setDate(previousStart.getDate() - 30);
      return { start, end, previousStart, previousEnd: start, bucket: "day" };
    }
    case "quarter": {
      const start = new Date(end);
      start.setDate(start.getDate() - 90);
      const previousStart = new Date(start);
      previousStart.setDate(previousStart.getDate() - 90);
      return { start, end, previousStart, previousEnd: start, bucket: "week" };
    }
    case "year": {
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      const previousStart = new Date(start);
      previousStart.setFullYear(previousStart.getFullYear() - 1);
      return { start, end, previousStart, previousEnd: start, bucket: "month" };
    }
  }
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

/**
 * Revenue is defined as completed `payment` transactions in this
 * version of the product (refunds, transfers, withdrawals and deposits
 * are excluded from "revenue" specifically, though they're all still
 * visible in the raw transaction ledger/analytics elsewhere).
 */
export async function getRevenueAnalytics(businessId: string, period: Period) {
  const range = resolveRange(period);
  const revenueCondition = and(
    eq(transactions.businessId, businessId),
    eq(transactions.status, "completed"),
    eq(transactions.type, "payment"),
  );

  const [[currentTotal], [previousTotal], buckets, topCustomerRows] =
    await Promise.all([
      db
        .select({ total: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)` })
        .from(transactions)
        .where(and(revenueCondition, gte(transactions.createdAt, range.start))),
      db
        .select({ total: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)` })
        .from(transactions)
        .where(
          and(
            revenueCondition,
            gte(transactions.createdAt, range.previousStart),
            lt(transactions.createdAt, range.previousEnd),
          ),
        ),
      db
        .select({
          label: sql<string>`to_char(${bucketExpr(range.bucket, transactions.createdAt)}, 'YYYY-MM-DD')`,
          value: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
        })
        .from(transactions)
        .where(and(revenueCondition, gte(transactions.createdAt, range.start)))
        .groupBy(bucketExpr(range.bucket, transactions.createdAt))
        .orderBy(bucketExpr(range.bucket, transactions.createdAt)),
      db
        .select({
          id: customers.id,
          firstName: customers.firstName,
          lastName: customers.lastName,
          email: customers.email,
          phone: customers.phone,
          company: customers.company,
          country: customers.country,
          city: customers.city,
          avatarUrl: customers.avatarUrl,
          status: customers.status,
          createdAt: customers.createdAt,
          totalSpendMinor: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
          transactionCount: count(transactions.id),
        })
        .from(customers)
        .innerJoin(
          transactions,
          and(eq(transactions.customerId, customers.id), revenueCondition),
        )
        .where(
          and(eq(customers.businessId, businessId), gte(transactions.createdAt, range.start)),
        )
        .groupBy(customers.id)
        .orderBy(desc(sql`sum(${transactions.amountMinor})`))
        .limit(5),
    ]);

  const total = fromMinorUnits(Number(currentTotal.total), "GMD");
  const previous = fromMinorUnits(Number(previousTotal.total), "GMD");

  return {
    total,
    change: Number((total - previous).toFixed(2)),
    changePercent: pctChange(total, previous),
    data: buckets.map((b) => ({
      label: b.label,
      value: fromMinorUnits(Number(b.value), "GMD"),
      previousValue: null,
    })),
    topCustomers: topCustomerRows.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      company: c.company,
      country: c.country,
      city: c.city,
      avatarUrl: c.avatarUrl,
      status: c.status,
      totalSpend: fromMinorUnits(Number(c.totalSpendMinor), "GMD"),
      transactionCount: c.transactionCount,
      createdAt: c.createdAt.toISOString(),
      lastTransactionAt: null,
    })),
  };
}

export async function getCustomerAnalytics(businessId: string, period: Period) {
  const range = resolveRange(period);
  const base = eq(customers.businessId, businessId);

  const [[currentTotal], [previousTotal], buckets, byCountryRows] =
    await Promise.all([
      db
        .select({ total: count() })
        .from(customers)
        .where(and(base, gte(customers.createdAt, range.start))),
      db
        .select({ total: count() })
        .from(customers)
        .where(
          and(
            base,
            gte(customers.createdAt, range.previousStart),
            lt(customers.createdAt, range.previousEnd),
          ),
        ),
      db
        .select({
          label: sql<string>`to_char(${bucketExpr(range.bucket, customers.createdAt)}, 'YYYY-MM-DD')`,
          value: count(),
        })
        .from(customers)
        .where(and(base, gte(customers.createdAt, range.start)))
        .groupBy(bucketExpr(range.bucket, customers.createdAt))
        .orderBy(bucketExpr(range.bucket, customers.createdAt)),
      db
        .select({ label: customers.country, value: count() })
        .from(customers)
        .where(base)
        .groupBy(customers.country)
        .orderBy(desc(count())),
    ]);

  return {
    total: currentTotal.total,
    change: currentTotal.total - previousTotal.total,
    changePercent: pctChange(currentTotal.total, previousTotal.total),
    data: buckets.map((b) => ({
      label: b.label,
      value: b.value,
      previousValue: null,
    })),
    byCountry: byCountryRows.map((c) => ({
      label: c.label ?? "Unknown",
      value: c.value,
      previousValue: null,
    })),
  };
}

export async function getTransactionAnalytics(
  businessId: string,
  period: Period,
) {
  const range = resolveRange(period);
  const base = eq(transactions.businessId, businessId);

  const [
    [currentAgg],
    [previousAgg],
    buckets,
    byStatusRows,
    byTypeRows,
  ] = await Promise.all([
    db
      .select({
        volume: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
        total: count(),
      })
      .from(transactions)
      .where(and(base, gte(transactions.createdAt, range.start))),
    db
      .select({
        volume: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
        total: count(),
      })
      .from(transactions)
      .where(
        and(
          base,
          gte(transactions.createdAt, range.previousStart),
          lt(transactions.createdAt, range.previousEnd),
        ),
      ),
    db
      .select({
        label: sql<string>`to_char(${bucketExpr(range.bucket, transactions.createdAt)}, 'YYYY-MM-DD')`,
        value: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)`,
      })
      .from(transactions)
      .where(and(base, gte(transactions.createdAt, range.start)))
      .groupBy(bucketExpr(range.bucket, transactions.createdAt))
      .orderBy(bucketExpr(range.bucket, transactions.createdAt)),
    db
      .select({ label: transactions.status, value: count() })
      .from(transactions)
      .where(and(base, gte(transactions.createdAt, range.start)))
      .groupBy(transactions.status),
    db
      .select({ label: transactions.type, value: count() })
      .from(transactions)
      .where(and(base, gte(transactions.createdAt, range.start)))
      .groupBy(transactions.type),
  ]);

  const volume = fromMinorUnits(Number(currentAgg.volume), "GMD");
  const previousVolume = fromMinorUnits(Number(previousAgg.volume), "GMD");

  return {
    total: currentAgg.total,
    volume,
    change: Number((volume - previousVolume).toFixed(2)),
    changePercent: pctChange(volume, previousVolume),
    data: buckets.map((b) => ({
      label: b.label,
      value: fromMinorUnits(Number(b.value), "GMD"),
      previousValue: null,
    })),
    byStatus: byStatusRows.map((s) => ({
      label: s.label,
      value: s.value,
      previousValue: null,
    })),
    byType: byTypeRows.map((t) => ({
      label: t.label,
      value: t.value,
      previousValue: null,
    })),
  };
}
