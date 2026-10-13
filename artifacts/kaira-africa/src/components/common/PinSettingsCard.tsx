import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequestJson } from "@/lib/api-client";

const weakPatterns = new Set([
  "012345", "123456", "234567", "345678", "456789",
  "987654", "876543", "765432", "654321", "543210",
]);

function isStrongPin(pin: string) {
  return /^\d{6}$/.test(pin) && !/^(\d)\1{5}$/.test(pin) && !weakPatterns.has(pin);
}

export function PinSettingsCard() {
  const queryClient = useQueryClient();
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const status = useQuery({
    queryKey: ["auth", "pin-status"],
    queryFn: () => apiRequestJson<{ enabled: boolean }>("/auth/pin-status"),
    retry: 1,
  });

  const savePin = useMutation({
    mutationFn: () =>
      apiRequestJson<void>("/auth/set-pin", {
        method: "POST",
        body: JSON.stringify({
          pin,
          ...(status.data?.enabled ? { currentPin } : {}),
        }),
      }),
    onSuccess: async () => {
      setCurrentPin("");
      setPin("");
      setConfirmation("");
      setError(null);
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["auth", "pin-status"] });
    },
    onError: (cause) => {
      setSaved(false);
      setError(cause instanceof Error ? cause.message : "We couldn't save your PIN. Please try again.");
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    setError(null);
    if (!isStrongPin(pin)) {
      setError("Use six digits. Avoid repeated digits or simple sequences such as 123456.");
      return;
    }
    if (status.data?.enabled && !/^[0-9]{6}$/.test(currentPin)) {
      setError("Enter your current six-digit PIN before changing it.");
      return;
    }
    if (pin !== confirmation) {
      setError("The two PIN entries do not match.");
      return;
    }
    savePin.mutate();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-primary" />
          PIN sign-in
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Set or update a six-digit PIN so you can return to Kaira Africa without repeating the full SMS registration flow.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {status.isLoading
                ? "Checking your PIN settings…"
                : status.data?.enabled
                  ? "PIN sign-in is enabled"
                  : "Protect your account with a PIN"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Your PIN is securely hashed on the server and is never stored in your browser. Keep your phone and PIN private.
            </p>
            {status.isError && (
              <button
                type="button"
                onClick={() => void status.refetch()}
                className="mt-1 text-xs font-semibold text-primary underline underline-offset-2"
              >
                Retry status check
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {status.data?.enabled && (
              <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                Current six-digit PIN
                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  minLength={6}
                  required
                  value={currentPin}
                  onChange={(event) => setCurrentPin(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="••••••"
                  aria-label="Current six-digit PIN"
                  className="h-11 tracking-[0.35em]"
                />
              </label>
            )}
            <label className="space-y-1.5 text-sm font-medium">
              New six-digit PIN
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]{6}"
                maxLength={6}
                minLength={6}
                required
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                aria-label="New six-digit PIN"
                className="h-11 tracking-[0.35em]"
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Confirm PIN
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                pattern="[0-9]{6}"
                maxLength={6}
                minLength={6}
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                aria-label="Confirm six-digit PIN"
                className="h-11 tracking-[0.35em]"
              />
            </label>
          </div>

          {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          {saved && <p role="status" className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">Your PIN was saved successfully.</p>}

          <Button type="submit" disabled={savePin.isPending || status.isLoading || status.isError} className="w-full sm:w-auto">
            {savePin.isPending ? "Saving PIN…" : status.data?.enabled ? "Update PIN" : "Set my PIN"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
