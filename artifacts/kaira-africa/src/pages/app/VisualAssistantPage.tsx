import { useState } from "react";
import { BrainCircuit, Send, ShieldCheck, Sparkles, RotateCcw } from "lucide-react";
import { PageTransition } from "@/components/common/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequestJson } from "@/lib/api-client";

type AssistantReply = { answer: string; mode: string; stored: boolean };

const suggestions = [
  "Help me turn a remote client brief into clear deliverables and milestones.",
  "Draft a professional proposal for a freelance client, including scope and timeline.",
  "Help me break a large remote-work assignment into trackable tasks.",
  "Prepare a daily progress update I can send to my client or manager.",
  "Help me plan my freelance workload and prioritise deadlines.",
  "Explain how to use Kaira Africa to manage my small business.",
];

export default function VisualAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Array<{ question: string; answer: string }>>([]);

  async function ask(question = prompt) {
    const clean = question.trim();
    if (clean.length < 3) { setError("Please enter a question of at least 3 characters."); return; }
    setBusy(true); setError(""); setAnswer("");
    try {
      const result = await apiRequestJson<AssistantReply>("/ai/assistant", {
        method: "POST",
        body: JSON.stringify({ prompt: clean }),
      });
      setAnswer(result.answer);
      setHistory((items) => [...items, { question: clean, answer: result.answer }]);
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant could not answer right now.");
    } finally {
      setBusy(false);
    }
  }

  return <PageTransition><main className="mx-auto w-full max-w-5xl space-y-6 p-1 sm:p-2">
    <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-8"><svg aria-hidden="true" viewBox="0 0 230 130" className="pointer-events-none absolute -right-3 -top-2 hidden h-32 w-56 opacity-90 sm:block"><path d="M127 6C168 0 218 20 220 55s-26 64-65 67-86-12-88-48S86 12 127 6Z" fill="#D1FAE5"/><rect x="112" y="26" width="78" height="64" rx="12" fill="#0D3B2A"/><path d="m129 45 10 10-10 10m19 0h24" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="85" cy="32" r="7" fill="#E7B32B"/><circle cx="193" cy="103" r="5" fill="#B45309"/></svg>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0D3B2A] text-white"><Sparkles className="h-7 w-7"/></div>
        <div className="min-w-0"><Badge className="mb-2 bg-emerald-100 text-emerald-900">KAIRA • FREELANCER WORKSPACE</Badge><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Your remote-work copilot</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Plan freelance work, turn client briefs into task lists, draft proposals and progress updates, and get help managing a remote team’s workload. This assistant suggests and drafts; it does not monitor workers automatically, access your screen, or analyse uploaded images.</p></div>
      </div>
    </section>
    <Card className="rounded-2xl border-emerald-100 bg-white shadow-sm"><CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:p-5"><div><p className="text-sm font-semibold text-slate-900">1. Describe the client outcome</p><p className="mt-1 text-sm leading-6 text-slate-600">Explain the brief, deadline, deliverables and any constraints. Avoid sharing passwords or confidential client data.</p></div><div><p className="text-sm font-semibold text-slate-900">2. Break work into deliverables</p><p className="mt-1 text-sm leading-6 text-slate-600">Ask for milestones, subtasks, acceptance criteria, time estimates or a client-ready update.</p></div><div><p className="text-sm font-semibold text-slate-900">3. Track work transparently</p><p className="mt-1 text-sm leading-6 text-slate-600">Create or assign tasks in Work Management and use agreed time tracking when available. Always review drafts before sending them.</p></div></CardContent></Card>
    <Card className="rounded-2xl border-emerald-100 shadow-sm">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><BrainCircuit className="h-5 w-5 text-emerald-800"/>Freelancer & remote-work assistant</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{suggestions.map((item) => <button key={item} type="button" onClick={() => { setPrompt(item); setError(""); }} className="rounded-xl border border-slate-200 p-3 text-left text-sm text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50">{item}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); void ask(); }} className="space-y-3">
          <label className="block text-sm font-medium text-slate-800">What do you need to deliver for your client or team?<Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={4000} rows={4} placeholder="Describe what you're trying to do. Please do not include passwords, PINs, OTPs or sensitive customer information."/><span className="mt-1 block text-xs text-slate-500">{prompt.length}/4000 characters. Your question and answer are not saved to Kaira's database by this feature.</span></label>
          {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>}
          <Button type="submit" disabled={busy || prompt.trim().length < 3} className="bg-[#0D3B2A] hover:bg-emerald-900"><Send className="mr-2 h-4 w-4"/>{busy ? "Thinking…" : "Ask the copilot"}</Button>
        </form>
      </CardContent>
    </Card>
    {answer && <Card className="rounded-2xl border-emerald-100"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-emerald-800"/>Suggested plan or draft</CardTitle></CardHeader><CardContent><div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{answer}</div><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4"/>Drafting support only. Review outputs before sharing with a client or changing business records.</div></CardContent></Card>}
    {history.length > 0 && <div className="flex items-center justify-between"><p className="text-sm text-slate-500">This page session: {history.length} answer{history.length === 1 ? "" : "s"} (not saved after leaving the page).</p><Button variant="outline" size="sm" onClick={() => { setHistory([]); setAnswer(""); setError(""); }}><RotateCcw className="mr-2 h-4 w-4"/>Clear session</Button></div>}
    <Card className="rounded-2xl bg-slate-50"><CardContent className="flex gap-3 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800"/><div><h2 className="text-sm font-semibold text-slate-900">Privacy, transparency and current limits</h2><p className="mt-1 text-sm leading-6 text-slate-600">This version sends only the question you type to the configured AI provider. It does not send your customer records, transactions, inventory, screen or images. Do not enter passwords, client secrets or confidential information. The assistant does not prove whether a worker is active, track time automatically, or replace task assignment and time-entry records. Presence/time tracking, team chat, image understanding, screen guidance, OCR, file analysis and voice transcription require separate implementations and verification.</p></div></CardContent></Card>
  </main></PageTransition>;
}
