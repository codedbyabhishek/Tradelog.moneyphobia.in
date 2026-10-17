import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDhanStatus } from '@/lib/server/dhan';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Dhan live status', () => {
  it('returns available and withdrawable balances without treating them as the same value', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const payload = url.endsWith('/holdings')
        ? []
        : url.endsWith('/positions')
          ? [{ netQty: 2 }]
          : { availabelBalance: '12500.50', withdrawableBalance: '9000.25' };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const status = await getDhanStatus({
      clientId: 'client-id',
      accessToken: 'access-token',
      updatedAt: '2026-10-17T00:00:00.000Z',
    });

    expect(status.availableBalance).toBe(12500.5);
    expect(status.withdrawableBalance).toBe(9000.25);
    expect(status.openPositionCount).toBe(1);
  });

  it('rejects a fund-limit response without available balance instead of converting it to zero', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const payload = url.endsWith('/holdings') || url.endsWith('/positions') ? [] : {};
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      getDhanStatus({
        clientId: 'client-id',
        accessToken: 'access-token',
        updatedAt: '2026-10-17T00:00:00.000Z',
      }),
    ).rejects.toThrow('Dhan returned no available balance.');
  });
});
