import { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { toast } from '@/hooks/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect, useLocation } from 'wouter';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ApiError } from '@workspace/api-client-react';
import { initApiClient, getToken, clearToken, isUserToken, isAdminToken } from '@/lib/api-client';

initApiClient();

// ─── Lazy-loaded pages ──────────────────────────────────────────────────────
const SplashScreen       = lazy(() => import('@/pages/SplashScreen'));
const OnboardingFlow     = lazy(() => import('@/pages/OnboardingFlow'));

// Auth
const PhoneAuthPage      = lazy(() => import('@/pages/auth/PhoneAuthPage'));
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
const LegalPage          = lazy(() => import('@/pages/LegalPage'));

const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage'));
const AdminCrmPage       = lazy(() => import('@/pages/admin/AdminCrmPage'));
const AdminInventoryPage = lazy(() => import('@/pages/admin/AdminInventoryPage'));

// Admin
const AdminLoginPage     = lazy(() => import('@/pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));

// 404
const NotFoundPage       = lazy(() => import('@/pages/not-found'));

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

function handleQueryError(error: unknown) {
  if (handleUnauthorized(error)) return;

  // Queries (background data fetching) rarely have dedicated inline
  // error UI in this app's page designs — a toast is the "no silent
  // failures" mechanism for them. Mutations are handled separately
  // (see mutationCache below): most already show a contextual inline
  // error near the form that triggered them, so they only get the
  // 401 handling here to avoid redundant/duplicate toasts.
  const message = error instanceof ApiError ? error.message : 'Please check your connection and try again.';
  toast({ title: 'Something went wrong', description: message, variant: 'destructive' });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
  queryCache: new QueryCache({ onError: handleQueryError }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
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
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
