import { lazy, Suspense } from "react";
import { Redirect, Route, Switch } from "wouter";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AdminPortalLayout } from "@/components/layout/AdminPortalLayout";
import { isAdminToken } from "@/lib/api-client";

const AdminLoginPage = lazy(() => import("@/pages/admin/AdminLoginPage"));
const AdminPortalOverviewPage = lazy(() => import("@/pages/admin/AdminPortalOverviewPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminCrmPage = lazy(() => import("@/pages/admin/AdminCrmPage"));
const AdminInventoryPage = lazy(() => import("@/pages/admin/AdminInventoryPage"));
const AdminDailyLedgerPage = lazy(() => import("@/pages/admin/AdminDailyLedgerPage"));
const AdminPlatformRecordsPage = lazy(() => import("@/pages/admin/AdminPlatformRecordsPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));

function AdminPortalEntry() {
  return isAdminToken()
    ? <Redirect to="/admin/dashboard" />
    : <AdminLoginPage />;
}

function AdminPortalRoot() {
  return <Redirect to={isAdminToken() ? "/admin/dashboard" : "/admin"} />;
}

function ProtectedAdminPage({ component: Component }: { component: React.ComponentType }) {
  if (!isAdminToken()) return <Redirect to="/admin" />;
  return (
    <AdminPortalLayout>
      <Component />
    </AdminPortalLayout>
  );
}

function PageFallback() {
  return (
    <div className="flex min-h-[45vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export default function AdminPortalRouter() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={AdminPortalRoot} />
        <Route path="/admin" component={AdminPortalEntry} />
        <Route path="/admin/forgot-password" component={ForgotPasswordPage} />
        <Route path="/admin/reset-password" component={ResetPasswordPage} />
        <Route path="/admin/dashboard">
          {() => <ProtectedAdminPage component={AdminPortalOverviewPage} />}
        </Route>
        <Route path="/admin/records">
          {() => <ProtectedAdminPage component={AdminPlatformRecordsPage} />}
        </Route>
        <Route path="/admin/analytics">
          {() => <ProtectedAdminPage component={AdminAnalyticsPage} />}
        </Route>
        <Route path="/admin/crm">
          {() => <ProtectedAdminPage component={AdminCrmPage} />}
        </Route>
        <Route path="/admin/inventory">
          {() => <ProtectedAdminPage component={AdminInventoryPage} />}
        </Route>
        <Route path="/admin/daily-ledger">
          {() => <ProtectedAdminPage component={AdminDailyLedgerPage} />}
        </Route>
        <Route component={() => <Redirect to="/admin" />} />
      </Switch>
    </Suspense>
  );
}
