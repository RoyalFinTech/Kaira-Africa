import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard,
  UserCheck,
  ArrowLeftRight,
  ClipboardList,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  onMoreClick: () => void;
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: UserCheck },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Daily Ledger', href: '/daily-ledger', icon: ClipboardList },
];

export function MobileNav({ onMoreClick }: MobileNavProps) {
  const [location] = useLocation();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-[env(safe-area-inset-bottom)] z-50">
      <nav aria-label="Primary mobile navigation" className="flex h-16 items-center justify-around px-1">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className="min-w-0 flex-1 basis-0">
              <div
                className={cn(
                  'flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0 py-2 transition-colors',
                  isActive
                    ? 'text-secondary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="whitespace-nowrap text-[10px] font-medium sm:text-xs">{item.label}</span>
              </div>
            </Link>
          );
        })}
        <button
          onClick={onMoreClick}
          aria-label="Open more navigation options"
          className="flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 px-0 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="whitespace-nowrap text-[10px] font-medium sm:text-xs">More</span>
        </button>
      </nav>
    </div>
  );
}
