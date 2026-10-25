import { Suspense, lazy, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect, useLocation } from 'wouter';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { KairaFeedbackCard } from '@/components/common/KairaFeedbackCard';
import { ApiError } from '@workspace/api-client-react';
import { initApiClient, getToken, clearToken, isUserToken, isAdminToken } from '@/lib/api-client';

initApiClient();

// ─── Lazy-loaded pages ──────────────────────────────────────────────────────
const SplashScreen       = lazy(() => import('@/pages/SplashScreen'));
const OnboardingFlow     = lazy(() => import('@/pages/OnboardingFlow'));

// Auth
const PhoneAuthPage      = lazy(() => import('@/pages/auth/PhoneAuthPage'));
const PinLoginPage       = lazy(() => import('@/pages/auth/PinLoginPage'));
const OTPPage            = lazy(() => import('@/pages/auth/OTPPage'));
const FullNamePage       = lazy(() => import('@/pages/auth/FullNamePage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'));

// Business onboarding
const BusinessOnboardingFlow = lazy(() => import('@/pages/BusinessOnboardingFlow'));

// App pages
const DashboardPage      = lazy(() => import('@/pages/app/DashboardPage'));
const TeamPage           = lazy(() => import('@/pages/app/TeamPage'));
const CustomersPage      = lazy(() => import('@/pages/app/CustomersPage'));
const CustomerDetailPage = lazy(() => import('@/pages/app/CustomerDetailPage'));
const TransactionsPage   = lazy(() => import('@/pages/app/TransactionsPage'));
const AnalyticsPage      = lazy(() => import('@/pages/app/AnalyticsPage'));
const ReportsPage        = lazy(() => import('@/pages/app/ReportsPage'));
const ActivityPage       = lazy(() => import('@/pages/app/ActivityPage'));
const NotificationsPage  = lazy(() => import('@/pages/app/NotificationsPage'));
const ProfilePage        = lazy(() => import('@/pages/app/ProfilePage'));
const SettingsPage       = lazy(() => import('@/pages/app/SettingsPage'));
const CrmPage            = lazy(() => import('@/pages/app/CrmPage'));
const InventoryPage      = lazy(() => import('@/pages/app/InventoryPage'));
const AiReportsPage      = lazy(() => import('@/pages/app/AiReportsPage'));
const DailyLedgerPage    = lazy(() => import('@/pages/app/DailyLedgerPage'));
const InvestmentPlannerPage = lazy(() => import('@/pages/app/InvestmentPlannerPage'));
const SavingsPage = lazy(() => import('@/pages/app/SavingsPage'));
const ReceiptBrandingPage = lazy(() => import('@/pages/app/ReceiptBrandingPage'));
const LegalPage          = lazy(() => import('@/pages/LegalPage'));

const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminCrmPage       = lazy(() => import('@/pages/admin/AdminCrmPage'));
const AdminInventoryPage = lazy(() => import('@/pages/admin/AdminInventoryPage'));
const AdminDailyLedgerPage = lazy(() => import('@/pages/admin/AdminDailyLedgerPage'));
const AdminPlatformRecordsPage = lazy(() => import('@/pages/admin/AdminPlatformRecordsPage'));

// Admin
const AdminLoginPage     = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));

// 404
const NotFoundPage       = lazy(() => import('@/pages/not-found'));


type KairaFeedbackDetail = {
  variant: 'success' | 'error' | 'info';
  title: string;
  message: string;
};

/** Extract a readable message from API/client errors without exposing [object Object] or raw JSON. */
function readableFeedbackMessage(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;

  if (typeof value === 'string') {
    const candidate = value.trim();
    if (!candidate || /^\[object object\]$/i.test(candidate) ||
        candidate.startsWith('<!DOCTYPE') || candidate.startsWith('<html')) return null;

    if (candidate.startsWith('{') || candidate.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(candidate);
        const parsedMessage = readableFeedbackMessage(parsed, depth + 1);
        if (parsedMessage) return parsedMessage;
      } catch {
        // Preserve a normal, non-JSON sentence; discard object-like serialization below.
      }
      if (/^[{[]/.test(candidate)) return null;
    }
    return candidate.slice(0, 500);
  }

  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const messages = value
      .map((item) => readableFeedbackMessage(item, depth + 1))
      .filter((item): item is string => Boolean(item));
    return messages.length ? messages.slice(0, 5).join(' · ').slice(0, 500) : null;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['message', 'error_description', 'detail', 'details', 'error', 'title', 'issues', 'errors', 'body', 'data', 'cause', 'response']) {
      const message = readableFeedbackMessage(record[key], depth + 1);
      if (message && !/^error$/i.test(message)) return message;
    }
  }
  return null;
}

function KairaFeedbackHost() {
  const [feedback, setFeedback] = useState<KairaFeedbackDetail | null>(null);

  useEffect(() => {
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;
    const onFeedback = (event: Event) => {
      const detail = (event as CustomEvent<KairaFeedbackDetail>).detail;
      if (!detail || !['success', 'error', 'info'].includes(detail.variant) ||
          typeof detail.title !== 'string' || typeof detail.message !== 'string') return;
      const message = readableFeedbackMessage(detail.message) ||
        (detail.variant === 'error'
          ? 'Kaira Africa received an unreadable error response. Please try again.'
          : 'Kaira Africa completed the action, but there was no readable response detail.');
      setFeedback({ ...detail, message });
      if (dismissTimer) clearTimeout(dismissTimer);
      // Feedback cards should never remain over controls and block the app.
      // Users can dismiss earlier; longer errors remain visible briefly.
      dismissTimer = setTimeout(() => setFeedback(null), detail.variant === 'error' ? 9000 : 6000);
    };
    window.addEventListener('kaira:feedback', onFeedback);
    return () => {
      window.removeEventListener('kaira:feedback', onFeedback);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, []);

  if (!feedback) return null;
  return (
    <div className="fixed right-4 top-4 z-[200] w-[min(92vw,30rem)]" data-testid="kaira-global-feedback">
      <KairaFeedbackCard
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
        onDismiss={() => setFeedback(null)}
      />
    </div>
  );
}

// ─── Auth helpers ────────────────────────────────────────────────────────────
export function isAuthenticated(): boolean {
  return isUserToken();
}

export function isAdminAuthenticated(): boolean {
  return isAdminToken();
}

// ─── Protected route wrapper ─────────────────────────────────────────────────
function ProtectedRoute({ component: Component, redirectTo = '/login' }: {
  component: React.ComponentType;
  redirectTo?: string;
}) {
  if (!isAuthenticated()) return <Redirect to={redirectTo} />;
  return (
    <AppShell>
      <Component />
    </AppShell>
  );
}

function AdminProtectedRoute({ component: Component }: {
  component: React.ComponentType;
}) {
  if (!isAdminAuthenticated()) return <Redirect to="/admin" />;
  return <Component />;
}

// Onboarding is entered through the splash on a fresh visit. If someone
// refreshes or opens /onboarding directly, send them back to the splash.
function SplashGatedOnboarding() {
  const passedSplash = sessionStorage.getItem('kaira_splash_complete') === '1';
  if (!passedSplash) return <Redirect to="/" />;
  sessionStorage.removeItem('kaira_splash_complete');
  return <OnboardingFlow />;
}

// ─── Router ──────────────────────────────────────────────────────────────────
function isPinLoginRequired(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { status?: unknown; message?: unknown; data?: unknown };
  const data = record.data && typeof record.data === "object"
    ? record.data as Record<string, unknown>
    : null;
  const nestedError = data?.error && typeof data.error === "object"
    ? data.error as Record<string, unknown>
    : null;
  const code = nestedError?.code ?? data?.code;
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
  return code === "pin_login_required" ||
    (record.status === 409 && message.includes("pin sign-in enabled"));
}

function handleUnauthorized(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 401) {
    // Session expired or invalid — clear it and send the person to
    // whichever login screen matches the token they had (if any),
    // defaulting to the phone login. A hard redirect (not wouter's
    // navigate) is deliberate here: this can fire from deep inside a
    // query/mutation far from any router context, and a full reload
    // also guarantees every in-memory bit of stale state (React
    // Query cache included) is gone, not just the route.
    const wasAdmin = getToken()?.startsWith('adm_');
    clearToken();
    const target = wasAdmin ? '/admin' : '/login';
    if (window.location.pathname !== target) {
      window.location.assign(target);
    }
    return true;
  }
  return false;
}

function showKairaApiError(error: unknown, title = "Kaira Africa couldn't complete that request") {
  const message = readableFeedbackMessage(error) ||
    'Kaira Africa could not complete this request. Please check your connection and try again.';
  window.dispatchEvent(new CustomEvent('kaira:feedback', {
    detail: { variant: 'error', title, message },
  }));
}

function handleQueryError(error: unknown) {
  if (handleUnauthorized(error)) return;
  showKairaApiError(error);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
  queryCache: new QueryCache({ onError: handleQueryError }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // A PIN-required response is a normal returning-user branch. The phone
      // page will route directly to PIN sign-in; do not display a failure alert.
      if (isPinLoginRequired(error)) return;
      if (!handleUnauthorized(error)) showKairaApiError(error);
    },
  }),
});

const PageLoader = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-background">
    <LoadingSpinner size={32} />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* ── Splash + Onboarding ── */}
        <Route path="/" component={SplashScreen} />
        <Route path="/onboarding" component={SplashGatedOnboarding} />

        {/* ── User Auth (Phone + OTP) ── */}
        <Route path="/login" component={PhoneAuthPage} />
        <Route path="/login/pin" component={PinLoginPage} />
        <Route path="/login/otp" component={OTPPage} />
        <Route path="/login/name" component={FullNamePage} />
        <Route path="/admin/forgot-password" component={ForgotPasswordPage} />
        <Route path="/admin/reset-password" component={ResetPasswordPage} />

        {/* ── Business Onboarding ── */}
        <Route path="/business-onboarding">
          {() => isAuthenticated()
            ? <BusinessOnboardingFlow />
            : <Redirect to="/login" />}
        </Route>

        {/* ── Protected App Routes ── */}
        <Route path="/dashboard">
          {() => <ProtectedRoute component={DashboardPage} />}
        </Route>
        <Route path="/team">
          {() => <ProtectedRoute component={TeamPage} />}
        </Route>
        <Route path="/customers/:id">
          {() => <ProtectedRoute component={CustomerDetailPage} />}
        </Route>
        <Route path="/customers">
          {() => <ProtectedRoute component={CustomersPage} />}
        </Route>
        <Route path="/transactions">
          {() => <ProtectedRoute component={TransactionsPage} />}
        </Route>
        <Route path="/analytics">
          {() => <ProtectedRoute component={AnalyticsPage} />}
        </Route>
        <Route path="/reports">
          {() => <ProtectedRoute component={ReportsPage} />}
        </Route>
        <Route path="/activity">
          {() => <ProtectedRoute component={ActivityPage} />}
        </Route>
        <Route path="/notifications">
          {() => <ProtectedRoute component={NotificationsPage} />}
        </Route>
        <Route path="/profile">
          {() => <ProtectedRoute component={ProfilePage} />}
        </Route>
        <Route path="/settings">
          {() => <ProtectedRoute component={SettingsPage} />}
        </Route>
        <Route path="/crm">
          {() => <ProtectedRoute component={CrmPage} />}
        </Route>
        <Route path="/inventory">
          {() => <ProtectedRoute component={InventoryPage} />}
        </Route>
        <Route path="/ai-reports">
          {() => <ProtectedRoute component={AiReportsPage} />}
        </Route>
        <Route path="/daily-ledger">
          {() => <ProtectedRoute component={DailyLedgerPage} />}
        </Route>
        <Route path="/investments">
          {() => <ProtectedRoute component={InvestmentPlannerPage} />}
        </Route>
        <Route path="/receipt-branding">
          {() => <ProtectedRoute component={ReceiptBrandingPage} />}
        </Route>
        <Route path="/legal/terms">
          {() => <LegalPage type="terms" />}
        </Route>
        <Route path="/legal/privacy">
          {() => <LegalPage type="privacy" />}
        </Route>

        {/* ── Admin Routes ── */}
        <Route path="/admin" component={AdminLoginPage} />
        <Route path="/admin/dashboard">
          {() => <AdminProtectedRoute component={AdminDashboardPage} />}
        </Route>
        <Route path="/admin/analytics">
          {() => <AdminProtectedRoute component={AdminAnalyticsPage} />}
        </Route>
        <Route path="/admin/crm">
          {() => <AdminProtectedRoute component={AdminCrmPage} />}
        </Route>
        <Route path="/admin/inventory">
          {() => <AdminProtectedRoute component={AdminInventoryPage} />}
        </Route>
        <Route path="/admin/daily-ledger">
          {() => <AdminProtectedRoute component={AdminDailyLedgerPage} />}
        </Route>
        <Route path="/admin/records">
          {() => <AdminProtectedRoute component={AdminPlatformRecordsPage} />}
        </Route>

        {/* ── 404 ── */}
        <Route component={NotFoundPage} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <KairaFeedbackHost />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
