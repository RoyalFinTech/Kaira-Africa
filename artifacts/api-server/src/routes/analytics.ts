import { Router, type IRouter } from "express";
import {
  GetRevenueAnalyticsQueryParams,
  GetRevenueAnalyticsResponse,
  GetCustomerAnalyticsQueryParams,
  GetCustomerAnalyticsResponse,
  GetTransactionAnalyticsQueryParams,
  GetTransactionAnalyticsResponse,
} from "@workspace/api-zod";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import {
  getRevenueAnalytics,
  getCustomerAnalytics,
  getTransactionAnalytics,
  type Period,
} from "../repositories/analytics";

const router: IRouter = Router();

router.get(
  "/analytics/revenue",
  requireUser,
  validate({ query: GetRevenueAnalyticsQueryParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const period = ((req.validatedQuery as { period?: Period }).period ?? "month") as Period;
    const data = await getRevenueAnalytics(businessId, period);
    res.json(GetRevenueAnalyticsResponse.parse(data));
  },
);

router.get(
  "/analytics/customers",
  requireUser,
  validate({ query: GetCustomerAnalyticsQueryParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const period = ((req.validatedQuery as { period?: Period }).period ?? "month") as Period;
    const data = await getCustomerAnalytics(businessId, period);
    res.json(GetCustomerAnalyticsResponse.parse(data));
  },
);

router.get(
  "/analytics/transactions",
  requireUser,
  validate({ query: GetTransactionAnalyticsQueryParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const period = ((req.validatedQuery as { period?: Period }).period ?? "month") as Period;
    const data = await getTransactionAnalytics(businessId, period);
    res.json(GetTransactionAnalyticsResponse.parse(data));
  },
);

export default router;
