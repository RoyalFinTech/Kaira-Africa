import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  Shield, Users, Building2, ArrowLeftRight, TrendingUp,
  Activity, FileText, Bell, LogOut, Settings, ChevronRight,
  UserCheck, AlertTriangle, Eye, Lock, Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { KairaLogo } from '@/components/common/KairaLogo';
import { useLogout } from '@workspace/api-client-react';
import { clearToken, clearAdminInfo, getAdminInfo } from '@/lib/api-client';
import { getInitials } from '@/lib/utils';

const navItems = [
  { label: 'Overview', href: '/admin/dashboard', icon: Shield, active: true },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Businesses', href: '/admin/businesses', icon: Building2 },
  { label: 'Transactions', href: '/admin/transactions', icon: ArrowLeftRight },
  { label: 'Reports', href: '/admin/reports', icon: FileText },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { label: 'CRM', href: '/admin/crm', icon: UserCheck },
  { label: 'Inventory', href: '/admin/inventory', icon: Building2 },
  { label: 'Audit Logs', href: '/admin/activity', icon: Activity },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Roles & Permissions', href: '/admin/roles', icon: Lock },
  { label: 'Security', href: '/admin/security', icon: AlertTriangle },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminDashboardPage() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  // Real admin identity captured at login (see AdminLoginPage) — there
  // is no admin equivalent of GET /auth/me to re-fetch this, see the
  // comment on getAdminInfo() in lib/api-client.ts.
  const adminData = getAdminInfo();

  const logout = useLogout();
  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        clearToken();
        clearAdminInfo();
        setLocation('/admin');
      },
    });
  };

  // A real check against the backend's own health endpoint — not a
  // hardcoded "System Online" badge.
  useEffect(() => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
    fetch(`${apiBaseUrl}/health`)
      .then((res) => setApiHealthy(res.ok))
      .catch(() => setApiHealthy(false));
  }, []);

  return (
    <div className="min-h-[100dvh] flex" style={{ background: '#f8fafc' }}>
      {/* ── Admin Sidebar ── */}
      <div className="hidden lg:flex w-[240px] flex-col h-screen sticky top-0"
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1a2744 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo + Admin badge */}
        <div className="p-5 pb-4">
          <KairaLogo width={120} className="brightness-0 invert mb-3" />
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20">
            <Shield className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-300 tracking-wide">ADMIN PORTAL</span>
          </div>
        </div>

        {/* Admin user */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-amber-400 text-slate-900 text-xs font-bold">
                {adminData ? getInitials(adminData.firstName, adminData.lastName) : 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {adminData ? `${adminData.firstName} ${adminData.lastName}` : 'Administrator'}
              </p>
              <p className="text-xs text-slate-500 truncate">{adminData?.email}</p>
            </div>
          </div>
        </div>

        <div className="mx-4 border-t border-white/5 mb-2" />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}>
              <div
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer',
                  item.active
                    ? 'bg-amber-400/15 text-amber-300 border-l-2 border-amber-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
                ].join(' ')}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="mx-4 border-t border-white/5 my-2" />

        <div className="p-3">
          <Button variant="ghost" onClick={handleLogout}
            className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5 text-sm">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="h-14 flex items-center justify-between px-6 bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-700">Admin Dashboard</span>
            <span className="text-slate-300 mx-1">/</span>
            <span className="text-sm text-slate-500">Overview</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={
                apiHealthy === null
                  ? 'text-xs border-slate-200 text-slate-500 bg-slate-50'
                  : apiHealthy
                  ? 'text-xs border-green-200 text-green-700 bg-green-50'
                  : 'text-xs border-red-200 text-red-700 bg-red-50'
              }
            >
              <Globe className="h-3 w-3 mr-1" />
              {apiHealthy === null ? 'Checking…' : apiHealthy ? 'System Online' : 'System Unreachable'}
            </Badge>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <main className="flex-1 p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-amber-500" />
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Administration Overview
              </h1>
            </div>
            <p className="text-slate-500 text-sm">
              Platform health, user activity, and system alerts for Kaira Africa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin/analytics"><Card className="hover:border-amber-300 transition-colors"><CardContent className="p-5"><TrendingUp className="h-5 w-5 text-amber-500"/><h2 className="font-semibold mt-3 text-slate-900">Platform Analytics</h2><p className="text-xs text-slate-500 mt-1">Revenue trends, transaction mix and country distribution.</p></CardContent></Card></Link>
            <Link href="/admin/crm"><Card className="hover:border-amber-300 transition-colors"><CardContent className="p-5"><UserCheck className="h-5 w-5 text-amber-500"/><h2 className="font-semibold mt-3 text-slate-900">Platform CRM</h2><p className="text-xs text-slate-500 mt-1">Review customer relationships and CRM activity across businesses.</p></CardContent></Card></Link>
            <Link href="/admin/inventory"><Card className="hover:border-amber-300 transition-colors"><CardContent className="p-5"><Building2 className="h-5 w-5 text-amber-500"/><h2 className="font-semibold mt-3 text-slate-900">Platform Inventory</h2><p className="text-xs text-slate-500 mt-1">Monitor tracked products and low-stock signals.</p></CardContent></Card></Link>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Authorization note</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Role-based access control is enforced server-side (see the backend's
                requireAdminRole middleware) — any frontend role checks here are a UX
                convenience only, never the actual security boundary.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
