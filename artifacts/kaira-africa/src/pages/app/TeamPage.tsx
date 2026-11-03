import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Users, Trash2, Copy, MessageCircle, RefreshCw, Ban, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageTransition } from "@/components/common/PageTransition";
import { EmptyState } from "@/components/common/EmptyState";
import { useGetMe } from "@workspace/api-client-react";
import { apiRequestJson } from "@/lib/api-client";
import { formatRelativeTime, getInitials } from "@/lib/utils";

interface TeamMemberRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
  role: string;
  accessRole: "owner" | "admin" | "manager" | "staff";
  department?: string | null;
  status: "active" | "inactive" | "pending";
  lastActiveAt?: string | null;
  joinedAt: string | null;
}

interface InvitationRow {
  id: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
  jobTitle: string;
  department?: string | null;
  accessRole: "manager" | "staff";
  expiresAt: string;
  lastSentAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  emailDeliveryStatus: "pending" | "sent" | "not_configured" | "failed";
}

interface CreatedInvite {
  id: string;
  inviteUrl: string;
  expiresAt: string;
  emailDeliveryStatus: "sent" | "not_configured" | "failed";
  inviteeFirstName: string;
  businessName: string;
  jobTitle: string;
  accessRole: "manager" | "staff";
}

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  department: "",
  accessRole: "staff" as "manager" | "staff",
};

function feedback(variant: "success" | "error" | "info", title: string, message: string) {
  window.dispatchEvent(new CustomEvent("kaira:feedback", { detail: { variant, title, message } }));
}

function invitationMessage(invite: CreatedInvite): string {
  return "Hello " + invite.inviteeFirstName + ", you have been invited to join " +
    invite.businessName + " on Kaira Africa as " + invite.jobTitle +
    ". Accept your invitation here: " + invite.inviteUrl +
    ". Sign in with the Gambian phone number this invitation was sent to. This link expires in seven days.";
}

function whatsappUrl(invite: CreatedInvite): string {
  return "https://wa.me/?text=" + encodeURIComponent(invitationMessage(invite));
}

function InviteMemberDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (invite: CreatedInvite) => void;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiRequestJson<CreatedInvite>("/team/invitations", {
        method: "POST",
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email.trim() || undefined,
          phone: form.phone,
          jobTitle: form.jobTitle,
          department: form.department || undefined,
          accessRole: form.accessRole,
        }),
      });
      setForm(EMPTY_FORM);
      onOpenChange(false);
      onCreated(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kaira Africa could not create this invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <p className="text-sm text-muted-foreground">
            The invitation is linked to the Gambian phone number below. The person must verify that number before joining your business.
          </p>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-first-name">First name</Label>
              <Input id="invite-first-name" autoComplete="given-name" required maxLength={80} value={form.firstName}
                onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-last-name">Last name</Label>
              <Input id="invite-last-name" autoComplete="family-name" required maxLength={80} value={form.lastName}
                onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email address (optional)</Label>
            <Input id="invite-email" type="email" autoComplete="email" maxLength={254} value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" />
            <p className="text-xs text-muted-foreground">Optional. When provided, Kaira emails the invitation link if SMTP delivery is available. You can always share it on WhatsApp.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-phone">Gambian WhatsApp / mobile number</Label>
            <Input id="invite-phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+220 87 123 4567" />
            <p className="text-xs text-muted-foreground">Accepted networks: Africell 87, QCell 83, Comium 86, and Gamtel 9.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-job-title">Job title</Label>
              <Input id="invite-job-title" required maxLength={80} value={form.jobTitle}
                onChange={(event) => setForm({ ...form, jobTitle: event.target.value })}
                placeholder="e.g. Sales Assistant" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-department">Department (optional)</Label>
              <Input id="invite-department" maxLength={80} value={form.department}
                onChange={(event) => setForm({ ...form, department: event.target.value })}
                placeholder="e.g. Sales" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label> Kaira access level </Label>
            <Select value={form.accessRole} onValueChange={(value: "manager" | "staff") => setForm({ ...form, accessRole: value })}>
              <SelectTrigger><SelectValue placeholder="Choose access level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff — everyday team access</SelectItem>
                <SelectItem value="manager">Manager — expanded workspace access</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Owner and administrator access cannot be granted through an invitation.</p>
          </div>
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating invitation…" : "Create invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const { data: me } = useGetMe();
  const canManageTeam = me?.role === "owner" || me?.role === "admin";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareInvite, setShareInvite] = useState<CreatedInvite | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (statusFilter !== "all") query.set("status", statusFilter);
      const memberUrl = "/team" + (query.toString() ? "?" + query.toString() : "");
      const [teamRows, inviteRows] = await Promise.all([
        apiRequestJson<TeamMemberRow[]>(memberUrl),
        canManageTeam ? apiRequestJson<InvitationRow[]>("/team/invitations") : Promise.resolve([] as InvitationRow[]),
      ]);
      setMembers(teamRows);
      setInvitations(inviteRows);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Team information could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, canManageTeam]);

  useEffect(() => { void refresh(); }, [refresh]);

  const activeCount = members.filter((member) => member.status === "active").length;
  const pendingCount = invitations.filter((invite) => invite.status === "pending" || invite.status === "expired").length;

  const handleCreated = (invite: CreatedInvite) => {
    setShareInvite(invite);
    void refresh();
    feedback("success", "Invitation created", invite.emailDeliveryStatus === "sent"
      ? "The invitation email was sent. You can also share the secure link on WhatsApp."
      : "The secure invitation is ready. Email was not sent or could not be confirmed; share the link on WhatsApp.");
  };

  const copyInvite = async () => {
    if (!shareInvite) return;
    try {
      await navigator.clipboard.writeText(shareInvite.inviteUrl);
      feedback("success", "Invitation link copied", "Paste the secure link into WhatsApp or another message.");
    } catch {
      feedback("error", "Could not copy the link", "Your browser blocked clipboard access. Use the WhatsApp share option instead.");
    }
  };

  const resendInvite = async (invite: InvitationRow) => {
    setActionError(null);
    try {
      const result = await apiRequestJson<CreatedInvite>("/team/invitations/" + invite.id + "/resend", { method: "POST" });
      setShareInvite(result);
      await refresh();
      feedback("success", "Invitation link refreshed", "The previous link has been invalidated. Share this new link with the invitee.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "The invitation could not be resent.");
    }
  };

  const revokeInvite = async (invite: InvitationRow) => {
    if (!window.confirm("Revoke the invitation for " + invite.firstName + " " + invite.lastName + "? The current link will stop working.")) return;
    setActionError(null);
    try {
      await apiRequestJson<void>("/team/invitations/" + invite.id, { method: "DELETE" });
      await refresh();
      feedback("success", "Invitation revoked", "The invitation link can no longer be used.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "The invitation could not be revoked.");
    }
  };

  const removeMember = async (member: TeamMemberRow) => {
    if (!window.confirm("Remove " + member.firstName + " " + member.lastName + " from this team?")) return;
    try {
      await apiRequestJson<void>("/team/" + member.id, { method: "DELETE" });
      await refresh();
      feedback("success", "Team member removed", member.firstName + " " + member.lastName + " was removed from the roster.");
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "The team member could not be removed.");
    }
  };

  return (
    <PageTransition>
      <div className="min-w-0 space-y-6">
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-cyan-500/10 p-5 sm:p-6">
          <div className="absolute -right-6 -top-10 h-36 w-36 rounded-full bg-cyan-500/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground sm:h-14 sm:w-14"><Users className="h-6 w-6 sm:h-7 sm:w-7" /></div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold sm:text-3xl">Team Members</h1>
                <p className="mt-1 text-sm text-muted-foreground">Invite people, manage access, and see who has joined.</p>
              </div>
            </div>
            {canManageTeam && <Button className="w-full shrink-0 sm:w-auto" onClick={() => setInviteOpen(true)}><Plus className="mr-2 h-4 w-4" />Invite Member</Button>}
          </div>
        </div>

        {canManageTeam && <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} onCreated={handleCreated} />}

        {shareInvite && (
          <Card className="border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-5 w-5 text-primary" />Secure invitation ready</CardTitle>
              <p className="text-sm text-muted-foreground">For {shareInvite.inviteeFirstName} · {shareInvite.jobTitle} · {shareInvite.accessRole}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="break-all rounded-lg bg-muted p-3 text-xs">{shareInvite.inviteUrl}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full sm:w-auto" onClick={copyInvite}><Copy className="mr-2 h-4 w-4" />Copy link</Button>
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => window.open(whatsappUrl(shareInvite), "_blank", "noopener,noreferrer")}><MessageCircle className="mr-2 h-4 w-4" />Share on WhatsApp</Button>
                <Button variant="ghost" className="w-full sm:ml-auto sm:w-auto" onClick={() => setShareInvite(null)}>Close</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {shareInvite.emailDeliveryStatus === "sent"
                  ? "Email delivery confirmed. WhatsApp sharing is optional."
                  : "Email delivery was not confirmed. Share this link manually; automatic WhatsApp sending requires a configured WhatsApp Business sender."}
                {" "}Expires {new Date(shareInvite.expiresAt).toLocaleString()}.
              </p>
            </CardContent>
          </Card>
        )}

        {actionError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{actionError}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle></CardHeader><CardContent><div className="font-display text-2xl font-bold">{members.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader><CardContent><div className="font-display text-2xl font-bold text-primary">{activeCount}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending / Expired Invitations</CardTitle></CardHeader><CardContent><div className="font-display text-2xl font-bold text-secondary">{pendingCount}</div></CardContent></Card>
        </div>

        {canManageTeam && (
          <Card>
            <CardHeader><CardTitle className="text-base">Invitations</CardTitle><p className="text-sm text-muted-foreground">Resend rotates the token and invalidates the previous link. Revoking stops acceptance immediately.</p></CardHeader>
            <CardContent className="space-y-3">
              {invitations.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No invitations have been created yet.</p>
              ) : invitations.map((invite) => (
                <div key={invite.id} className="flex min-w-0 flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{invite.firstName} {invite.lastName}</p>
                    <p className="break-all text-sm text-muted-foreground">{invite.email || "No email provided"} {invite.phone ? "· " + invite.phone : ""}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{invite.jobTitle} · {invite.accessRole} · {invite.department || "No department"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {invite.status === "pending" ? "Expires " : invite.status === "expired" ? "Expired " : invite.status === "accepted" ? "Accepted " : "Revoked "}
                      {new Date(
                        invite.status === "accepted"
                          ? (invite.acceptedAt ?? invite.lastSentAt)
                          : invite.status === "revoked"
                            ? (invite.revokedAt ?? invite.lastSentAt)
                            : invite.expiresAt
                      ).toLocaleString()}
                      {" · Email: "}{invite.emailDeliveryStatus.replace("_", " ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {(invite.status === "pending" || invite.status === "expired") && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => void resendInvite(invite)}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Resend</Button>
                        <Button size="sm" variant="ghost" aria-label={"Revoke invitation for " + invite.firstName} onClick={() => void revokeInvite(invite)}><Ban className="h-4 w-4" /></Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Team roster</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search team members..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[190px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {loading ? (
              <div className="space-y-3 py-3" aria-label="Loading team members">
                {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : members.length ? (
              <div className="divide-y">
                {members.map((member, index) => (
                  <motion.div key={member.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }}
                    className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-11 w-11 shrink-0 bg-primary"><AvatarFallback className="bg-primary text-primary-foreground">{getInitials(member.firstName, member.lastName)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold">{member.firstName} {member.lastName}</p>
                        <p className="break-all text-sm text-muted-foreground">{member.email || "No email address"}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{member.role} · {member.department || "No department"} · Access: {member.accessRole}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:ml-auto">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={member.status as any} />
                        <span className="hidden text-xs text-muted-foreground lg:inline">{member.lastActiveAt ? formatRelativeTime(member.lastActiveAt) : "Never active"}</span>
                      </div>
                      {canManageTeam && <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" aria-label={"Remove " + member.firstName} onClick={() => void removeMember(member)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Users} title="No team members found" description="Invite someone to your team or adjust the search filters." />
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
