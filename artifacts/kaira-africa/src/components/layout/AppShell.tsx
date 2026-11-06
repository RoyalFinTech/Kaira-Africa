import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';
import { AppPageErrorBoundary } from '@/components/common/AppPageErrorBoundary';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [location] = useLocation();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const pullStart = useRef<{ x: number; y: number } | null>(null);
  const pullRefreshInFlight = useRef(false);
  const queryClient = useQueryClient();

  const refreshVisibleQueries = async () => {
    if (pullRefreshInFlight.current) return;
    pullRefreshInFlight.current = true;
    setIsPullRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      pullRefreshInFlight.current = false;
      setIsPullRefreshing(false);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch || event.currentTarget.scrollTop > 0) {
      pullStart.current = null;
      return;
    }

    // Do not hijack a downward gesture while an inner scroll panel is
    // positioned below its own top edge.
    let node = event.target as HTMLElement | null;
    while (node && node !== event.currentTarget) {
      const style = window.getComputedStyle(node);
      const scrollableY = /(auto|scroll|overlay)/.test(style.overflowY);
      if (scrollableY && node.scrollHeight > node.clientHeight && node.scrollTop > 0) {
        pullStart.current = null;
        return;
      }
      node = node.parentElement;
    }

    pullStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = pullStart.current;
    pullStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const deltaY = touch.clientY - start.y;
    const deltaX = Math.abs(touch.clientX - start.x);
    if (deltaY >= 88 && deltaY > deltaX * 1.4) {
      void refreshVisibleQueries();
    }
  };

  // Route changes from any menu item close the mobile drawer immediately.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-[100dvh] flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block shrink-0">
        <Sidebar collapsed={desktopSidebarCollapsed} onLogoClick={() => setDesktopSidebarCollapsed(value => !value)} onNavigate={() => setDesktopSidebarCollapsed(true)} />
      </div>

      {/* Mobile Sidebar Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[260px]">
          <div className="h-full">
            <Sidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <Header onMenuClick={() => setMobileMenuOpen(value => !value)} onDesktopMenuToggle={() => setDesktopSidebarCollapsed(value => !value)} />
        <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-6">
          <AppPageErrorBoundary key={location}>{children}</AppPageErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav onMoreClick={() => setMobileMenuOpen(true)} />
    </div>
  );
}
