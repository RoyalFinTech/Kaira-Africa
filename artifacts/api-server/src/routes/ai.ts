import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, aiInsights, inventoryProducts } from "@workspace/db";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { getRevenueAnalytics, getCustomerAnalytics, getTransactionAnalytics } from "../repositories/analytics";

const router: IRouter = Router();

async function inventorySnapshot(businessId: string) {
  const products = await db.select({
    quantity: inventoryProducts.quantity, reorderLevel: inventoryProducts.reorderLevel, unitCostMinor: inventoryProducts.unitCostMinor,
  }).from(inventoryProducts).where(and(eq(inventoryProducts.businessId, businessId), eq(inventoryProducts.active, true)));
  return {
    products: products.length,
    lowStock: products.filter((p) => p.quantity <= p.reorderLevel).length,
    inventoryValue: products.reduce((sum, p) => sum + p.quantity * Number(p.unitCostMinor), 0) / 100,
  };
}

async function generateModelSummaries(metrics: Record<string, unknown>): Promise<Array<{ kind: string; title: string; summary: string }> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions: "You are Kaira Africa's business analyst. Return exactly four concise, practical insights for sales, customers, inventory and transactions. Use only the supplied aggregate metrics, use GMD, never invent figures or claim causation, and output one JSON object with an insights array whose items contain kind, title and summary.",
        input: JSON.stringify(metrics),
        max_output_tokens: 700,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.warn("[ai] Model request returned HTTP " + response.status + "; using rules-based insights.");
      return null;
    }
    const body = await response.json() as {
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const text = body.output_text ?? (body.output ?? [])
      .flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && typeof item.text === "string")
      .map((item) => item.text as string).join("");
    const parsed = JSON.parse(text) as { insights?: Array<{ kind?: string; title?: string; summary?: string }> };
    if (!Array.isArray(parsed.insights) || parsed.insights.length !== 4) return null;
    const allowed = ["sales", "customers", "inventory", "transactions"];
    const insights = parsed.insights;
    if (new Set(insights.map((x) => x.kind)).size !== 4 ||
        insights.some((x) => !x.kind || !allowed.includes(x.kind) ||
          typeof x.title !== "string" || !x.title.trim() ||
          typeof x.summary !== "string" || !x.summary.trim())) return null;
    return insights as Array<{ kind: string; title: string; summary: string }>;
  } catch (error) {
    console.warn("[ai] Model narrative unavailable; using rules-based insights.", error instanceof Error ? error.name : "UnknownError");
    return null;
  }
}

router.post("/ai/insights/generate", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const [revenue, customers, transactions, inventory] = await Promise.all([
    getRevenueAnalytics(businessId, "month"), getCustomerAnalytics(businessId, "month"),
    getTransactionAnalytics(businessId, "month"), inventorySnapshot(businessId),
  ]);
  const generated = [
    { kind: "sales", title: revenue.changePercent >= 0 ? "Revenue momentum is positive" : "Revenue needs attention",
      summary: "Revenue for this period is " + revenue.total.toLocaleString("en-GM", { maximumFractionDigits: 2 }) + " GMD, " + Math.abs(revenue.changePercent) + "% " + (revenue.changePercent >= 0 ? "above" : "below") + " the previous period.",
      payload: { changePercent: revenue.changePercent, total: revenue.total } },
    { kind: "customers", title: "Customer base signal",
      summary: String(customers.total) + " customers were added in the selected period, with a " + String(customers.changePercent) + "% change from the prior period.",
      payload: { total: customers.total, changePercent: customers.changePercent } },
    { kind: "inventory", title: inventory.lowStock ? "Inventory reorder watch" : "Inventory is healthy",
      summary: inventory.lowStock ? String(inventory.lowStock) + " products are at or below their reorder level. Review these items before the next sales cycle." : "No products are currently at or below their configured reorder level.",
      payload: inventory },
    { kind: "transactions", title: "Transaction pattern",
      summary: String(transactions.total) + " transactions were recorded in this period with a total volume of " + transactions.volume.toLocaleString("en-GM", { maximumFractionDigits: 2 }) + " GMD.",
      payload: { total: transactions.total, volume: transactions.volume } },
  ];
  // The model receives only aggregate metrics, never customer names or contact details.
  const modelInsights = await generateModelSummaries({
    period: "current month compared with prior month",
    revenue: { total: revenue.total, changePercent: revenue.changePercent },
    customers: { total: customers.total, changePercent: customers.changePercent },
    transactions: { total: transactions.total, volume: transactions.volume },
    inventory,
  });
  const source = modelInsights ? "openai" : "rules";
  if (modelInsights) {
    for (const item of generated) {
      const modelItem = modelInsights.find((candidate) => candidate.kind === item.kind);
      if (modelItem) {
        item.title = modelItem.title!;
        item.summary = modelItem.summary!;
      }
    }
  }
  const rows = await Promise.all(generated.map((x) => db.insert(aiInsights).values({
    businessId, kind: x.kind, title: x.title, summary: x.summary,
    payload: { ...(x.payload as Record<string, unknown>), source },
  }).returning()));
  res.status(201).json(rows.map(([row]) => ({ ...row, generatedAt: row.generatedAt.toISOString(), createdAt: row.createdAt.toISOString() })));
});

router.get("/ai/insights", requireUser, async (req, res) => {
  const businessId = requireBusiness(req);
  const rows = await db.select().from(aiInsights).where(eq(aiInsights.businessId, businessId)).orderBy(desc(aiInsights.generatedAt)).limit(20);
  res.json(rows.map((row) => ({ ...row, generatedAt: row.generatedAt.toISOString(), createdAt: row.createdAt.toISOString() })));
});

export default router;
