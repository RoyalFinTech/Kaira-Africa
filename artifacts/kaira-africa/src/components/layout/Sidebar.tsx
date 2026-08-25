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
  Settings2,
  LogOut,
} from 'lucide-react';
import { KairaLogo } from '@/components/common/KairaLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn, getInitials } from '@/lib/utils';
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
    <div className="w-[260px] h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 pb-4">
        <KairaLogo width={160} className="brightness-0 invert" />
      </div>

      {/* User Info */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
          <Avatar className="h-10 w-10 bg-sidebar-primary">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
              {user && getInitials(user.firstName, user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {business?.name}
            </p>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigation.map((group) => (
          <div key={group.section}>
            <h3 className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/60 tracking-wider">
              {group.section}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground border-l-2 border-sidebar-primary'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
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

      <Separator className="bg-sidebar-border" />

      {/* Bottom Actions */}
      <div className="p-3 space-y-1">
        <Link href="/settings">
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
              location === '/settings'
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Settings2 className="h-5 w-5 flex-shrink-0" />
            <span>Settings</span>
          </div>
        </Link>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}
