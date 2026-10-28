import { pgTable, uuid, text, date, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";

export const workProjects = pgTable("work_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  dueDate: date("due_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("work_projects_business_status_idx").on(t.businessId,t.status)]);

export const workTasks = pgTable("work_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => workProjects.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  dueDate: date("due_date", { mode: "string" }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("work_tasks_business_status_due_idx").on(t.businessId,t.status,t.dueDate),index("work_tasks_assignee_idx").on(t.businessId,t.assignedTo)]);

export const workTaskEvents = pgTable("work_task_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").notNull().references(() => workTasks.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  details: jsonb("details").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("work_task_events_task_created_idx").on(t.taskId,t.createdAt)]);

export const workMeetings = pgTable("work_meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessId: uuid("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  meetingType: text("meeting_type").notNull().default("team"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  timezone: text("timezone").notNull().default("Africa/Banjul"),
  attendees: jsonb("attendees").notNull().default([]),
  agenda: text("agenda"),
  minutes: text("minutes"),
  decisions: text("decisions"),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("work_meetings_business_date_idx").on(t.businessId,t.startsAt)]);
