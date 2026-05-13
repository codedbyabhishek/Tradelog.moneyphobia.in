"use client";

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { TradeProvider, useTrades } from '@/lib/trade-context';
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
import { buildAppPath, type Page } from '@/lib/app-routes';

const PAGE_CHUNK_RELOAD_KEY = 'td-page-chunk-reload-once';

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

function isChunkLoadError(input: unknown): boolean {
  const message = String(input || '').toLowerCase();
  return (
    message.includes('failed to load chunk') ||
    message.includes('loading chunk') ||
    message.includes('chunkloaderror') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('failed to load module script')
  );
}

function createChunkErrorFallback(label: string) {
  function ChunkErrorFallback() {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Could not load {label}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A stale app file was detected. Reload the page to fetch the latest version.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  ChunkErrorFallback.displayName = `${label.replace(/\s+/g, '')}ChunkErrorFallback`;
  return ChunkErrorFallback;
}

function loadPage(
  importer: () => Promise<{ default: React.ComponentType<any> }>,
  label: string,
) {
  return async () => {
    try {
      return await importer();
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error)) {
        try {
          if (sessionStorage.getItem(PAGE_CHUNK_RELOAD_KEY) !== '1') {
            sessionStorage.setItem(PAGE_CHUNK_RELOAD_KEY, '1');
            window.location.reload();
          }
        } catch {
          // no-op
        }

        return { default: createChunkErrorFallback(label) };
      }

      throw error;
    }
  };
}

const importTradeForm = () => import('@/components/trade-form');
const importPlaybookBuilder = () => import('@/components/playbook-builder');
const importTradeLog = () => import('@/components/trade-log');
const importCalendarView = () => import('@/components/calendar-view');
const importPerformance = () => import('@/components/performance');
const importImportedTradeAnalyzer = () => import('@/components/imported-trade-analyzer');
const importAnalytics = () => import('@/components/analytics');
const importProfitLoss = () => import('@/components/profit-loss');
const importWeeklyReview = () => import('@/components/weekly-review');
const importDataUtilities = () => import('@/components/data-utilities');
const importIdeasList = () => import('@/components/ideas-list');
const importIdeaForm = () => import('@/components/idea-form');
const importAdvancedAnalytics = () => import('@/components/advanced-analytics');
const importGoalsTracker = () => import('@/components/goals-tracker');
const importTradeSearch = () => import('@/components/trade-search');
const importReportsGenerator = () => import('@/components/reports-generator');
const importEmotionAnalyzer = () => import('@/components/emotion-analyzer');
const importPreTradeChecklistWorkspace = () => import('@/components/pre-trade-checklist-workspace');
const importScreenshotGallery = () => import('@/components/screenshot-gallery');
const importLearningVideos = () => import('@/components/learning-videos');

const TradeForm = dynamic(loadPage(importTradeForm, 'trade form'), { loading: createPageLoader('trade form') });
const PlaybookBuilder = dynamic(loadPage(importPlaybookBuilder, 'playbooks'), { loading: createPageLoader('playbooks') });
const TradeLog = dynamic(loadPage(importTradeLog, 'trade log'), { loading: createPageLoader('trade log') });
const CalendarView = dynamic(loadPage(importCalendarView, 'calendar view'), { loading: createPageLoader('calendar view') });
const Performance = dynamic(loadPage(importPerformance, 'performance'), { loading: createPageLoader('performance') });
const ImportedTradeAnalyzer = dynamic(loadPage(importImportedTradeAnalyzer, 'import analysis'), { loading: createPageLoader('import analysis') });
const Analytics = dynamic(loadPage(importAnalytics, 'analytics'), { loading: createPageLoader('analytics') });
const ProfitLoss = dynamic(loadPage(importProfitLoss, 'profit and loss'), { loading: createPageLoader('profit and loss') });
const WeeklyReview = dynamic(loadPage(importWeeklyReview, 'weekly review'), { loading: createPageLoader('weekly review') });
const DataUtilities = dynamic(loadPage(importDataUtilities, 'data utilities'), { loading: createPageLoader('data utilities') });
const IdeasList = dynamic(loadPage(importIdeasList, 'ideas'), { loading: createPageLoader('ideas') });
const IdeaForm = dynamic(loadPage(importIdeaForm, 'idea form'), { loading: createPageLoader('idea form') });
const AdvancedAnalytics = dynamic(loadPage(importAdvancedAnalytics, 'advanced analytics'), { loading: createPageLoader('advanced analytics') });
const GoalsTracker = dynamic(loadPage(importGoalsTracker, 'goals'), { loading: createPageLoader('goals') });
const TradeSearch = dynamic(loadPage(importTradeSearch, 'search'), { loading: createPageLoader('search') });
const ReportsGenerator = dynamic(loadPage(importReportsGenerator, 'reports'), { loading: createPageLoader('reports') });
const EmotionAnalyzer = dynamic(loadPage(importEmotionAnalyzer, 'emotion analyzer'), { loading: createPageLoader('emotion analyzer') });
const PreTradeChecklistWorkspace = dynamic(
  loadPage(importPreTradeChecklistWorkspace, 'pre-trade workspace'),
  { loading: createPageLoader('pre-trade workspace') },
);
const ScreenshotGallery = dynamic(loadPage(importScreenshotGallery, 'gallery'), { loading: createPageLoader('gallery') });
const LearningVideos = dynamic(loadPage(importLearningVideos, 'learning videos'), { loading: createPageLoader('learning videos') });

const IDLE_PRELOAD_IMPORTERS = [
  importTradeLog,
  importAnalytics,
  importProfitLoss,
];

function JournalAppContent({ currentPage }: { currentPage: Page }) {
  const { user, isLoading } = useAuth();
  const { trades } = useTrades();
  const router = useRouter();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscroll = html.style.overscrollBehaviorY;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehaviorY;
    const previousBodyPosition = body.style.position;
    const previousBodyWidth = body.style.width;

    html.style.overflow = 'hidden';
    html.style.overscrollBehaviorY = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehaviorY = 'none';
    body.style.position = 'fixed';
    body.style.width = '100%';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehaviorY = previousHtmlOverscroll;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehaviorY = previousBodyOverscroll;
      body.style.position = previousBodyPosition;
      body.style.width = previousBodyWidth;
    };
  }, []);

  useEffect(() => {
    if (isLoading || !user) return;

    const preload = () => {
      void Promise.allSettled(IDLE_PRELOAD_IMPORTERS.map((importer) => importer()));
    };

    if (typeof globalThis.requestIdleCallback === 'function') {
      const idleId = globalThis.requestIdleCallback(preload, { timeout: 2500 });
      return () => globalThis.cancelIdleCallback?.(idleId);
    }

    const timeoutId = globalThis.setTimeout(preload, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, [isLoading, user]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
        return <CalendarView trades={trades} />;
      case 'performance':
        return <Performance />;
      case 'import-analysis':
        return <ImportedTradeAnalyzer />;
      case 'pre-trade':
        return <PreTradeChecklistWorkspace onStartTrade={() => router.push(buildAppPath('add-trade'))} />;
      case 'playbooks':
        return <PlaybookBuilder />;
      case 'add-trade':
        return <TradeForm onSuccess={() => router.push(buildAppPath('log'))} />;
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
        return <IdeaForm onSuccess={() => router.push(buildAppPath('ideas'))} />;
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
    <div data-app-shell="true" className="fixed inset-0 flex h-[100dvh] flex-col md:flex-row bg-background overflow-hidden">
      <div className="hidden md:block">
        <Sidebar currentPage={currentPage} />
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-0 [webkit-overflow-scrolling:touch]">
        {renderPage()}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav currentPage={currentPage} />
      </div>
    </div>
  );
}

export default function JournalApp({ currentPage }: { currentPage: Page }) {
  return (
    <HydrationBoundary>
      <AuthProvider>
        <SettingsProvider>
          <TradeProvider>
            <IdeasProvider>
              <GoalsProvider>
                <FiltersProvider>
                  <TemplatesProvider>
                    <JournalAppContent currentPage={currentPage} />
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
