import { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Search, Menu } from 'lucide-react';
import { ProfileAvatar } from '@/components/common/ProfileAvatar';
import { KairaLogo } from '@/components/common/KairaLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGetMe, useListNotifications, useLogout } from '@workspace/api-client-react';
import { clearToken } from '@/lib/api-client';
import { Link, useLocation } from 'wouter';

interface HeaderProps {
  onMenuClick?: () => void;
  onDesktopMenuToggle?: () => void;
}

export function Header({ onMenuClick, onDesktopMenuToggle }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const { data: notifications } = useListNotifications({ unreadOnly: true });
  const [shouldShake, setShouldShake] = useState(false);

  const unreadCount = notifications?.length || 0;

  const handleBack = () => {
    // Use browser history when the previous page belongs to this app.
    // If the user opened a deep link directly, return to the dashboard instead
    // of sending them back to an unrelated external site.
    const referrerIsInternal = document.referrer.startsWith(window.location.origin);
    if (window.history.length > 1 && referrerIsInternal) {
      window.history.back();
      return;
    }
    if (location !== '/dashboard' && location !== '/') setLocation('/dashboard');
  };

  // Trigger bell shake animation 3s after mount (simulating new notification)
  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => {
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 500);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [unreadCount]);

  const logout = useLogout();

  const handleLogout = () => {
    // Best-effort: revoke the session server-side, but clear the
    // local token and redirect regardless of whether the network
    // call succeeds — a person clicking "Logout" should never be
    // stuck signed in on their own device because of a network blip.
    logout.mutate(undefined, {
      onSettled: () => {
        clearToken();
        setLocation('/login');
      },
    });
  };

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3">
        {location !== '/dashboard' && location !== '/' && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Go back"
            title="Go back"
            onClick={handleBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <button
          type="button"
          aria-label="Open Kaira Africa menu"
          title="Open Kaira Africa menu"
          onClick={onMenuClick}
          className="flex items-center rounded-lg p-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <KairaLogo width={112} height={36} />
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle navigation menu"
          title="Toggle navigation menu"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Collapse or expand sidebar"
          title="Collapse or expand sidebar"
          className="hidden lg:inline-flex"
          onClick={onDesktopMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Route title belongs to each page. */}
      </div>

      {/* Right: Search, Notifications, Avatar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Find customers" title="Find customers" onClick={() => setLocation("/customers")}>
          <Search className="h-5 w-5" />
        </Button>

        <Link
          href="/notifications"
          aria-label="Notifications"
          title="Notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className={`h-5 w-5 ${shouldShake ? 'animate-bell-shake' : ''}`} />
          {unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-secondary p-0 text-xs text-sidebar-primary-foreground"
            >
              {unreadCount}
            </Badge>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" aria-label="Open profile and account menu" title="Account menu" className="relative h-10 w-10 rounded-full">
              <ProfileAvatar
                photoUrl={user?.avatarUrl}
                firstName={user?.firstName}
                lastName={user?.lastName}
                className="h-10 w-10 bg-primary ring-1 ring-border"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
