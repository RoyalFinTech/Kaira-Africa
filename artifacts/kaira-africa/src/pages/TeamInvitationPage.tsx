import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Clock3, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequestJson, clearToken, isPinUnlocked, isUserToken } from "@/lib/api-client";
import { KairaLogo } from "@/components/common/KairaLogo";

const PENDING_INVITATION_KEY = "kaira_pending_invitation_token";

interface InvitationPreview {
  status: "pending" | "accepted" | "revoked" | "expired";
  firstName: string;
  lastName: string;
  businessName: string;
  jobTitle: string;
  department?: string | null;
  accessRole: "manager" | "staff";
  phone: string;
  expiresAt: string;
}

interface InvitationAcceptResult {
  teamMemberId: string;
  businessName: string;
  firstName: string;
  lastName: string;
  accessRole: "manager" | "staff";
}

function notifySuccess(result: InvitationAcceptResult) {
  window.dispatchEvent(new CustomEvent("kaira:feedback", {
    detail: {
      variant: "success",
      title: "Welcome to " + result.businessName,
      message: "Your invitation was accepted. Your Kaira Africa team workspace is ready.",
    },
  }));
}

function InvitationStatus({ status }: { status: InvitationPreview["status"] }) {
  const details = {
    accepted: "This invitation has already been accepted.",
    revoked: "The business owner or administrator revoked this invitation.",
    expired: "This invitation has expired. Ask the inviter to resend it.",
    pending: "This invitation is ready for secure acceptance.",
  };
  return <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{details[status]}</p>;
}

export default function TeamInvitationPage() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPreview(null);
    if (!token) {
      setError("This invitation link is missing its secure token. Ask the inviter to share a fresh link.");
      setLoading(false);
      return () => { active = false; };
    }
    apiRequestJson<InvitationPreview>("/team/invitations/preview", {
      method: "POST",
      body: JSON.stringify({ token }),
    }).then((result) => {
      if (active) setPreview(result);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "This invitation link could not be verified.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [token]);

  const accept = async () => {
    if (!preview || preview.status !== "pending") return;
    if (!isUserToken() || !isPinUnlocked()) {
      sessionStorage.setItem(PENDING_INVITATION_KEY, token);
      setLocation("/login?invitation=1");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await apiRequestJson<InvitationAcceptResult>("/team/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      sessionStorage.removeItem(PENDING_INVITATION_KEY);
      notifySuccess(result);
      setLocation("/dashboard");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The invitation could not be accepted.";
      if (message.includes("Sign in with the Gambian phone number this invitation was sent to.")) {
        clearToken();
        setLocation("/login?recovery=1");
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f7f4] px-3 py-8 sm:px-6">
      <Card className="w-full max-w-lg overflow-hidden border-[#e0e9e2] shadow-xl">
        <CardHeader className="space-y-4 bg-[#0D2818] p-6 text-white sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex max-w-[min(72%,190px)] items-center rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-white/30">
              <KairaLogo width={150} height={44} className="max-w-full" />
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#D8B45A]" aria-hidden="true">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D8B45A]">Kaira Africa · Team invitation</p>
            <CardTitle className="mt-2 text-2xl font-bold text-white">You have been invited</CardTitle>
            <p className="mt-1 text-sm text-white/75">Join a business workspace and work with your team.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5 sm:p-8">
          {loading ? (
            <div className="space-y-3" aria-label="Checking invitation">
              <div className="h-5 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
            </div>
          ) : error && !preview ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>
          ) : preview ? (
            <>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Hello,</p>
                <h1 className="text-xl font-bold">{preview.firstName} {preview.lastName}</h1>
                <p className="text-sm text-muted-foreground">You are invited to join</p>
                <p className="text-lg font-semibold text-primary">{preview.businessName}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">Job title</p><p className="mt-1 font-semibold">{preview.jobTitle}</p></div>
                <div><p className="text-xs text-muted-foreground">Kaira access</p><p className="mt-1 font-semibold capitalize">{preview.accessRole}</p></div>
                <div><p className="text-xs text-muted-foreground">Department</p><p className="mt-1 font-semibold">{preview.department || "Not specified"}</p></div>
                <div><p className="text-xs text-muted-foreground">Invited phone</p><p className="mt-1 font-semibold">{preview.phone}</p></div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>For your security, sign in using the Gambian phone number this invitation was sent to. Kaira verifies that number before adding you to the business.</p>
              </div>
              {preview.status === "pending" && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4" />Invitation expires {new Date(preview.expiresAt).toLocaleString()}.</p>
              )}
              <InvitationStatus status={preview.status} />
              {preview.status === "pending" && (
                <Button className="w-full" disabled={busy} onClick={() => void accept()}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {busy ? "Accepting invitation…" : isUserToken() && isPinUnlocked() ? "Accept invitation" : "Sign in securely to accept"}
                </Button>
              )}
            </>
          ) : null}
          {error && preview && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          <Button variant="ghost" className="w-full" onClick={() => setLocation("/login")}>Back to Kaira Africa</Button>
        </CardContent>
      </Card>
    </main>
  );
}

export function TeamInvitationAcceptPage() {
  const [, setLocation] = useLocation();
  const started = useRef(false);
  const [message, setMessage] = useState("Checking your secure sign-in…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = sessionStorage.getItem(PENDING_INVITATION_KEY);
    if (!token) {
      setMessage("Your invitation session could not be found. Open the invitation link again.");
      return;
    }
    if (!isUserToken() || !isPinUnlocked()) {
      setLocation("/login?invitation=1");
      return;
    }
    apiRequestJson<InvitationAcceptResult>("/team/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    }).then((result) => {
      sessionStorage.removeItem(PENDING_INVITATION_KEY);
      notifySuccess(result);
      setLocation("/dashboard");
    }).catch((cause) => {
      const errorMessage = cause instanceof Error ? cause.message : "The invitation could not be accepted."; 
      if (errorMessage.includes("Sign in with the Gambian phone number this invitation was sent to.")) {
        clearToken();
        setLocation("/login?recovery=1");
        return;
      }
      setError(errorMessage);
      setMessage("Kaira Africa could not complete the invitation.");
    });
  }, [setLocation]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f7f4] px-3 py-8">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Joining your team</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          <Button className="w-full" variant="outline" onClick={() => setLocation("/login")}>Return to sign in</Button>
        </CardContent>
      </Card>
    </main>
  );
}
