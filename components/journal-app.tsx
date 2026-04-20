"use client";

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
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

const TradeForm = dynamic(loadPage(() => import('@/components/trade-form'), 'trade form'), { loading: createPageLoader('trade form') });
const TradeLog = dynamic(loadPage(() => import('@/components/trade-log'), 'trade log'), { loading: createPageLoader('trade log') });
const Analytics = dynamic(loadPage(() => import('@/components/analytics'), 'analytics'), { loading: createPageLoader('analytics') });
const ProfitLoss = dynamic(loadPage(() => import('@/components/profit-loss'), 'profit and loss'), { loading: createPageLoader('profit and loss') });
const WeeklyReview = dynamic(loadPage(() => import('@/components/weekly-review'), 'weekly review'), { loading: createPageLoader('weekly review') });
const DataUtilities = dynamic(loadPage(() => import('@/components/data-utilities'), 'data utilities'), { loading: createPageLoader('data utilities') });
const IdeasList = dynamic(loadPage(() => import('@/components/ideas-list'), 'ideas'), { loading: createPageLoader('ideas') });
const IdeaForm = dynamic(loadPage(() => import('@/components/idea-form'), 'idea form'), { loading: createPageLoader('idea form') });
const AdvancedAnalytics = dynamic(loadPage(() => import('@/components/advanced-analytics'), 'advanced analytics'), { loading: createPageLoader('advanced analytics') });
const GoalsTracker = dynamic(loadPage(() => import('@/components/goals-tracker'), 'goals'), { loading: createPageLoader('goals') });
const TradeSearch = dynamic(loadPage(() => import('@/components/trade-search'), 'search'), { loading: createPageLoader('search') });
const ReportsGenerator = dynamic(loadPage(() => import('@/components/reports-generator'), 'reports'), { loading: createPageLoader('reports') });
const EmotionAnalyzer = dynamic(loadPage(() => import('@/components/emotion-analyzer'), 'emotion analyzer'), { loading: createPageLoader('emotion analyzer') });
const PreTradeChecklistWorkspace = dynamic(
  loadPage(() => import('@/components/pre-trade-checklist-workspace'), 'pre-trade workspace'),
  { loading: createPageLoader('pre-trade workspace') },
);
const ScreenshotGallery = dynamic(loadPage(() => import('@/components/screenshot-gallery'), 'gallery'), { loading: createPageLoader('gallery') });
const LearningVideos = dynamic(loadPage(() => import('@/components/learning-videos'), 'learning videos'), { loading: createPageLoader('learning videos') });

function JournalAppContent({ currentPage }: { currentPage: Page }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'pre-trade':
        return <PreTradeChecklistWorkspace onStartTrade={() => router.push(buildAppPath('add-trade'))} />;
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
    <div className="flex min-h-[100dvh] md:h-dvh flex-col md:flex-row bg-background overflow-x-hidden">
      <div className="hidden md:block">
        <Sidebar currentPage={currentPage} />
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-0">
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
