"use client";

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
import TradeForm from '@/components/trade-form';
import TradeLog from '@/components/trade-log';
import Analytics from '@/components/analytics';
import ProfitLoss from '@/components/profit-loss';
import WeeklyReview from '@/components/weekly-review';
import DataUtilities from '@/components/data-utilities';
import IdeasList from '@/components/ideas-list';
import IdeaForm from '@/components/idea-form';
import AdvancedAnalytics from '@/components/advanced-analytics';
import GoalsTracker from '@/components/goals-tracker';
import TradeSearch from '@/components/trade-search';
import ReportsGenerator from '@/components/reports-generator';
import EmotionAnalyzer from '@/components/emotion-analyzer';
import EmailVerificationRequired from '@/components/email-verification-required';

type Page = 'dashboard' | 'add-trade' | 'log' | 'analytics' | 'profit-loss' | 'weekly-review' | 'data-utilities' | 'ideas' | 'add-idea' | 'advanced-analytics' | 'goals' | 'search' | 'reports' | 'emotion-analyzer';

const ALLOWED_PAGES: Page[] = [
  'dashboard',
  'add-trade',
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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'add-trade':
        return <TradeForm onSuccess={() => setCurrentPage('log')} />;
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
