'use client';

import type { RefObject } from 'react';
import { Trade } from '@/lib/types';
import { CURRENCY_SYMBOLS, formatCurrency } from '@/lib/trade-utils';
import { formatDisplayDate, getTradeShareLayout, TradeShareLayout } from '@/lib/share-card';

type TradeShareCardIncludeOptions = {
  pnlAmount: boolean;
  entryExitPrices: boolean;
  instrumentName: boolean;
  username: boolean;
};

interface TradeShareCardPreviewProps {
  trade: Trade;
  layout: TradeShareLayout;
  username: string;
  include: TradeShareCardIncludeOptions;
  previewRef: RefObject<HTMLDivElement | null>;
}

export default function TradeShareCardPreview({
  trade,
  layout,
  username,
  include,
  previewRef,
}: TradeShareCardPreviewProps) {
  const cardLayout = getTradeShareLayout(layout);
  const previewScale = Math.min(420 / cardLayout.width, 1);
  const mainContentTop = layout === 'story' ? 610 : layout === 'post' ? 330 : 300;
  const isProfit = trade.pnl >= 0;

  return (
    <div className="flex justify-center overflow-auto rounded-2xl border border-border/60 bg-black/20 p-4">
      <div
        style={{
          width: `${cardLayout.width * previewScale}px`,
          height: `${cardLayout.height * previewScale}px`,
        }}
      >
        <div
          style={{
            width: `${cardLayout.width}px`,
            height: `${cardLayout.height}px`,
            transform: `scale(${previewScale})`,
            transformOrigin: 'top left',
          }}
        >
          <div
            ref={previewRef}
            className="relative h-full w-full overflow-hidden bg-[#020d1d] font-sans text-white"
            style={{
              backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.13) 1px, transparent 1px), radial-gradient(circle at 20% 0%, rgba(14, 116, 255, 0.22), transparent 34%)',
              backgroundSize: '72px 72px, 72px 72px, auto',
            }}
          >
            <div
              className="absolute right-[-80px] top-[130px] h-[520px] w-[600px] opacity-90"
              style={{
                background: isProfit
                  ? 'linear-gradient(135deg, rgba(33, 126, 255, 0.88), rgba(25, 76, 188, 0.35))'
                  : 'linear-gradient(135deg, rgba(244, 63, 94, 0.82), rgba(159, 18, 57, 0.3))',
                clipPath: 'polygon(0 0, 84% 0, 84% 66%, 58% 47%, 39% 82%, 15% 46%, 0 47%)',
              }}
            />
            <div
              className="absolute right-[88px] top-[218px] h-[300px] w-[300px] opacity-75"
              style={{
                background: isProfit ? '#2f80ed' : '#e11d48',
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 63% 70%, 41% 100%, 0 62%, 37% 62%)',
              }}
            />

            <div className="absolute left-[88px] top-[82px] flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-300 to-blue-600 text-3xl font-black italic text-slate-950">TL</div>
              <div>
                <p className="text-3xl font-bold tracking-tight">Traderlogify</p>
                <p className="mt-1 text-sm font-medium text-slate-300">Track trades. Analyze patterns. Improve execution.</p>
              </div>
            </div>

            <div className="absolute left-[88px]" style={{ top: `${mainContentTop}px` }}>
              <p className="text-4xl font-medium tracking-tight">Trade P&amp;L</p>
              {include.instrumentName ? (
                <p className="mt-4 text-xl font-semibold text-slate-200">
                  <span className={trade.position === 'Buy' ? 'text-emerald-400' : 'text-rose-400'}>{trade.position}</span>
                  <span className="mx-3 text-slate-500">|</span>
                  <span>{trade.quantity} {trade.quantity === 1 ? 'Lot' : 'Lots'}</span>
                  <span className="mx-3 text-slate-500">|</span>
                  <span>{trade.symbol}</span>
                </p>
              ) : null}
              {include.pnlAmount ? (
                <p className={`mt-12 text-[90px] font-black leading-none tracking-[-0.06em] ${isProfit ? 'text-blue-400' : 'text-rose-400'}`}>
                  {isProfit ? '+' : ''}{formatCurrency(trade.pnl, trade.currency)}
                </p>
              ) : null}
              {include.entryExitPrices ? (
                <div className="mt-14 grid grid-cols-2 gap-24 text-slate-200">
                  <div>
                    <p className="text-lg text-slate-400">Entry Price</p>
                    <p className="mt-2 text-3xl font-bold">{trade.entryPrice ? `${CURRENCY_SYMBOLS[trade.currency] || ''}${trade.entryPrice.toFixed(2)}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-lg text-slate-400">Exit Price</p>
                    <p className="mt-2 text-3xl font-bold">{trade.exitPrice ? `${CURRENCY_SYMBOLS[trade.currency] || ''}${trade.exitPrice.toFixed(2)}` : 'N/A'}</p>
                  </div>
                </div>
              ) : null}
            </div>

            {include.username && username.trim() ? (
              <div className="absolute bottom-[78px] left-[88px] flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-slate-700 text-xl font-semibold">
                  {username.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xl font-semibold">{username.trim()}</p>
                  <p className="mt-1 text-sm text-slate-400">{formatDisplayDate(trade.date)} · {trade.setupName}</p>
                </div>
              </div>
            ) : null}
            <p className="absolute bottom-[78px] right-[88px] text-4xl font-black italic tracking-[-0.08em] text-white">TL</p>
          </div>
        </div>
      </div>
    </div>
  );
}
