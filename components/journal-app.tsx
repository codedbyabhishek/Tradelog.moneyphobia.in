"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { TradeProvider } from '@/lib/trade-context';
import { SettingsProvider } from '@/lib/settings-context';
import { IdeasProvider } from '@/lib/ideas-context';
import { GoalsProvider } from '@/lib/goals-context';
import { FiltersProvider } from '@/lib/filters-context';
import { TemplatesProvider } from '@/lib/templates-context';
import { HydrationBoundary } from '@/components/hydration-boundary';
import AuthScreen from '@/components/auth-screen';
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import Dashboard from '@/components/dashboard';
import EmailVerificationRequired from '@/components/email-verification-required';

function createPageLoader(label: string) {
  function PageLoader() {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
        Loading {label}...
      </div>
    );
  }

  PageLoader.displayName = `${label.replace(/\s+/g, '')}Loader`;
  return PageLoader;
}

const TradeForm = dynamic(() => import('@/components/trade-form'), { loading: createPageLoader('trade form') });
const TradeLog = dynamic(() => import('@/components/trade-log'), { loading: createPageLoader('trade log') });
const Analytics = dynamic(() => import('@/components/analytics'), { loading: createPageLoader('analytics') });
const ProfitLoss = dynamic(() => import('@/components/profit-loss'), { loading: createPageLoader('profit and loss') });
const WeeklyReview = dynamic(() => import('@/components/weekly-review'), { loading: createPageLoader('weekly review') });
const DataUtilities = dynamic(() => import('@/components/data-utilities'), { loading: createPageLoader('data utilities') });
const IdeasList = dynamic(() => import('@/components/ideas-list'), { loading: createPageLoader('ideas') });
const IdeaForm = dynamic(() => import('@/components/idea-form'), { loading: createPageLoader('idea form') });
const AdvancedAnalytics = dynamic(() => import('@/components/advanced-analytics'), { loading: createPageLoader('advanced analytics') });
const GoalsTracker = dynamic(() => import('@/components/goals-tracker'), { loading: createPageLoader('goals') });
const TradeSearch = dynamic(() => import('@/components/trade-search'), { loading: createPageLoader('search') });
const ReportsGenerator = dynamic(() => import('@/components/reports-generator'), { loading: createPageLoader('reports') });
const EmotionAnalyzer = dynamic(() => import('@/components/emotion-analyzer'), { loading: createPageLoader('emotion analyzer') });
const PreTradeChecklistWorkspace = dynamic(() => import('@/components/pre-trade-checklist-workspace'), {
  loading: createPageLoader('pre-trade workspace'),
});
const ScreenshotGallery = dynamic(() => import('@/components/screenshot-gallery'), { loading: createPageLoader('gallery') });
const LearningVideos = dynamic(() => import('@/components/learning-videos'), { loading: createPageLoader('learning videos') });

type Page = 'dashboard' | 'pre-trade' | 'add-trade' | 'gallery' | 'learning-videos' | 'log' | 'analytics' | 'profit-loss' | 'weekly-review' | 'data-utilities' | 'ideas' | 'add-idea' | 'advanced-analytics' | 'goals' | 'search' | 'reports' | 'emotion-analyzer';

const ALLOWED_PAGES: Page[] = [
  'dashboard',
  'pre-trade',
  'add-trade',
  'gallery',
  'learning-videos',
  'log',
  'analytics',
  'profit-loss',
  'weekly-review',
  'data-utilities',
  'ideas',
  'add-idea',
  'advanced-analytics',
  'goals',
  'search',
  'reports',
  'emotion-analyzer',
];

function getInitialPage(): Page {
  if (typeof window === 'undefined') {
    return 'dashboard';
  }

  const hash = window.location.hash.replace('#', '');
  if (hash && ALLOWED_PAGES.includes(hash as Page)) {
    window.localStorage.setItem('td-last-page', hash);
    return hash as Page;
  }

  const stored = window.localStorage.getItem('td-last-page');
  if (stored && ALLOWED_PAGES.includes(stored as Page)) {
    return stored as Page;
  }

  return 'dashboard';
}

function JournalAppContent() {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('td-last-page', currentPage);
    const hash = `#${currentPage}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }, [currentPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ALLOWED_PAGES.includes(hash as Page)) {
        setCurrentPage(hash as Page);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'pre-trade':
        return <PreTradeChecklistWorkspace onStartTrade={() => setCurrentPage('add-trade')} />;
      case 'add-trade':
        return <TradeForm onSuccess={() => setCurrentPage('log')} />;
      case 'gallery':
        return <ScreenshotGallery />;
      case 'learning-videos':
        return <LearningVideos />;
      case 'log':
        return <TradeLog />;
      case 'analytics':
        return <Analytics />;
      case 'profit-loss':
        return <ProfitLoss />;
      case 'weekly-review':
        return <WeeklyReview />;
      case 'data-utilities':
        return <DataUtilities />;
      case 'ideas':
        return <IdeasList />;
      case 'add-idea':
        return <IdeaForm onSuccess={() => setCurrentPage('ideas')} />;
      case 'advanced-analytics':
        return <AdvancedAnalytics />;
      case 'goals':
        return <GoalsTracker />;
      case 'search':
        return <TradeSearch />;
      case 'reports':
        return <ReportsGenerator />;
      case 'emotion-analyzer':
        return <EmotionAnalyzer />;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!user.emailVerified) {
    return <EmailVerificationRequired />;
  }

  return (
    <div className="flex min-h-[100dvh] md:h-dvh flex-col md:flex-row bg-background overflow-x-hidden">
      <div className="hidden md:block">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-0">
        {renderPage()}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>
    </div>
  );
}

export default function JournalApp() {
  return (
    <HydrationBoundary>
      <AuthProvider>
        <SettingsProvider>
          <TradeProvider>
            <IdeasProvider>
              <GoalsProvider>
                <FiltersProvider>
                  <TemplatesProvider>
                    <JournalAppContent />
                  </TemplatesProvider>
                </FiltersProvider>
              </GoalsProvider>
            </IdeasProvider>
          </TradeProvider>
        </SettingsProvider>
      </AuthProvider>
    </HydrationBoundary>
  );
}
