import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, Clock3, FolderKanban, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/common/PageTransition";
import { apiRequestJson } from "@/lib/api-client";

type Task = { id:string; title:string; status:string; priority:string; dueDate:string|null; projectId:string|null };
type Meeting = { id:string; title:string; meetingType:string; startsAt:string|null; status:string; attendees:string[] };
type ScheduleItem = { id:string; title:string; kind:"task"|"meeting"; date:Date; status:string; detail:string; href:string };

function readableDate(date:Date) {
  return date.toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric",hour:date.getHours()||date.getMinutes()? "numeric":undefined,minute:date.getHours()||date.getMinutes()?"2-digit":undefined});
}

export default function CalendarSchedulePage() {
  const [range,setRange]=useState<"upcoming"|"all">("upcoming");\n  const businessPreferencesQ=useQuery({queryKey:["business-preferences"],queryFn:()=>apiRequestJson<{timeZone:string}>("/businesses/me/preferences")});\n  const businessTimeZone=businessPreferencesQ.data?.timeZone||"Africa/Banjul";
  const tasksQ=useQuery({queryKey:["work-tasks"],queryFn:()=>apiRequestJson<Task[]>("/work/tasks")});
  const meetingsQ=useQuery({queryKey:["work-meetings"],queryFn:()=>apiRequestJson<Meeting[]>("/work/meetings")});
  const items=useMemo<ScheduleItem[]>(()=>{
    const rows:ScheduleItem[]=[
      ...(tasksQ.data??[]).filter(t=>t.dueDate && t.status!=="done" && t.status!=="cancelled").map(t=>({id:t.id,title:t.title,kind:"task" as const,date:new Date(t.dueDate+"T12:00:00Z"),status:t.status,detail:"Task due date · "+t.priority+" priority",href:"/work-management/tasks"})),
      ...(meetingsQ.data??[]).filter(m=>m.startsAt && m.status!=="cancelled").map(m=>({id:m.id,title:m.title,kind:"meeting" as const,date:new Date(m.startsAt!),status:m.status,detail:"Meeting · "+m.meetingType,href:"/work-management/meetings"}))
    ].filter(x=>!Number.isNaN(x.date.getTime())).sort((a,b)=>a.date.getTime()-b.date.getTime());
    return range==="upcoming"?rows.filter(x=>x.date.getTime()>=new Date(new Date().setHours(0,0,0,0)).getTime()):rows;
  },[tasksQ.data,meetingsQ.data,range]);
  const loading=tasksQ.isLoading||meetingsQ.isLoading||businessPreferencesQ.isLoading;
  const error=tasksQ.error||meetingsQ.error;
  return <PageTransition><main className="mx-auto w-full max-w-6xl space-y-6 p-1 sm:p-2">
    <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><Badge className="mb-3 bg-emerald-100 text-emerald-900">KAIRA • WORK MANAGEMENT</Badge><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Calendar & schedule</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">See scheduled meetings and task due dates together. Items are loaded from your saved Work Management records and stay scoped to your signed-in business.</p></div>
        <Button variant="outline" onClick={()=>{void tasksQ.refetch();void meetingsQ.refetch();}} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/>Refresh schedule</Button>
      </div>
    </section>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><CalendarDays className="h-5 w-5 text-emerald-800"/><div><p className="text-xs text-slate-500">Scheduled meetings</p><p className="text-xl font-bold">{(meetingsQ.data??[]).filter(m=>m.startsAt&&m.status!=="cancelled").length}</p></div></CardContent></Card>
      <Card className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><ClipboardList className="h-5 w-5 text-emerald-800"/><div><p className="text-xs text-slate-500">Open tasks with due dates</p><p className="text-xl font-bold">{(tasksQ.data??[]).filter(t=>t.dueDate&&t.status!=="done"&&t.status!=="cancelled").length}</p></div></CardContent></Card>
      <Card className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><Clock3 className="h-5 w-5 text-emerald-800"/><div><p className="text-xs text-slate-500">Items shown</p><p className="text-xl font-bold">{items.length}</p></div></CardContent></Card>
    </div>
    <Card className="rounded-2xl"><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-800"/>Your schedule</CardTitle><div className="flex gap-2"><Button size="sm" variant={range==="upcoming"?"default":"outline"} onClick={()=>setRange("upcoming")}>Upcoming</Button><Button size="sm" variant={range==="all"?"default":"outline"} onClick={()=>setRange("all")}>All dated items</Button></div></CardHeader><CardContent className="space-y-3">
      {loading&&<p className="py-8 text-center text-sm text-slate-500">Loading your saved schedule…</p>}
      {Boolean(error)&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load your schedule. Check your connection and try refreshing.</div>}
      {!loading&&!error&&items.length===0&&<div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-400"/><h2 className="font-semibold text-slate-800">Nothing scheduled here yet</h2><p className="mt-2 text-sm text-slate-600">Add a meeting date or a task due date in Work Management and it will appear here.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Button asChild><Link href="/work-management/meetings">Manage meetings</Link></Button><Button variant="outline" asChild><Link href="/work-management/tasks">Manage tasks</Link></Button></div></div>}
      {!loading&&!error&&items.map(item=><div key={item.kind+item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><div className="rounded-lg bg-emerald-50 p-2 text-emerald-900">{item.kind==="meeting"?<CalendarDays className="h-5 w-5"/>:<ClipboardList className="h-5 w-5"/>}</div><div className="min-w-0"><p className="font-semibold text-slate-900">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.detail}</p><p className="mt-1 text-sm font-medium text-emerald-900">{readableDate(item.date,item.kind==="task"?"UTC":businessTimeZone,item.kind==="task")}</p></div></div><div className="flex items-center gap-2"><Badge variant="outline">{item.status.replaceAll("_"," ")}</Badge><Button size="sm" variant="outline" asChild><Link href={item.href}>Open</Link></Button></div></div>)}
    </CardContent></Card>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Scope note:</strong> this first schedule view combines existing task due dates and meeting times. Creating standalone calendar events, recurring events, reminders and calendar integrations are not yet included.</div>
  </main></PageTransition>;
}
