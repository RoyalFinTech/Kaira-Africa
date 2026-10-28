import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, workProjects, workTasks, workTaskEvents, workMeetings, teamMembers } from "@workspace/db";
import { requireUser, requireBusiness } from "../middlewares/auth";
import { BadRequestError, NotFoundError } from "../lib/http-errors";
import { createNotification } from "../repositories/notifications";

const router: IRouter = Router();
const date = z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional().nullable();
const projectInput = z.object({ name:z.string().trim().min(2).max(120), description:z.string().trim().max(2000).optional(), dueDate:date });
const taskInput = z.object({ title:z.string().trim().min(2).max(160), description:z.string().trim().max(4000).optional(), projectId:z.string().uuid().optional().nullable(), assignedTo:z.string().uuid().optional().nullable(), priority:z.enum(["low","medium","high","urgent"]).default("medium"), dueDate:date });
const taskPatch = z.object({ title:z.string().trim().min(2).max(160).optional(), description:z.string().trim().max(4000).nullable().optional(), projectId:z.string().uuid().nullable().optional(), assignedTo:z.string().uuid().nullable().optional(), priority:z.enum(["low","medium","high","urgent"]).optional(), status:z.enum(["todo","in_progress","done","cancelled"]).optional(), dueDate:date });
const meetingInput = z.object({ title:z.string().trim().min(2).max(160), meetingType:z.enum(["team","client","planning","review","other"]).default("team"), startsAt:z.string().datetime().optional().nullable(), attendees:z.array(z.string().trim().min(1).max(120)).max(100).default([]), agenda:z.string().max(4000).optional(), minutes:z.string().max(20000).optional(), decisions:z.string().max(10000).optional(), status:z.enum(["scheduled","held","cancelled"]).optional() });

async function verifyAssignee(businessId:string, userId:string|null|undefined) {
  if (!userId) return;
  const [member] = await db.select({id:teamMembers.id}).from(teamMembers).where(and(
    eq(teamMembers.businessId,businessId),eq(teamMembers.userId,userId),eq(teamMembers.status,"active")
  )).limit(1);
  if (!member) throw new BadRequestError("Choose an active team member who has linked their Kaira user account.");
}
async function verifyProject(businessId:string, projectId:string|null|undefined) {
  if (!projectId) return;
  const [project] = await db.select({id:workProjects.id}).from(workProjects).where(and(eq(workProjects.id,projectId),eq(workProjects.businessId,businessId))).limit(1);
  if (!project) throw new BadRequestError("Project not found in this business.");
}
router.get("/work/assignees",requireUser,async(req,res)=>{
 const businessId=requireBusiness(req);
 const members=await db.select({userId:teamMembers.userId,firstName:teamMembers.firstName,lastName:teamMembers.lastName,role:teamMembers.role}).from(teamMembers).where(and(eq(teamMembers.businessId,businessId),eq(teamMembers.status,"active")));
 res.json(members.flatMap(m=>m.userId ? [{...m,userId:m.userId}] : []));
});
router.get("/work/projects",requireUser,async(req,res)=>{
 const businessId=requireBusiness(req);
 res.json(await db.select().from(workProjects).where(eq(workProjects.businessId,businessId)).orderBy(desc(workProjects.createdAt)));
});
router.post("/work/projects",requireUser,async(req,res)=>{
 const businessId=requireBusiness(req),input=projectInput.parse(req.body);
 const [project]=await db.insert(workProjects).values({businessId,createdBy:req.user!.id,name:input.name,description:input.description||null,dueDate:input.dueDate||null}).returning();
 res.status(201).json(project);
});
router.patch("/work/projects/:id",requireUser,async(req,res)=>{
 const businessId=requireBusiness(req),id=z.string().uuid().parse(req.params.id);
 const input=z.object({name:z.string().trim().min(2).max(120).optional(),description:z.string().max(2000).nullable().optional(),dueDate:date,status:z.enum(["active","completed","archived"]).optional()}).parse(req.body);
 const [project]=await db.update(workProjects).set({...input,updatedAt:new Date()}).where(and(eq(workProjects.id,id),eq(workProjects.businessId,businessId))).returning();
 if(!project) throw new NotFoundError("Project not found."); res.json(project);
});
router.get("/work/tasks",requireUser,async(req,res)=>{
 const businessId=requireBusiness(req);
 const tasks=await db.select().from(workTasks).where(eq(workTasks.businessId,businessId)).orderBy(desc(workTasks.createdAt)).limit(500);
 res.json(tasks);
});
router.post("/work/tasks",requireUser,async(req,res)=>{
 const businessId=requireBusiness(req),input=taskInput.parse(req.body);
 await verifyAssignee(businessId,input.assignedTo); await verifyProject(businessId,input.projectId);
 const [task]=await db.insert(workTasks).values({businessId,createdBy:req.user!.id,title:input.title,description:input.description||null,projectId:input.projectId||null,assignedTo:input.assignedTo||null,priority:input.priority,dueDate:input.dueDate||null}).returning();
 await db.insert(workTaskEvents).values({businessId,taskId:task.id,actorId:req.user!.id,eventType:"created",details:{title:task.title,assignedTo:task.assignedTo}});
 if (task.assignedTo && task.assignedTo !== req.user!.id) {
   await createNotification({recipientUserId:task.assignedTo,title:"New task assigned",message:`You have been assigned: ${task.title}${task.dueDate ? ` (due ${task.dueDate})` : ""}.`,type:"task",actionUrl:"/work-management/tasks"});
 }
 res.status(201).json(task);
});
router.patch("/work/tasks/:id",requireUser,async(req,res)=>{
 const businessId=requireBusiness(req),id=z.string().uuid().parse(req.params.id),input=taskPatch.parse(req.body);
 if(input.assignedTo!==undefined) await verifyAssignee(businessId,input.assignedTo);
 if(input.projectId!==undefined) await verifyProject(businessId,input.projectId);
 const [before]=await db.select().from(workTasks).where(and(eq(workTasks.id,id),eq(workTasks.businessId,businessId))).limit(1);
 if(!before) throw new NotFoundError("Task not found.");
 const [task]=await db.update(workTasks).set({...input,updatedAt:new Date(),...(input.status==="done"?{completedAt:new Date()}:input.status?{completedAt:null}:{})}).where(and(eq(workTasks.id,id),eq(workTasks.businessId,businessId))).returning();
 await db.insert(workTaskEvents).values({businessId,taskId:id,actorId:req.user!.id,eventType:input.status&&input.status!==before.status?"status_changed":"updated",details:{before:{status:before.status,assignedTo:before.assignedTo},after:input}});
 if (input.assignedTo !== undefined && input.assignedTo && input.assignedTo !== before.assignedTo && input.assignedTo !== req.user!.id) {
   await createNotification({recipientUserId:input.assignedTo,title:"Task assigned to you",message:`You have been assigned: ${task.title}${task.dueDate ? ` (due ${task.dueDate})` : ""}.`,type:"task",actionUrl:"/work-management/tasks"});
 }
 if (input.status && input.status !== before.status && before.createdBy !== req.user!.id) {
   await createNotification({recipientUserId:before.createdBy,title:"Task status updated",message:`"${task.title}" is now ${task.status.replace("_"," ")}.`,type:"task",actionUrl:"/work-management/tasks"});
 }
 res.json(task);
});
router.get("/work/meetings",requireUser,async(req,res)=>{
 const businessId=requireBusiness(req);
 res.json(await db.select().from(workMeetings).where(eq(workMeetings.businessId,businessId)).orderBy(desc(workMeetings.startsAt)).limit(300));
});
router.post("/work/meetings",requireUser,async(req,res)=>{
 const businessId=requireBusiness(req),input=meetingInput.parse(req.body);
 const [meeting]=await db.insert(workMeetings).values({businessId,createdBy:req.user!.id,title:input.title,meetingType:input.meetingType,startsAt:input.startsAt?new Date(input.startsAt):null,attendees:input.attendees,agenda:input.agenda||null,minutes:input.minutes||null,decisions:input.decisions||null,status:input.status||"scheduled"}).returning();
 res.status(201).json(meeting);
});
router.patch("/work/meetings/:id",requireUser,async(req,res)=>{
 const businessId=requireBusiness(req),id=z.string().uuid().parse(req.params.id),input=meetingInput.partial().parse(req.body);
 const {startsAt,...meetingFields}=input;
 const [meeting]=await db.update(workMeetings).set({...meetingFields,...(startsAt!==undefined?{startsAt:startsAt?new Date(startsAt):null}:{}),updatedAt:new Date()}).where(and(eq(workMeetings.id,id),eq(workMeetings.businessId,businessId))).returning();
 if(!meeting) throw new NotFoundError("Meeting not found."); res.json(meeting);
});
export default router;
