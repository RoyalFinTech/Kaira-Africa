import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Megaphone, Send, Users } from "lucide-react";
import { apiRequestJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type TeamMessage = {
  id: string;
  businessId: string;
  senderId: string;
  messageType: "message" | "announcement";
  content: string;
  createdAt: string;
};

export default function TeamChatPage() {
  const [content, setContent] = useState("");
  const [messageType, setMessageType] = useState<"message" | "announcement">("message");
  const queryClient = useQueryClient();
  const messagesQuery = useQuery({
    queryKey: ["team-chat-messages"],
    queryFn: () => apiRequestJson<TeamMessage[]>("/team-chat/messages"),
    refetchInterval: 15000,
  });
  const send = useMutation({
    mutationFn: () => apiRequestJson<TeamMessage>("/team-chat/messages", {
      method: "POST",
      body: JSON.stringify({ content: content.trim(), messageType }),
    }),
    onSuccess: async () => {
      setContent("");
      await queryClient.invalidateQueries({ queryKey: ["team-chat-messages"] });
    },
  });
  const messages = messagesQuery.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-900 p-3 text-white"><MessageCircle className="h-6 w-6" /></div>
          <div><p className="text-xs font-semibold tracking-wider text-emerald-800">KAIRA • WORK MANAGEMENT</p><h1 className="text-2xl font-bold text-slate-900">Team chat & announcements</h1></div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">Share work updates and important announcements with people in your active business workspace. Messages are visible to members using that business workspace.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-emerald-800" /><h2 className="font-semibold">Workspace conversation</h2></div>
        {messagesQuery.isLoading ? <p className="py-8 text-center text-sm text-slate-500">Loading messages…</p>
          : messagesQuery.isError ? <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">Could not load team messages. Please try again.</div>
          : messages.length === 0 ? <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No messages yet. Start the conversation with a work update or announcement.</p>
          : <div className="max-h-[480px] space-y-3 overflow-y-auto py-2">{messages.map((message) => (
            <article key={message.id} className={`rounded-xl border p-4 ${message.messageType === "announcement" ? "border-amber-200 bg-amber-50/70" : "border-slate-100 bg-slate-50"}`}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">{message.messageType === "announcement" ? <Megaphone className="h-4 w-4 text-amber-700" /> : <MessageCircle className="h-4 w-4 text-emerald-800" />}{message.messageType === "announcement" ? "Announcement" : "Team message"}</span>
                <time className="text-xs text-slate-500">{new Date(message.createdAt).toLocaleString()}</time>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{message.content}</p>
            </article>
          ))}</div>}
        <form className="mt-5 space-y-3 border-t border-slate-100 pt-4" onSubmit={(event) => { event.preventDefault(); if (content.trim() && !send.isPending) send.mutate(); }}>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={messageType === "message" ? "default" : "outline"} onClick={() => setMessageType("message")} className={messageType === "message" ? "bg-emerald-900" : ""}><MessageCircle className="mr-2 h-4 w-4" />Message</Button>
            <Button type="button" variant={messageType === "announcement" ? "default" : "outline"} onClick={() => setMessageType("announcement")} className={messageType === "announcement" ? "bg-amber-700 hover:bg-amber-800" : ""}><Megaphone className="mr-2 h-4 w-4" />Announcement</Button>
          </div>
          <label htmlFor="team-chat-content" className="text-sm font-medium text-slate-700">{messageType === "announcement" ? "Announcement text" : "Your message"}</label>
          <Textarea id="team-chat-content" value={content} onChange={(event) => setContent(event.target.value)} maxLength={4000} rows={3} placeholder={messageType === "announcement" ? "Share an important update for the team…" : "Write a work update or question…"} />
          <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">{content.length}/4000 characters</p><Button type="submit" disabled={!content.trim() || send.isPending} className="bg-emerald-900 hover:bg-emerald-800"><Send className="mr-2 h-4 w-4" />{send.isPending ? "Sending…" : "Send"}</Button></div>
          {send.isError && <p role="alert" className="text-sm text-red-700">Message could not be sent. Please try again.</p>}
        </form>
      </section>
    </div>
  );
}
