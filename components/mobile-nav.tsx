'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, PlusCircle, Table, LineChart, Activity, Settings, Calendar, TrendingUp, Lightbulb, Palette, Target, Search, FileText, Brain, Ellipsis, Sparkles, Images, Youtube, BookOpen, FileSpreadsheet, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth-context';
import { buildAppPath, type Page } from '@/lib/app-routes';

interface MobileNavProps {
  currentPage: Page;
}

export default function MobileNav({ currentPage }: MobileNavProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const primaryItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'add-trade', label: 'Add', icon: PlusCircle },
    { id: 'log', label: 'Log', icon: Table },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
  ];

  const moreItems = [
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'import-analysis', label: 'Import Analysis', icon: FileSpreadsheet },
    { id: 'pre-trade', label: 'Pre-Trade', icon: Sparkles },
    { id: 'playbooks', label: 'Playbooks', icon: BookOpen },
    { id: 'gallery', label: 'Gallery', icon: Images },
    { id: 'learning-videos', label: 'Videos', icon: Youtube },
    { id: 'emotion-analyzer', label: 'Emotions', icon: Brain },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'profit-loss', label: 'P&L Summary', icon: TrendingUp },
    { id: 'weekly-review', label: 'Weekly Review', icon: TrendingUp },
    { id: 'ideas', label: 'Trade Ideas', icon: Lightbulb },
    { id: 'add-idea', label: 'Add Idea', icon: PlusCircle },
    { id: 'advanced-analytics', label: 'Advanced', icon: Settings },
    { id: 'data-utilities', label: 'Settings', icon: Settings },
  ];

  const [moreOpen, setMoreOpen] = React.useState(false);

  const switchAccount = async () => {
    await logout();
    setMoreOpen(false);
    router.replace('/login');
  };

  const handleLogout = async () => {
    await logout();
    setMoreOpen(false);
  };

  return (
    <nav className="bg-sidebar/95 backdrop-blur border-t border-border flex min-h-[72px] pb-[max(env(safe-area-inset-bottom),0px)]">
      {primaryItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <Link
            key={item.id}
            href={buildAppPath(item.id as Page)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-3 px-1 sm:px-2 min-w-fit transition-colors touch-none select-none',
              isActive
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
            title={item.label}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-medium text-center truncate max-w-[3.5rem]">{item.label}</span>
          </Link>
        );
      })}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-3 px-1 sm:px-2 min-w-fit transition-colors border-l border-border',
              moreItems.some((item) => item.id === currentPage)
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
            title="More"
          >
            <Ellipsis className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-medium text-center truncate max-w-[3.5rem]">More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
          <SheetHeader className="px-4 pb-2">
            <SheetTitle>More Options</SheetTitle>
            <SheetDescription>
              Open the rest of the journal pages and switch your theme.
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 overflow-y-auto px-4 pb-4">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <Link
                  key={item.id}
                  href={buildAppPath(item.id as Page)}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                    isActive
                      ? 'border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="border-t border-border px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Palette className="h-4 w-4 text-primary" />
              Theme
            </div>
            <ThemeToggle />
          </div>

          <div className="border-t border-border px-4 py-4">
            <p className="truncate text-xs text-muted-foreground" title={user?.email || ''}>{user?.email}</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void switchAccount()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Users className="h-4 w-4" />
                Switch account
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
