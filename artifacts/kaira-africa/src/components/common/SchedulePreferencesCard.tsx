import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, BellRing, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequestJson } from "@/lib/api-client";

export const TIMEZONE_OPTIONS = [
  ["Africa/Banjul", "The Gambia (GMT)"],
  ["Africa/Accra", "Ghana (GMT)"],
  ["Africa/Lagos", "Nigeria (WAT)"],
  ["Africa/Abidjan", "Côte d’Ivoire (GMT)"],
  ["Africa/Nairobi", "Kenya (EAT)"],
  ["Africa/Johannesburg", "South Africa (SAST)"],
  ["Europe/London", "United Kingdom"],
  ["Europe/Paris", "Central Europe"],
  ["Europe/Berlin", "Germany"],
  ["America/New_York", "US Eastern"],
  ["America/Chicago", "US Central"],
  ["America/Denver", "US Mountain"],
  ["America/Los_Angeles", "US Pacific"],
  ["America/Toronto", "Canada Eastern"],
  ["America/Sao_Paulo", "Brazil"],
  ["Asia/Dubai", "United Arab Emirates"],
  ["Asia/Kolkata", "India"],
  ["Asia/Singapore", "Singapore"],
  ["Asia/Tokyo", "Japan"],
  ["Australia/Sydney", "Australia Eastern"],
  ["UTC", "UTC"],
] as const;

type ReminderPreferences = { dueTodayEnabled: boolean; overdueEnabled: boolean };
type TimezoneResponse = { timezone: string };

export default function SchedulePreferencesCard() {
  const qc = useQueryClient();
  const timezoneQ = useQuery({ queryKey: ["business-timezone"], queryFn: () => apiRequestJson<TimezoneResponse>("/businesses/me/timezone") });
  const prefsQ = useQuery({ queryKey: ["notification-preferences"], queryFn: () => apiRequestJson<ReminderPreferences>("/notifications/preferences") });
  const [timezone, setTimezone] = useState("Africa/Banjul");
  const [dueTodayEnabled, setDueTodayEnabled] = useState(true);
  const [overdueEnabled, setOverdueEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (timezoneQ.data?.timezone) setTimezone(timezoneQ.data.timezone); }, [timezoneQ.data?.timezone]);
  useEffect(() => {
    if (prefsQ.data) {
      setDueTodayEnabled(prefsQ.data.dueTodayEnabled);
      setOverdueEnabled(prefsQ.data.overdueEnabled);
    }
  }, [prefsQ.data?.dueTodayEnabled, prefsQ.data?.overdueEnabled]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequestJson("/businesses/me/timezone", { method: "PATCH", body: JSON.stringify({ timezone }) });
      await apiRequestJson("/notifications/preferences", { method: "PATCH", body: JSON.stringify({ dueTodayEnabled, overdueEnabled }) });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["business-timezone"] }),
        qc.invalidateQueries({ queryKey: ["notification-preferences"] }),
        qc.invalidateQueries({ queryKey: ["work-meetings"] }),
      ]);
      setNotice("Schedule time zone and reminder preferences saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save these preferences. Please try again.");
    } finally { setSaving(false); }
  }

  return <Card className="rounded-2xl">
    <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary"/>Schedules & reminders</CardTitle>
      <p className="text-sm text-muted-foreground">Choose the business clock used for task deadlines and schedules. Meeting records can use a different time zone when needed for remote teams.</p>
    </CardHeader>
    <CardContent>
      {timezoneQ.isLoading || prefsQ.isLoading ? <p className="text-sm text-muted-foreground">Loading your saved preferences…</p> : null}
      {(timezoneQ.error || prefsQ.error) && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">Could not load your saved preferences. Refresh this page and try again.</p>}
      <form onSubmit={save} className="space-y-5">
        <label className="block space-y-1.5 text-sm font-medium">Business time zone
          <select className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={timezone} onChange={e=>setTimezone(e.target.value)} disabled={timezoneQ.isLoading}>
            {TIMEZONE_OPTIONS.map(([value,label])=><option key={value} value={value}>{label} — {value}</option>)}
          </select>
          <span className="block text-xs font-normal text-muted-foreground">Used for business-day calculations, task due reminders and the default time zone for new meetings. Choose the zone where your team normally operates.</span>
        </label>
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-start gap-3"><BellRing className="mt-0.5 h-5 w-5 text-primary"/><div><h3 className="font-medium">In-app task reminders</h3><p className="text-xs text-muted-foreground">These settings control reminder notifications inside Kaira Africa. Email and push delivery are not enabled by this setting.</p></div></div>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={dueTodayEnabled} onChange={e=>setDueTodayEnabled(e.target.checked)}/><span><span className="font-medium">Tasks due today</span><span className="block text-xs text-muted-foreground">Notify me when an open task reaches its due date in the business time zone.</span></span></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={overdueEnabled} onChange={e=>setOverdueEnabled(e.target.checked)}/><span><span className="font-medium">Overdue tasks</span><span className="block text-xs text-muted-foreground">Notify me once per business day for open tasks that are past their due date.</span></span></label>
        </div>
        {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
        <Button type="submit" disabled={saving || timezoneQ.isLoading || prefsQ.isLoading}><Save className="mr-2 h-4 w-4"/>{saving ? "Saving…" : "Save preferences"}</Button>
      </form>
    </CardContent>
  </Card>;
}
