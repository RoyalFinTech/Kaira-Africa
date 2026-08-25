import { Router, type IRouter } from "express";
import {
  ListReportsResponse,
  GenerateReportBody,
  GenerateReportResponse,
} from "@workspace/api-zod";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { listReports, generateReport } from "../repositories/reports";
import type { Report } from "@workspace/db";

const router: IRouter = Router();

function serialize(report: Report) {
  return {
    id: report.id,
    name: report.name,
    description: report.description,
    type: report.type,
    status: report.status,
    period: report.period,
    generatedAt: report.generatedAt?.toISOString() ?? null,
    downloadUrl: report.downloadUrl,
    createdAt: report.createdAt.toISOString(),
  };
}

router.get("/reports", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const rows = await listReports(businessId);
  res.json(ListReportsResponse.parse(rows.map(serialize)));
});

router.post(
  "/reports/generate",
  requireUser,
  validate({ body: GenerateReportBody }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const report = await generateReport(businessId, req.body);
    res.status(201).json(GenerateReportResponse.parse(serialize(report)));
  },
);

export default router;
