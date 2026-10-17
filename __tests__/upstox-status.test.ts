import { afterEach, describe, expect, it, vi } from 'vitest';
import { getUpstoxStatus } from '@/lib/server/upstox';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Upstox live status', () => {
  it('returns all reported fund segments with the documented API version header', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const payload = url.includes('get-funds-and-margin')
        ? {
            status: 'success',
            data: {
              equity: { available_margin: 12500, used_margin: 2500, notional_cash: 15000 },
              commodity: { available_margin: 5000, used_margin: 1000 },
            },
          }
        : { status: 'success', data: [{ trade_id: 'trade-1' }] };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const status = await getUpstoxStatus({
      clientId: 'client-id',
      accessToken: 'access-token',
      updatedAt: '2026-10-17T00:00:00.000Z',
    });

    expect(status.todayTrades).toBe(1);
    expect(status.funds.equity).toEqual({
      available_margin: 12500,
      used_margin: 2500,
      notional_cash: 15000,
    });
    expect(status.funds.commodity.available_margin).toBe(5000);

    const fundRequest = fetchMock.mock.calls.find(([input]) => String(input).includes('get-funds-and-margin'));
    expect(new Headers(fundRequest?.[1]?.headers).get('Api-Version')).toBe('2.0');
    expect(new Headers(fundRequest?.[1]?.headers).get('Authorization')).toBe('Bearer access-token');
  });

  it('rejects a response with no fund data instead of reporting a false empty balance', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const payload = String(input).includes('get-funds-and-margin')
        ? { status: 'success' }
        : { status: 'success', data: [] };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getUpstoxStatus({
        clientId: 'client-id',
        accessToken: 'access-token',
        updatedAt: '2026-10-17T00:00:00.000Z',
      }),
    ).rejects.toThrow('Upstox returned no fund and margin data.');
  });
});
