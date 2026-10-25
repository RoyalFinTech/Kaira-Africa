import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, savingsGoals, savingsEntries } from "@workspace/db";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { BadRequestError, NotFoundError } from "../lib/http-errors";
import { fromMinorUnits, toMinorUnits } from "../lib/money";

const router: IRouter = Router();
const currencies = ["GMD", "NGN", "USD"] as const;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const goalInput = z.object({
  name: z.string().trim().min(2).max(120),
  purpose: z.string().trim().max(500).optional(),
  currency: z.enum(currencies).default("GMD"),
  targetAmount: z.number().finite().positive().max(1_000_000_000),
  targetDate: z.string().regex(datePattern).optional(),
  savingFrequency: z.enum(["daily","weekly","monthly","flexible"]).default("weekly"),
});
const entryInput = z.object({
  goalId: z.string().uuid().optional(),
  entryType: z.enum(["deposit","withdrawal"]).default("deposit"),
  amount: z.number().finite().positive().max(1_000_000_000),
  currency: z.enum(currencies).default("GMD"),
  savedDate: z.string().regex(datePattern).optional(),
  destinationType: z.enum(["mobile_money","bank","microfinance","cash","savings_group","other"]),
  provider: z.string().trim().min(2).max(100),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});
function today() { return new Date().toISOString().slice(0,10); }
function serializeGoal(g: typeof savingsGoals.$inferSelect) {
  return { id:g.id, name:g.name, purpose:g.purpose, currency:g.currency,
    targetAmount:fromMinorUnits(Number(g.targetMinor),g.currency), targetDate:g.targetDate,
    savingFrequency:g.savingFrequency, status:g.status, createdAt:g.createdAt.toISOString() };
}
function serializeEntry(e: typeof savingsEntries.$inferSelect) {
  return { id:e.id, goalId:e.goalId, entryType:e.entryType, amount:fromMinorUnits(Number(e.amountMinor),e.currency),
    currency:e.currency, savedDate:e.savedDate, destinationType:e.destinationType, provider:e.provider,
    reference:e.reference, notes:e.notes, createdAt:e.createdAt.toISOString() };
}
router.get("/savings/overview", requireUser, async (req,res) => {
  const businessId=requireBusiness(req);
  const goals=await db.select().from(savingsGoals).where(eq(savingsGoals.businessId,businessId)).orderBy(desc(savingsGoals.createdAt));
  const entries=await db.select().from(savingsEntries).where(eq(savingsEntries.businessId,businessId))
    .orderBy(desc(savingsEntries.savedDate),desc(savingsEntries.createdAt)).limit(500);
  const currencyTotals = new Map<string,{deposits:number;withdrawals:number;balance:number}>();
  for(const e of entries){
    const c=e.currency; const t=currencyTotals.get(c)??{deposits:0,withdrawals:0,balance:0};
    const amount=fromMinorUnits(Number(e.amountMinor),c);
    if(e.entryType==="deposit"){t.deposits+=amount;t.balance+=amount;}else{t.withdrawals+=amount;t.balance-=amount;}
    currencyTotals.set(c,t);
  }
  const goalTotals = new Map<string,number>();
  for(const e of entries) if(e.goalId){const amount=fromMinorUnits(Number(e.amountMinor),e.currency);goalTotals.set(e.goalId,(goalTotals.get(e.goalId)??0)+(e.entryType==="deposit"?amount:-amount));}
  res.json({goals:goals.map(g=>({...serializeGoal(g),savedAmount:Number((goalTotals.get(g.id)??0).toFixed(2)),progressPercent:Math.min(100,Math.max(0,Math.round(((goalTotals.get(g.id)??0)/fromMinorUnits(Number(g.targetMinor),g.currency))*100)))})),
    entries:entries.map(serializeEntry), totals:[...currencyTotals.entries()].map(([currency,v])=>({currency,...Object.fromEntries(Object.entries(v).map(([k,n])=>[k,Number(n.toFixed(2))]))}))});
});
router.post("/savings/goals", requireUser, async(req,res)=>{
  const businessId=requireBusiness(req), input=goalInput.parse(req.body);
  const [g]=await db.insert(savingsGoals).values({businessId,createdBy:req.user!.id,name:input.name,purpose:input.purpose||null,
    currency:input.currency,targetMinor:toMinorUnits(input.targetAmount,input.currency),targetDate:input.targetDate||null,savingFrequency:input.savingFrequency}).returning();
  res.status(201).json({...serializeGoal(g),savedAmount:0,progressPercent:0});
});
router.patch("/savings/goals/:id/status", requireUser, async(req,res)=>{
  const businessId=requireBusiness(req), id=z.string().uuid().parse(req.params.id);
  const input=z.object({status:z.enum(["active","completed","paused","archived"])}).parse(req.body);
  const [g]=await db.update(savingsGoals).set({status:input.status,updatedAt:new Date()}).where(and(eq(savingsGoals.id,id),eq(savingsGoals.businessId,businessId))).returning();
  if(!g) throw new NotFoundError("Savings goal not found.");
  res.json(serializeGoal(g));
});
router.post("/savings/entries", requireUser, async(req,res)=>{
  const businessId=requireBusiness(req), input=entryInput.parse(req.body);
  if(input.savedDate && input.savedDate>today()) throw new BadRequestError("Savings entries cannot be dated in the future.");
  if(input.goalId){
    const [goal]=await db.select().from(savingsGoals).where(and(eq(savingsGoals.id,input.goalId),eq(savingsGoals.businessId,businessId)));
    if(!goal) throw new NotFoundError("Savings goal not found for this business.");
    if(goal.currency!==input.currency) throw new BadRequestError("The entry currency must match the selected goal. Use a separate goal for another currency.");
  }
  if(input.entryType==="withdrawal" && input.goalId){
    const prior=await db.select({type:savingsEntries.entryType,amount:savingsEntries.amountMinor}).from(savingsEntries)
      .where(and(eq(savingsEntries.goalId,input.goalId),eq(savingsEntries.businessId,businessId)));
    const balance=prior.reduce((sum,e)=>sum+(e.type==="deposit"?Number(e.amount):-Number(e.amount)),0);
    if(toMinorUnits(input.amount,input.currency)>balance) throw new BadRequestError("This withdrawal is greater than the recorded savings for the selected goal.");
  }
  const [e]=await db.insert(savingsEntries).values({businessId,goalId:input.goalId||null,createdBy:req.user!.id,entryType:input.entryType,
    amountMinor:toMinorUnits(input.amount,input.currency),currency:input.currency,savedDate:input.savedDate||today(),
    destinationType:input.destinationType,provider:input.provider,reference:input.reference||null,notes:input.notes||null}).returning();
  res.status(201).json(serializeEntry(e));
});
export default router;
