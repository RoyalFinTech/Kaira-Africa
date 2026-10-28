import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  ArrowLeftRight,
  TrendingUp,
  FileText,
  Activity,
  Package,
  ClipboardList,
  CalendarDays,
  FolderKanban,
  BookOpen,
  BrainCircuit,
  ReceiptText,
  CreditCard,
  PiggyBank,
  Wallet,
  Settings2,
  LogOut,
  User,
} from 'lucide-react';
import { KairaLogo } from '@/components/common/KairaLogo';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useGetMe, useGetMyBusiness, useLogout } from '@workspace/api-client-react';
import { clearToken } from '@/lib/api-client';
import { useLocation as useLocationHook } from 'wouter';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const navigation: { section: string; items: NavItem[] }[] = [
  {
    section: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'BUSINESS',
    items: [
      { label: 'Team', href: '/team', icon: Users },
      { label: 'Customers', href: '/customers', icon: UserCheck },
      { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
      { label: 'Daily Ledger', href: '/daily-ledger', icon: ClipboardList },
      { label: 'CRM', href: '/crm', icon: UserCheck },
      { label: 'Inventory', href: '/inventory', icon: Package },
      { label: 'Investment Planner', href: '/investments', icon: PiggyBank },
      { label: 'Savings Tracker', href: '/savings', icon: Wallet },
      { label: 'Receipt Branding', href: '/receipt-branding', icon: ReceiptText },
      { label: 'Billing & Plan', href: '/billing', icon: CreditCard },
    ],
  },
  {
    section: 'INSIGHTS',
    items: [
      { label: 'Analytics', href: '/analytics', icon: TrendingUp },
      { label: 'Reports', href: '/reports', icon: FileText },
      { label: 'Activity', href: '/activity', icon: Activity },
      { label: 'AI Reports', href: '/ai-reports', icon: BrainCircuit },
    ],
  },
];

export function Sidebar() {
  const [location, setLocation] = useLocationHook();
  const { data: user } = useGetMe();
  const { data: business } = useGetMyBusiness();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        clearToken();
        setLocation('/login');
      },
    });
  };

  return (
    <div className="w-[260px] h-screen bg-[#0D3B2A] border-r border-emerald-100/15 flex flex-col">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="w-fit rounded-xl bg-white p-2 shadow-sm">
          <KairaLogo width={160} />
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10">
          <ProfileAvatar
            photoUrl={user?.avatarUrl}
            firstName={user?.firstName}
            lastName={user?.lastName}
            className="h-10 w-10 ring-1 ring-sidebar-border"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-emerald-50/75 truncate">
              {business?.name}
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-emerald-100/20" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigation.map((group) => (
          <div key={group.section}>
            <h3 className="px-3 mb-2 text-xs font-semibold text-emerald-100/65 tracking-wider">
              {group.section}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location === item.href || location.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-[#E7B32B] text-[#10281D] border-l-2 border-[#F6D875]'
                          : 'text-emerald-50 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <Separator className="bg-emerald-100/20" />

      {/* Bottom Actions */}
      <div className="p-3 space-y-1">
        <Link href="/profile" aria-current={location === "/profile" ? "page" : undefined}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              location === "/profile"
                ? "bg-[#E7B32B] text-[#10281D]"
                : "text-emerald-50 hover:bg-white/10 hover:text-white"
            )}
          >
            <User className="h-5 w-5 flex-shrink-0" />
            <span>Profile</span>
          </div>
        </Link>
        <Link href="/settings">
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              location === '/settings'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-emerald-50 hover:bg-white/10 hover:text-white'
            )}
          >
            <Settings2 className="h-5 w-5 flex-shrink-0" />
            <span>Settings</span>
          </div>
        </Link>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-emerald-50 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}
