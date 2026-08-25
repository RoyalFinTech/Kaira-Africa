import { useState, useEffect } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { getInitials } from '@/lib/utils';
import { clearToken } from '@/lib/api-client';
import { Link, useLocation } from 'wouter';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const { data: notifications } = useListNotifications({ unreadOnly: true });
  const [shouldShake, setShouldShake] = useState(false);

  const unreadCount = notifications?.length || 0;

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
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Breadcrumb could be added here based on current route */}
      </div>

      {/* Right: Search, Notifications, Avatar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon">
          <Search className="h-5 w-5" />
        </Button>

        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className={`h-5 w-5 ${shouldShake ? 'animate-bell-shake' : ''}`} />
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-secondary text-sidebar-primary-foreground"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 bg-primary">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {user && getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
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
