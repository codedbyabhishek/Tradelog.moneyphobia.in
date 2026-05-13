'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, PlusCircle, Table, LineChart, Activity, Settings, Calendar, TrendingUp, Lightbulb, Target, Search, Zap, FileText, Brain, Sparkles, Images, Youtube, BookOpen, FileSpreadsheet, PanelLeftClose, PanelLeftOpen, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/lib/auth-context';
import { buildAppPath, type Page } from '@/lib/app-routes';

interface SidebarProps {
  currentPage: Page;
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'trading-journal-sidebar-collapsed';
const SIDEBAR_COLLAPSED_EVENT = 'trading-journal-sidebar-collapsed-change';

function getStoredSidebarCollapsed() {
  if (typeof window === 'undefined') return false;

  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function subscribeToSidebarCollapsed(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);
  };
}

export default function Sidebar({ currentPage }: SidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isCollapsed = useSyncExternalStore(
    subscribeToSidebarCollapsed,
    getStoredSidebarCollapsed,
    () => false
  );

  const toggleCollapsed = () => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(!isCollapsed));
      window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
    } catch {
      // Ignore storage failures; the current render remains usable.
    }
  };

  const switchAccount = async () => {
    await logout();
    router.replace('/login');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'add-trade', label: 'Add Trade', icon: PlusCircle },
    { id: 'log', label: 'Trade Log', icon: Table },
    { id: 'calendar', label: 'Calendar View', icon: Calendar },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'import-analysis', label: 'Import Analysis', icon: FileSpreadsheet },
    { id: 'pre-trade', label: 'Pre-Trade', icon: Sparkles },
    { id: 'playbooks', label: 'Playbooks', icon: BookOpen },
    { id: 'gallery', label: 'Gallery', icon: Images },
    { id: 'learning-videos', label: 'Learning Videos', icon: Youtube },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'advanced-analytics', label: 'Advanced Analytics', icon: Zap },
    { id: 'profit-loss', label: 'P&L Summary', icon: TrendingUp },
    { id: 'weekly-review', label: 'Weekly Review', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'emotion-analyzer', label: 'Emotion Analysis', icon: Brain },
    { id: 'search', label: 'Search & Filter', icon: Search },
    { id: 'goals', label: 'Trading Goals', icon: Target },
    { id: 'ideas', label: 'Trade Ideas', icon: Lightbulb },
    { id: 'add-idea', label: 'Add Idea', icon: PlusCircle },
    { id: 'data-utilities', label: 'Data & Settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'h-screen border-r border-border bg-sidebar flex flex-col overflow-hidden transition-[width] duration-200 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64'
      )}
      data-collapsed={isCollapsed}
    >
      <div
        className={cn(
          'sticky top-0 bg-sidebar border-b border-sidebar-border flex-shrink-0',
          isCollapsed ? 'p-3' : 'p-6'
        )}
      >
        <div className={cn('flex items-center gap-3', isCollapsed ? 'justify-center' : 'justify-between')}>
          <div className={cn('min-w-0', isCollapsed && 'sr-only')}>
            <h1 className="text-2xl font-bold text-sidebar-foreground truncate">Trading Journal</h1>
            <p className="text-sm text-muted-foreground mt-1 truncate">Track & Analyze Trades</p>
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <nav className={cn('flex-1 space-y-2 py-4 overflow-y-auto', isCollapsed ? 'px-2' : 'px-4')}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <Link
              key={item.id}
              href={buildAppPath(item.id as Page)}
              title={isCollapsed ? item.label : undefined}
              aria-label={item.label}
              className={cn(
                'w-full flex items-center rounded-lg text-left transition-colors',
                isCollapsed ? 'h-11 justify-center px-0' : 'gap-3 px-4 py-3',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className={cn('font-medium truncate', isCollapsed && 'sr-only')}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          'border-t border-sidebar-border flex-shrink-0',
          isCollapsed ? 'space-y-3 p-3' : 'space-y-4 p-4'
        )}
      >
        <div className={cn('space-y-2', isCollapsed && 'flex flex-col items-center')}>
          <p className={cn('text-xs text-sidebar-foreground font-semibold px-2', isCollapsed && 'sr-only')}>Theme</p>
          <div className={cn(isCollapsed ? 'w-9 overflow-hidden [&_span]:hidden [&_svg.hidden]:hidden' : 'px-2')}>
            <ThemeToggle />
          </div>
        </div>
        
        <div className={cn('p-4 bg-sidebar-accent rounded-lg border border-sidebar-border', isCollapsed && 'hidden')}>
          <p className="text-xs text-sidebar-foreground font-semibold">Tip</p>
          <p className="text-xs text-muted-foreground mt-2">Keep detailed notes on each trade to identify patterns and improve consistency.</p>
        </div>
        <div className={cn('space-y-2', isCollapsed ? 'flex flex-col items-center' : 'px-2')}>
          <p className={cn('text-xs text-muted-foreground truncate', isCollapsed && 'sr-only')} title={user?.email || ''}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={() => void switchAccount()}
            className={cn(
              'rounded-md border border-sidebar-border text-xs hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              isCollapsed ? 'flex h-9 w-9 items-center justify-center p-0' : 'flex w-full items-center gap-2 px-2 py-2 text-left'
            )}
            aria-label="Switch account"
            title={isCollapsed ? 'Switch account' : undefined}
          >
            {isCollapsed ? <Users className="h-4 w-4" /> : (
              <>
                <Users className="h-3.5 w-3.5" />
                <span>Switch account</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className={cn(
              'rounded-md border border-sidebar-border text-xs hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              isCollapsed ? 'flex h-9 w-9 items-center justify-center p-0' : 'flex w-full items-center gap-2 px-2 py-2 text-left'
            )}
            aria-label="Logout"
            title={isCollapsed ? 'Logout' : undefined}
          >
            {isCollapsed ? <LogOut className="h-4 w-4" /> : (
              <>
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
