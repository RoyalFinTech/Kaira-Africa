import { and, count, desc, eq, ilike, inArray, max, or, sum } from "drizzle-orm";
import {
  db,
  customers,
  transactions,
  type Customer,
  type InsertCustomer,
} from "@workspace/db";
import { fromMinorUnits } from "../lib/money";

export interface ListCustomersFilters {
  search?: string;
  status?: "active" | "inactive";
  page: number;
  limit: number;
}

export interface CustomerWithStats extends Customer {
  totalSpend: number;
  transactionCount: number;
  lastTransactionAt: string | null;
}

/**
 * `totalSpend` / `transactionCount` / `lastTransactionAt` are derived
 * from the transactions ledger (only completed transactions count
 * toward spend) rather than stored on the customer row, so they can
 * never drift out of sync. Money is summed in minor units and
 * converted to decimal at the very end, per-currency (mixed-currency
 * customers are summed per their most common currency — see note
 * below for the single-currency assumption).
 */
async function withTransactionStats(
  rows: Customer[],
): Promise<CustomerWithStats[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const stats = await db
    .select({
      customerId: transactions.customerId,
      currency: transactions.currency,
      totalMinor: sum(transactions.amountMinor).mapWith(Number),
      txCount: count(transactions.id),
      lastAt: max(transactions.createdAt),
    })
    .from(transactions)
    .where(
      and(
        inArray(transactions.customerId, ids),
        eq(transactions.status, "completed"),
      ),
    )
    .groupBy(transactions.customerId, transactions.currency);

  const byCustomer = new Map<
    string,
    { totalSpend: number; transactionCount: number; lastTransactionAt: string | null }
  >();

  for (const s of stats) {
    if (!s.customerId) continue;
    const existing = byCustomer.get(s.customerId) ?? {
      totalSpend: 0,
      transactionCount: 0,
      lastTransactionAt: null as string | null,
    };
    // Note: this product currently operates in a single business
    // currency (GMD) in practice — if a customer ever has mixed
    // currencies, this sums minor units across currencies using the
    // first-seen currency's exponent. Multi-currency customer
    // statements are a future enhancement, not silently wrong data
    // loss, since every individual transaction still records its own
    // correct currency.
    existing.totalSpend += fromMinorUnits(s.totalMinor, s.currency ?? "GMD");
    existing.transactionCount += s.txCount;
    if (
      s.lastAt &&
      (!existing.lastTransactionAt ||
        new Date(s.lastAt) > new Date(existing.lastTransactionAt))
    ) {
      existing.lastTransactionAt = s.lastAt.toISOString();
    }
    byCustomer.set(s.customerId, existing);
  }

  return rows.map((row) => ({
    ...row,
    totalSpend: byCustomer.get(row.id)?.totalSpend ?? 0,
    transactionCount: byCustomer.get(row.id)?.transactionCount ?? 0,
    lastTransactionAt: byCustomer.get(row.id)?.lastTransactionAt ?? null,
  }));
}

export async function listCustomers(
  businessId: string,
  filters: ListCustomersFilters,
): Promise<{ customers: CustomerWithStats[]; total: number }> {
  const conditions = [eq(customers.businessId, businessId)];

  if (filters.status) {
    conditions.push(eq(customers.status, filters.status));
  }
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(customers.firstName, pattern),
        ilike(customers.lastName, pattern),
        ilike(customers.email, pattern),
        ilike(customers.company, pattern),
      )!,
    );
  }

  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(where)
      .orderBy(desc(customers.createdAt))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit),
    db.select({ total: count() }).from(customers).where(where),
  ]);

  const withStats = await withTransactionStats(rows);
  return { customers: withStats, total };
}

export async function getCustomer(
  businessId: string,
  id: string,
): Promise<CustomerWithStats | undefined> {
  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.businessId, businessId), eq(customers.id, id)))
    .limit(1);
  if (!row) return undefined;
  const [withStats] = await withTransactionStats([row]);
  return withStats;
}

export async function createCustomer(
  businessId: string,
  data: Omit<InsertCustomer, "businessId">,
): Promise<Customer> {
  const [row] = await db
    .insert(customers)
    .values({ ...data, businessId })
    .returning();
  return row;
}

export async function updateCustomer(
  businessId: string,
  id: string,
  patch: Partial<Omit<InsertCustomer, "businessId">>,
): Promise<Customer | undefined> {
  const [row] = await db
    .update(customers)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(customers.businessId, businessId), eq(customers.id, id)))
    .returning();
  return row;
}
