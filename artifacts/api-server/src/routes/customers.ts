import { Router, type IRouter } from "express";
import { displayName } from "../lib/display-name";
import {
  ListCustomersQueryParams,
  ListCustomersResponse,
  CreateCustomerBody,
  CreateCustomerResponse,
  GetCustomerParams,
  GetCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerBody,
  UpdateCustomerResponse,
} from "@workspace/api-zod";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  type CustomerWithStats,
} from "../repositories/customers";
import { recordActivity } from "../repositories/activity-logs";
import { NotFoundError } from "../lib/http-errors";

const router: IRouter = Router();

function serialize(customer: CustomerWithStats) {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    country: customer.country,
    city: customer.city,
    avatarUrl: customer.avatarUrl,
    status: customer.status,
    totalSpend: customer.totalSpend,
    transactionCount: customer.transactionCount,
    createdAt: customer.createdAt.toISOString(),
    lastTransactionAt: customer.lastTransactionAt,
  };
}

router.get(
  "/customers",
  requireUser,
  validate({ query: ListCustomersQueryParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const q = req.validatedQuery as unknown as {
      search?: string;
      status?: "active" | "inactive";
      page?: number;
      limit?: number;
    };
    const { customers, total } = await listCustomers(businessId, {
      search: q.search,
      status: q.status,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
    res.json(
      ListCustomersResponse.parse({
        customers: customers.map(serialize),
        total,
        page: q.page ?? 1,
        limit: q.limit ?? 20,
      }),
    );
  },
);

router.post(
  "/customers",
  requireUser,
  validate({ body: CreateCustomerBody }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const customer = await createCustomer(businessId, req.body);
    await recordActivity({
      businessId,
      userId: req.user!.id,
      userName: displayName(req.user!),
      action: "created",
      entityType: "customer",
      entityId: customer.id,
      entityName: `${customer.firstName} ${customer.lastName}`,
      description: `${displayName(req.user!)} added a new customer: ${customer.firstName} ${customer.lastName}`,
      status: "success",
    });
    res.status(201).json(
      CreateCustomerResponse.parse(
        serialize({ ...customer, totalSpend: 0, transactionCount: 0, lastTransactionAt: null }),
      ),
    );
  },
);

router.get(
  "/customers/:id",
  requireUser,
  validate({ params: GetCustomerParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const customer = await getCustomer(businessId, (req.params.id as string));
    if (!customer) throw new NotFoundError("Customer not found");
    res.json(GetCustomerResponse.parse(serialize(customer)));
  },
);

router.put(
  "/customers/:id",
  requireUser,
  validate({ params: UpdateCustomerParams, body: UpdateCustomerBody }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const updated = await updateCustomer(businessId, (req.params.id as string), req.body);
    if (!updated) throw new NotFoundError("Customer not found");
    const customer = await getCustomer(businessId, (req.params.id as string));
    res.json(UpdateCustomerResponse.parse(serialize(customer!)));
  },
);

export default router;
