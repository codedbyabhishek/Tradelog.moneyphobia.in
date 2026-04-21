'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Image as ImageIcon, LayoutGrid, Search } from 'lucide-react';
import { useTrades } from '@/lib/trade-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScreenshotViewer } from '@/components/screenshot-viewer';
import { cn } from '@/lib/utils';
import { buildAppPath } from '@/lib/app-routes';

type ScreenshotFilter = 'All' | 'Before Trade' | 'After Exit';
type GalleryLayout = 'grid' | 'masonry' | 'compact';
type DayFilter = 'All Days' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
const GALLERY_LAYOUT_STORAGE_KEY = 'td-gallery-layout';
const DAY_FILTER_OPTIONS: DayFilter[] = [
  'All Days',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

type ScreenshotEntry = {
  id: string;
  tradeId: string;
  imageUrl: string;
  screenshotType: 'Before Trade' | 'After Exit';
  symbol: string;
  setupName: string;
  date: string;
  tradeType: string;
};

function getInitialLayout(): GalleryLayout {
  if (typeof window === 'undefined') {
    return 'grid';
  }

  const stored = window.localStorage.getItem(GALLERY_LAYOUT_STORAGE_KEY);
  if (stored === 'grid' || stored === 'masonry' || stored === 'compact') {
    return stored;
  }

  return 'grid';
}

export default function ScreenshotGallery() {
  const router = useRouter();
  const { trades } = useTrades();
  const [filter, setFilter] = useState<ScreenshotFilter>('All');
  const [dayFilter, setDayFilter] = useState<DayFilter>('All Days');
  const [layout, setLayout] = useState<GalleryLayout>(getInitialLayout);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(GALLERY_LAYOUT_STORAGE_KEY, layout);
  }, [layout]);

  const screenshots = useMemo<ScreenshotEntry[]>(() => {
    return trades
      .flatMap((trade) => {
        const items: ScreenshotEntry[] = [];

        if (trade.beforeTradeScreenshot) {
          items.push({
            id: `${trade.id}-before`,
            tradeId: trade.id,
            imageUrl: trade.beforeTradeScreenshot,
            screenshotType: 'Before Trade',
            symbol: trade.symbol,
            setupName: trade.setupName,
            date: trade.date,
            tradeType: trade.tradeType,
          });
        }

        if (trade.afterExitScreenshot) {
          items.push({
            id: `${trade.id}-after`,
            tradeId: trade.id,
            imageUrl: trade.afterExitScreenshot,
            screenshotType: 'After Exit',
            symbol: trade.symbol,
            setupName: trade.setupName,
            date: trade.date,
            tradeType: trade.tradeType,
          });
        }

        return items;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trades]);

  const filteredScreenshots = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return screenshots.filter((item) => {
      const matchesFilter = filter === 'All' || item.screenshotType === filter;
      const tradeDay = new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' }) as DayFilter;
      const matchesDay = dayFilter === 'All Days' || tradeDay === dayFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        item.setupName.toLowerCase().includes(normalizedSearch) ||
        item.symbol.toLowerCase().includes(normalizedSearch) ||
        item.date.toLowerCase().includes(normalizedSearch) ||
        item.tradeType.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesDay && matchesSearch;
    });
  }, [dayFilter, filter, screenshots, searchTerm]);

  const groupedScreenshots = useMemo(() => {
    return filteredScreenshots.reduce<Record<string, ScreenshotEntry[]>>((groups, item) => {
      if (!groups[item.setupName]) {
        groups[item.setupName] = [];
      }

      groups[item.setupName].push(item);
      return groups;
    }, {});
  }, [filteredScreenshots]);

  const setupGroups = Object.entries(groupedScreenshots).sort((a, b) => b[1].length - a[1].length);

  const openTradeInLog = (tradeId: string) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('td-open-trade-id', tradeId);
    router.push(buildAppPath('log'));
  };

  const renderScreenshotCard = (item: ScreenshotEntry) => (
    <Card
      key={item.id}
      className={cn(
        'overflow-hidden border-border bg-card/80',
        layout === 'masonry' && 'mb-4 break-inside-avoid'
      )}
    >
      <CardContent className="p-0">
        <ScreenshotViewer imageUrl={item.imageUrl} title={`${item.symbol} • ${item.setupName} • ${item.screenshotType}`}>
          <div className="cursor-pointer transition-opacity hover:opacity-90">
            <Image
              src={item.imageUrl}
              alt={`${item.symbol} ${item.setupName} ${item.screenshotType}`}
              width={1200}
              height={800}
              unoptimized
              className={cn(
                'w-full',
                layout === 'compact' ? 'h-40 object-cover' : layout === 'grid' ? 'h-56 object-cover' : 'h-auto object-cover'
              )}
            />
          </div>
        </ScreenshotViewer>

        <div className={cn('space-y-3', layout === 'compact' ? 'p-3' : 'p-4')}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{item.screenshotType}</Badge>
            <Badge variant="secondary">{item.tradeType}</Badge>
          </div>

          <div>
            <p className={cn('font-semibold text-foreground', layout === 'compact' ? 'text-sm' : 'text-base')}>{item.setupName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.symbol} • {item.date}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => openTradeInLog(item.tradeId)}
          >
            Open In Trade Log
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 min-h-screen p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <Card className="bg-card border-border">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl lg:text-3xl">
                <LayoutGrid className="h-6 w-6 text-primary" />
                Screenshot Gallery
              </CardTitle>
              <CardDescription className="mt-2 text-xs sm:text-sm">
                Browse all saved trade screenshots in a grid and grouped by setup name.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Saved Screenshots</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{filteredScreenshots.length}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['All', 'Before Trade', 'After Exit'] as ScreenshotFilter[]).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={filter === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {DAY_FILTER_OPTIONS.map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={dayFilter === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDayFilter(option)}
                  >
                    {option === 'All Days' ? option : option.slice(0, 3)}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {(['grid', 'masonry', 'compact'] as GalleryLayout[]).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={layout === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLayout(option)}
                    className="capitalize"
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by setup, symbol, date, or trade type"
              className="w-full rounded-lg border border-border bg-input py-2 pl-10 pr-3 text-sm text-foreground outline-none transition-colors focus:ring-2 focus:ring-primary"
            />
          </div>

          {filteredScreenshots.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No screenshots yet</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Add before-trade or after-exit screenshots while logging trades, or adjust your current filters and search.
              </p>
            </div>
          ) : (
            setupGroups.map(([setupName, items]) => (
              <section key={setupName} className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{setupName}</h2>
                    <p className="text-sm text-muted-foreground">{items.length} screenshot{items.length === 1 ? '' : 's'}</p>
                  </div>
                </div>

                <div
                  className={cn(
                    layout === 'masonry'
                      ? 'columns-1 gap-4 sm:columns-2 xl:columns-3'
                      : layout === 'compact'
                      ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'
                      : 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'
                  )}
                >
                  {items.map(renderScreenshotCard)}
                </div>
              </section>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
