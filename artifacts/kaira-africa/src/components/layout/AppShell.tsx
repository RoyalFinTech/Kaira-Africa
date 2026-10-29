import { useEffect, useState, type ReactNode } from 'react';
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
