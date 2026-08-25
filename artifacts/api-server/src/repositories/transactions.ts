import { randomBytes } from "node:crypto";
import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import {
  db,
  transactions,
  customers,
  type Transaction,
} from "@workspace/db";

export interface ListTransactionsFilters {
  search?: string;
  status?: "completed" | "pending" | "failed" | "cancelled";
  type?: "payment" | "refund" | "transfer" | "withdrawal" | "deposit";
  customerId?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export interface TransactionWithCustomer extends Transaction {
  customerName: string | null;
}

function generateReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `TXN-${stamp}-${random}`;
}

async function attachCustomerNames(
  rows: Transaction[],
): Promise<TransactionWithCustomer[]> {
  const customerIds = [
    ...new Set(rows.map((r) => r.customerId).filter((id): id is string => !!id)),
  ];
  if (customerIds.length === 0) {
    return rows.map((r) => ({ ...r, customerName: null }));
  }
  const customerRows = await db
    .select({
      id: customers.id,
      firstName: customers.firstName,
      lastName: customers.lastName,
    })
    .from(customers)
    .where(or(...customerIds.map((id) => eq(customers.id, id)))!);

  const nameById = new Map(
    customerRows.map((c) => [c.id, `${c.firstName} ${c.lastName}`]),
  );

  return rows.map((r) => ({
    ...r,
    customerName: r.customerId ? (nameById.get(r.customerId) ?? null) : null,
  }));
}

export async function listTransactions(
  businessId: string,
  filters: ListTransactionsFilters,
): Promise<{ transactions: TransactionWithCustomer[]; total: number }> {
  const conditions = [eq(transactions.businessId, businessId)];

  if (filters.status) conditions.push(eq(transactions.status, filters.status));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.customerId)
    conditions.push(eq(transactions.customerId, filters.customerId));
  if (filters.startDate)
    conditions.push(gte(transactions.createdAt, new Date(filters.startDate)));
  if (filters.endDate)
    conditions.push(lte(transactions.createdAt, new Date(filters.endDate)));
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(transactions.reference, pattern),
        ilike(transactions.description, pattern),
      )!,
    );
  }

  const where = and(...conditions);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(where)
      .orderBy(desc(transactions.createdAt))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit),
    db.select({ total: count() }).from(transactions).where(where),
  ]);

  return { transactions: await attachCustomerNames(rows), total };
}

export async function getTransaction(
  businessId: string,
  id: string,
): Promise<TransactionWithCustomer | undefined> {
  const [row] = await db
    .select()
    .from(transactions)
    .where(
      and(eq(transactions.businessId, businessId), eq(transactions.id, id)),
    )
    .limit(1);
  if (!row) return undefined;
  const [withName] = await attachCustomerNames([row]);
  return withName;
}

export async function createTransaction(
  businessId: string,
  data: {
    amountMinor: number;
    currency: string;
    type: Transaction["type"];
    customerId?: string;
    description?: string;
  },
): Promise<TransactionWithCustomer> {
  const [row] = await db
    .insert(transactions)
    .values({
      businessId,
      reference: generateReference(),
      amountMinor: data.amountMinor,
      currency: data.currency,
      type: data.type,
      customerId: data.customerId,
      description: data.description,
      status: "pending",
    })
    .returning();
  const [withName] = await attachCustomerNames([row]);
  return withName;
}
