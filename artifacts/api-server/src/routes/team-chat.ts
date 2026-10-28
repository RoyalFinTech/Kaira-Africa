import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, teamMessages } from "@workspace/db";
import { requireUser, requireBusiness } from "../middlewares/auth";

const router: IRouter = Router();
const messageInput = z.object({
  content: z.string().trim().min(1).max(4000),
  messageType: z.enum(["message", "announcement"]).default("message"),
});

router.get("/team-chat/messages", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const query = z.object({
    before: z.string().datetime().optional(),
    messageType: z.enum(["message", "announcement"]).optional(),
  }).parse(req.query);
  const filters = [eq(teamMessages.businessId, businessId)];
  if (query.messageType) filters.push(eq(teamMessages.messageType, query.messageType));
  const rows = await db.select().from(teamMessages).where(and(...filters))
    .orderBy(desc(teamMessages.createdAt)).limit(100);
  const ordered = rows.reverse().filter((row) => !query.before || row.createdAt < new Date(query.before));
  res.json(ordered);
});

router.post("/team-chat/messages", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const input = messageInput.parse(req.body);
  const [message] = await db.insert(teamMessages).values({
    businessId,
    senderId: req.user!.id,
    messageType: input.messageType,
    content: input.content,
  }).returning();
  res.status(201).json(message);
});

export default router;
