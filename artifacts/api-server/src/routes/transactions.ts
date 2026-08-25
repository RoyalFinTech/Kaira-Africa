import { Router, type IRouter } from "express";
import { displayName } from "../lib/display-name";
import {
  ListTransactionsQueryParams,
  ListTransactionsResponse,
  CreateTransactionBody,
  CreateTransactionResponse,
  GetTransactionParams,
  GetTransactionResponse,
} from "@workspace/api-zod";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  listTransactions,
  getTransaction,
  createTransaction,
  type TransactionWithCustomer,
} from "../repositories/transactions";
import { recordActivity } from "../repositories/activity-logs";
import { NotFoundError, BadRequestError } from "../lib/http-errors";
import { toMinorUnits, fromMinorUnits } from "../lib/money";

const router: IRouter = Router();

function serialize(tx: TransactionWithCustomer) {
  return {
    id: tx.id,
    reference: tx.reference,
    amount: fromMinorUnits(tx.amountMinor, tx.currency),
    currency: tx.currency,
    type: tx.type,
    status: tx.status,
    customerId: tx.customerId,
    customerName: tx.customerName,
    description: tx.description,
    createdAt: tx.createdAt.toISOString(),
    completedAt: tx.completedAt?.toISOString() ?? null,
  };
}

router.get(
  "/transactions",
  requireUser,
  validate({ query: ListTransactionsQueryParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const q = req.validatedQuery as unknown as {
      search?: string;
      status?: "completed" | "pending" | "failed" | "cancelled";
      type?: "payment" | "refund" | "transfer" | "withdrawal" | "deposit";
      customerId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    };
    const { transactions, total } = await listTransactions(businessId, {
      ...q,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
    res.json(
      ListTransactionsResponse.parse({
        transactions: transactions.map(serialize),
        total,
        page: q.page ?? 1,
        limit: q.limit ?? 20,
      }),
    );
  },
);

router.post(
  "/transactions",
  requireUser,
  validate({ body: CreateTransactionBody }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    if (req.body.amount <= 0) {
      throw new BadRequestError("amount must be greater than zero");
    }
    const currency = req.body.currency ?? "GMD";
    const tx = await createTransaction(businessId, {
      amountMinor: toMinorUnits(req.body.amount, currency),
      currency,
      type: req.body.type,
      customerId: req.body.customerId,
      description: req.body.description,
    });
    await recordActivity({
      businessId,
      userId: req.user!.id,
      userName: displayName(req.user!),
      action: "created",
      entityType: "transaction",
      entityId: tx.id,
      entityName: tx.reference,
      description: `${displayName(req.user!)} recorded a ${tx.type} of ${tx.amountMinor / 100} ${tx.currency}`,
      status: "success",
    });
    res.status(201).json(CreateTransactionResponse.parse(serialize(tx)));
  },
);

router.get(
  "/transactions/:id",
  requireUser,
  validate({ params: GetTransactionParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const tx = await getTransaction(businessId, (req.params.id as string));
    if (!tx) throw new NotFoundError("Transaction not found");
    res.json(GetTransactionResponse.parse(serialize(tx)));
  },
);

export default router;
