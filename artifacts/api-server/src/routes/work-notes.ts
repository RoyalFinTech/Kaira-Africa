import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db, workNotes } from "@workspace/db";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { NotFoundError } from "../lib/http-errors";

const router: IRouter = Router();
const noteInput = z.object({
  title: z.string().trim().min(2).max(160),
  content: z.string().max(30000).default(""),
  category: z.string().trim().min(1).max(60).default("general"),
  isPinned: z.boolean().default(false),
});
const notePatch = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  content: z.string().max(30000).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  isPinned: z.boolean().optional(),
});

router.get("/work/notes", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const parsed = z.object({ q: z.string().trim().max(100).optional(), category: z.string().trim().max(60).optional() }).parse(req.query);
  const filters = [eq(workNotes.businessId, businessId)];
  if (parsed.category) filters.push(eq(workNotes.category, parsed.category));
  if (parsed.q) {
    const pattern = `%${parsed.q.replace(/[\\%_]/g, "\\$&")}%`;
    filters.push(or(ilike(workNotes.title, pattern), ilike(workNotes.content, pattern), ilike(workNotes.category, pattern))!);
  }
  const notes = await db.select().from(workNotes).where(and(...filters)).orderBy(desc(workNotes.isPinned), desc(workNotes.updatedAt)).limit(250);
  res.json(notes);
});

router.post("/work/notes", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const input = noteInput.parse(req.body);
  const [note] = await db.insert(workNotes).values({
    businessId, createdBy: req.user!.id, title: input.title, content: input.content,
    category: input.category, isPinned: input.isPinned,
  }).returning();
  res.status(201).json(note);
});

router.patch("/work/notes/:id", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const id = z.string().uuid().parse(req.params.id);
  const input = notePatch.parse(req.body);
  if (Object.keys(input).length === 0) {
    res.status(400).json({ error: "Provide at least one field to update." });
    return;
  }
  const [note] = await db.update(workNotes).set({ ...input, updatedAt: new Date() })
    .where(and(eq(workNotes.id, id), eq(workNotes.businessId, businessId))).returning();
  if (!note) throw new NotFoundError("Note not found.");
  res.json(note);
});

router.delete("/work/notes/:id", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const id = z.string().uuid().parse(req.params.id);
  const [note] = await db.delete(workNotes).where(and(eq(workNotes.id, id), eq(workNotes.businessId, businessId))).returning({ id: workNotes.id });
  if (!note) throw new NotFoundError("Note not found.");
  res.json({ deleted: true });
});

export default router;
