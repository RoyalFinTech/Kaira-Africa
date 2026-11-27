import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  TrendingUp,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { KairaLogo } from "@/components/common/KairaLogo";
import { clearAdminInfo, clearToken, getAdminInfo, isAdminToken } from "@/lib/api-client";
import { getInitials } from "@/lib/utils";

const CUSTOMER_APP_URL = "https://kaira-africa-frontend.onrender.com";

const navItems = [
  { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Platform records", href: "/admin/records", icon: Users },
  { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
  { label: "CRM & customers", href: "/admin/crm", icon: UserRound },
  { label: "Inventory", href: "/admin/inventory", icon: Building2 },
  { label: "Daily ledger", href: "/admin/daily-ledger", icon: BookOpen },
];

function AdminNav({
  currentPath,
  onNavigate,
}: {
  currentPath: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Admin portal navigation" className="space-y-1">
      {navItems.map((item) => {
        const active =
          currentPath === item.href ||
          (item.href !== "/admin/dashboard" && currentPath.startsWith(item.href + "/"));
        const Icon = item.icon;
        return (
          <Link href={item.href} key={item.href}>
            <a
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={[
                "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                active
                  ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200 shadow-inner shadow-emerald-950/10"
                  : "text-slate-300 hover:bg-white/[0.07] hover:text-white",
              ].join(" ")}
            >
              <Icon className={["h-[18px] w-[18px] shrink-0", active ? "text-amber-300" : "text-slate-400 group-hover:text-slate-200"].join(" ")} />
              <span className="min-w-0 flex-1">{item.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden="true" />}
            </a>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContents({
  currentPath,
  onNavigate,
  onLogout,
  loggingOut,
}: {
  currentPath: string;
  onNavigate?: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const admin = getAdminInfo();
  const initials = admin ? getInitials(admin.firstName, admin.lastName) : "KA";
  const adminName = admin ? [admin.firstName, admin.lastName].filter(Boolean).join(" ") : "Administrator";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-5 pb-5 pt-6">
        <div className="inline-flex rounded-xl bg-white px-3 py-2 shadow-lg shadow-black/10">
          <KairaLogo width={126} />
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-3 py-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-amber-300" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-200">Admin control centre</span>
        </div>
      </div>

      <div className="mx-4 border-t border-white/10" />
      <div className="px-4 pb-3 pt-4">
        <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
        <AdminNav currentPath={currentPath} onNavigate={onNavigate} />
      </div>

      <div className="mt-auto px-4 pb-5 pt-4">
        <a
          href={CUSTOMER_APP_URL}
          target="_blank"
          rel="noreferrer"
          className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs text-slate-300 transition hover:border-emerald-300/30 hover:bg-white/[0.08] hover:text-white"
        >
          <span className="flex items-center gap-2"><ExternalLink className="h-3.5 w-3.5 text-emerald-300" /> Open customer app</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
        </a>

        <div className="mb-3 flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-amber-300/20">
            <AvatarFallback className="bg-amber-300 text-xs font-bold text-slate-950">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{adminName}</p>
            <p className="truncate text-[11px] text-slate-400">{admin?.email ?? "Secure administrator session"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={onLogout}
          disabled={loggingOut}
          className="h-10 w-full justify-start gap-3 rounded-xl px-3 text-sm text-slate-300 hover:bg-rose-400/10 hover:text-rose-200"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </div>
  );
}

export function AdminPortalLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const logout = useLogout();
  const activeItem = navItems.find((item) => location === item.href) ?? navItems[0];

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    setLogoutPending(true);
    logout.mutate(undefined, {
      onSettled: () => {
        clearToken();
        clearAdminInfo();
        setLogoutPending(false);
        setLocation("/admin");
      },
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#f4f7f6] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r border-slate-800/70 bg-[linear-gradient(165deg,#0d1b2a_0%,#102b2b_52%,#102133_100%)] shadow-2xl shadow-slate-950/10 lg:block">
        <SidebarContents
          currentPath={location}
          onLogout={handleLogout}
          loggingOut={logoutPending}
        />
      </aside>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close admin navigation"
            className="fixed inset-0 z-40 cursor-default bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation menu"
            className="fixed inset-y-0 left-0 z-50 w-[min(88vw,330px)] border-r border-slate-700/60 bg-[linear-gradient(165deg,#0d1b2a_0%,#102b2b_52%,#102133_100%)] shadow-2xl lg:hidden"
          >
            <div className="absolute right-3 top-3 z-10">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContents
              currentPath={location}
              onNavigate={() => setMobileMenuOpen(false)}
              onLogout={handleLogout}
              loggingOut={logoutPending}
            />
          </aside>
        </>
      )}

      <div className="flex min-h-[100dvh] flex-col lg:pl-[272px]">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/[0.02] backdrop-blur-xl">
          <div className="flex h-[68px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 lg:hidden"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div className="min-w-0 lg:hidden">
                <div className="rounded-lg bg-white"><KairaLogo width={92} /></div>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-800">Admin portal</p>
              </div>
              <div className="hidden min-w-0 items-center gap-2 lg:flex">
                <span className="text-xs font-semibold uppercase tracking-[0.17em] text-emerald-800">Kaira Africa</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                <span className="truncate text-sm font-semibold text-slate-700">{activeItem.label}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-800">{isAdminToken() ? "Admin session" : "Restricted area"}</span>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-slate-800">{getAdminInfo()?.firstName ?? "Administrator"}</p>
                <p className="text-[10px] text-slate-500">Platform access</p>
              </div>
              <Avatar className="h-9 w-9 ring-2 ring-emerald-100">
                <AvatarFallback className="bg-emerald-800 text-xs font-bold text-white">
                  {getAdminInfo() ? getInitials(getAdminInfo()!.firstName, getAdminInfo()!.lastName) : "KA"}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                title="Sign out"
                onClick={handleLogout}
                disabled={logoutPending}
                className="hidden h-9 w-9 text-slate-500 hover:bg-rose-50 hover:text-rose-700 sm:inline-flex"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200/80 bg-white/60 px-4 py-4 text-center text-[11px] text-slate-500 sm:px-6 lg:px-8">
          Kaira Africa · Secure platform administration
        </footer>
      </div>
    </div>
  );
}
