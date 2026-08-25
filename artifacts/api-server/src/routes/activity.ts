import { Router, type IRouter } from "express";
import { ListActivityQueryParams, ListActivityResponse } from "@workspace/api-zod";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { listActivity } from "../repositories/activity-logs";

const router: IRouter = Router();

router.get(
  "/activity",
  requireUser,
  validate({ query: ListActivityQueryParams }),
  async (req, res) => {
    const businessId = requireBusiness(req);
    const q = req.validatedQuery as unknown as {
      userId?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    };
    const { activity } = await listActivity(businessId, {
      ...q,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
    res.json(
      ListActivityResponse.parse(
        activity.map((a) => ({
          id: a.id,
          userId: a.userId,
          userName: a.userName,
          userAvatarUrl: a.userAvatarUrl,
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
          entityName: a.entityName,
          description: a.description,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
        })),
      ),
    );
  },
);

export default router;
