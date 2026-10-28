import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Play, Square, ShieldCheck } from "lucide-react";
import { apiRequestJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type TimeEntry = { id:string; userId:string; taskId:string|null; note:string|null; startedAt:string; endedAt:string|null; firstName?:string|null; lastName?:string|null };
type CurrentResponse = { entry: TimeEntry|null };

function duration(start:string,end:string|null) {
  const seconds=Math.max(0,Math.floor(((end?new Date(end):new Date()).getTime()-new Date(start).getTime())/1000));
  const hours=Math.floor(seconds/3600), minutes=Math.floor((seconds%3600)/60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default function WorkTimePage() {
  const [note,setNote]=useState("");
  const [taskId,setTaskId]=useState("");
  const queryClient=useQueryClient();
  const current=useQuery({queryKey:["work-time-current"],queryFn:()=>apiRequestJson<CurrentResponse>("/work/time-entries/current")});
  const history=useQuery({queryKey:["work-time-history"],queryFn:()=>apiRequestJson<TimeEntry[]>("/work/time-entries?limit=100")});
  const refresh=async()=>{await Promise.all([queryClient.invalidateQueries({queryKey:["work-time-current"]}),queryClient.invalidateQueries({queryKey:["work-time-history"]})]);};
  const start=useMutation({mutationFn:()=>apiRequestJson<TimeEntry>("/work/time-entries/start",{method:"POST",body:JSON.stringify({note:note.trim()||undefined,taskId:taskId.trim()||undefined})}),onSuccess:async()=>{setNote("");setTaskId("");await refresh();}});
  const stop=useMutation({mutationFn:(id:string)=>apiRequestJson<TimeEntry>(`/work/time-entries/${id}/stop`,{method:"POST"}),onSuccess:refresh});
  const active=current.data?.entry;
  const entries=history.data??[];
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 sm:p-8">
      <div className="flex items-center gap-3"><div className="rounded-2xl bg-emerald-900 p-3 text-white"><Clock3 className="h-6 w-6"/></div><div><p className="text-xs font-semibold tracking-wider text-emerald-800">KAIRA • WORK MANAGEMENT</p><h1 className="text-2xl font-bold text-slate-900">My work time</h1></div></div>
      <p className="mt-3 text-sm leading-6 text-slate-600">Start and stop your own work sessions. Entries are visible to you and authorized managers in your business. Kaira does not record keystrokes, screenshots, or covert activity.</p>
    </header>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-800"/><h2 className="font-semibold">Current session</h2></div>
      {current.isLoading?<p className="py-5 text-sm text-slate-500">Checking your session…</p>:active?<div className="mt-4 space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div><p className="font-semibold text-emerald-950">Timer running</p><p className="text-sm text-emerald-900">Started {new Date(active.startedAt).toLocaleString()} · {duration(active.startedAt,null)}</p>{active.note&&<p className="mt-2 text-sm text-slate-700">{active.note}</p>}</div><Button onClick={()=>stop.mutate(active.id)} disabled={stop.isPending} className="bg-emerald-900 hover:bg-emerald-800"><Square className="mr-2 h-4 w-4"/>{stop.isPending?"Stopping…":"Stop session"}</Button></div>:<form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();if(!start.isPending)start.mutate();}}><label htmlFor="work-time-task" className="block text-sm font-medium text-slate-700">Task ID (optional)</label><input id="work-time-task" value={taskId} onChange={e=>setTaskId(e.target.value)} placeholder="Paste a task ID if you are tracking a specific task" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"/><label htmlFor="work-time-note" className="block text-sm font-medium text-slate-700">What are you working on? (optional)</label><Textarea id="work-time-note" value={note} onChange={e=>setNote(e.target.value)} maxLength={500} rows={3} placeholder="e.g. Preparing a client proposal or reviewing inventory"/><Button type="submit" disabled={start.isPending} className="bg-emerald-900 hover:bg-emerald-800"><Play className="mr-2 h-4 w-4"/>{start.isPending?"Starting…":"Start work session"}</Button></form>}
      {(start.isError||stop.isError||current.isError)&&<p role="alert" className="mt-3 text-sm text-red-700">Could not update or load the session. Please try again.</p>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="font-semibold">Recent time entries</h2>{history.isLoading?<p className="py-5 text-sm text-slate-500">Loading entries…</p>:history.isError?<p role="alert" className="py-5 text-sm text-red-700">Could not load time entries.</p>:entries.length===0?<p className="py-8 text-center text-sm text-slate-500">No work sessions recorded yet.</p>:<div className="mt-4 divide-y divide-slate-100">{entries.map(entry=><article key={entry.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div><p className="font-medium text-slate-800">{entry.note||"Work session"}{entry.taskId&&<span className="ml-2 text-xs text-slate-500">Task linked</span>}</p><p className="mt-1 text-xs text-slate-500">{entry.firstName||"You"} {entry.lastName||""} · {new Date(entry.startedAt).toLocaleString()}</p></div><div className="text-right"><p className="font-semibold text-slate-800">{duration(entry.startedAt,entry.endedAt)}</p><p className="text-xs text-slate-500">{entry.endedAt?new Date(entry.endedAt).toLocaleString():"In progress"}</p></div></article>)}</div>}</section>
  </div>;
}
