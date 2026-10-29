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
  Clock3,
  StickyNote,
  MessageCircle,
  FolderKanban,
  BookOpen,
  BrainCircuit,
  Sparkles,
  ReceiptText,
  CreditCard,
  PiggyBank,
  Wallet,
  Settings2,
  LogOut,
  User,
  Calculator,
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
      { label: 'Smart Calculator', href: '/calculator', icon: Calculator },
      { label: 'CRM', href: '/crm', icon: UserCheck },
      { label: 'Inventory', href: '/inventory', icon: Package },
      { label: 'Investment Planner', href: '/investments', icon: PiggyBank },
      { label: 'Savings Tracker', href: '/savings', icon: Wallet },
      { label: 'Receipt Branding', href: '/receipt-branding', icon: ReceiptText },
      { label: 'Billing & Plan', href: '/billing', icon: CreditCard },
    ],
  },
  {
    section: 'WORK MANAGEMENT',
    items: [
      { label: 'Tasks', href: '/work-management/tasks', icon: ClipboardList },
      { label: 'Projects', href: '/work-management/projects', icon: FolderKanban },
      { label: 'Meetings & Minutes', href: '/work-management/meetings', icon: CalendarDays },
      { label: 'Calendar & Schedule', href: '/calendar', icon: Clock3 },
      { label: 'Notes & Documents', href: '/work-notes', icon: StickyNote },
      { label: 'Team Chat & Announcements', href: '/team-chat', icon: MessageCircle },
      { label: 'My Work Time', href: '/work-time', icon: Clock3 },
    ],
  },
  {
    section: 'FREELANCER & AI TOOLS',
    items: [
      { label: 'Freelancer & Remote Work', href: '/visual-assistant', icon: Sparkles },
      { label: 'AI Reports & Insights', href: '/ai-reports', icon: BrainCircuit },
    ],
  },
  {
    section: 'LEARNING & SUPPORT',
    items: [
      { label: 'Tutorials & Courses', href: '/tutorials', icon: BookOpen },
    ],
  },
  {
    section: 'INSIGHTS',
    items: [
      { label: 'Analytics', href: '/analytics', icon: TrendingUp },
      { label: 'Reports', href: '/reports', icon: FileText },
      { label: 'Activity', href: '/activity', icon: Activity },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onLogoClick?: () => void;
}

export function Sidebar({ collapsed = false, onLogoClick }: SidebarProps) {
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
    <div className={cn("h-[100dvh] bg-[#0D3B2A] border-r border-emerald-100/15 flex flex-col transition-[width] duration-200", collapsed ? "w-[76px]" : "w-[260px]")}>
      {/* Logo */}
      <div className={cn("pb-4 pt-5", collapsed ? "px-3" : "px-5")}>
        <button
          type="button"
          onClick={onLogoClick}
          aria-label={collapsed ? "Expand Kaira Africa navigation" : "Collapse Kaira Africa navigation"}
          title={collapsed ? "Expand menu" : "Collapse menu"}
          className={cn("flex items-center rounded-xl bg-white p-2 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B32B]", collapsed ? "mx-auto justify-center" : "w-full justify-center")}
        >
          <KairaLogo width={collapsed ? 40 : 160} height={collapsed ? 40 : undefined} />
        </button>
      </div>

      {/* User Info */}
      <div className={cn("pb-4", collapsed ? "px-3" : "px-4")}>
        <div className={cn("flex items-center gap-3 rounded-lg bg-white/10", collapsed ? "justify-center p-2" : "p-3")}>
          <ProfileAvatar
            photoUrl={user?.avatarUrl}
            firstName={user?.firstName}
            lastName={user?.lastName}
            className="h-10 w-10 ring-1 ring-sidebar-border"
          />
          {!collapsed && <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-emerald-50/75 truncate">
              {business?.name}
            </p>
          </div>}
        </div>
      </div>

      <Separator className="bg-emerald-100/20" />

      {/* Navigation */}
      <nav aria-label="Application navigation" className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-2 space-y-3" : "px-3 space-y-6")}>
        {navigation.map((group) => (
          <div key={group.section}>
            {!collapsed && <h3 className="px-3 mb-2 text-xs font-semibold text-emerald-100/65 tracking-wider">
              {group.section}
            </h3>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location === item.href || location.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}>
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all',
                        collapsed ? 'justify-center px-2' : 'px-3',
                        isActive
                          ? 'bg-[#E7B32B] text-[#10281D] border-l-2 border-[#F6D875]'
                          : 'text-emerald-50 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
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
      <div className={cn("space-y-1", collapsed ? "p-2" : "p-3")}>
        <Link href="/profile" aria-current={location === "/profile" ? "page" : undefined} title={collapsed ? "Profile" : undefined}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all",
              collapsed ? "justify-center px-2" : "px-3",
              location === "/profile"
                ? "bg-[#E7B32B] text-[#10281D]"
                : "text-emerald-50 hover:bg-white/10 hover:text-white"
            )}
          >
            <User className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Profile</span>}
          </div>
        </Link>
        <Link href="/settings" title={collapsed ? "Settings" : undefined}>
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all',
              collapsed ? 'justify-center px-2' : 'px-3',
              location === '/settings'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-emerald-50 hover:bg-white/10 hover:text-white'
            )}
          >
            <Settings2 className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </div>
        </Link>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn("w-full gap-3 text-emerald-50 hover:bg-white/10 hover:text-white", collapsed ? "justify-center px-2" : "justify-start")}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}
