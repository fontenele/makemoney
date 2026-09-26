import { describe, expect, it, vi } from 'vitest';
import { loadDashboard } from './api';

describe('loadDashboard', () => {
  it('loads every read-only resource independently', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      const body = path.endsWith('/health')
        ? { status: 'ok', services: { api: 'up', postgres: 'up', redis: 'up' } }
        : path.endsWith('/valuation')
          ? { totalValue: '1025.5' }
          : path.endsWith('/position')
            ? { symbol: 'BTC/USDT', totalPnl: '25.5' }
            : { symbol: 'BTC/USDT', executionCount: 4 };
      return Promise.resolve(Response.json(body));
    });

    const snapshot = await loadDashboard(request);

    expect(request).toHaveBeenCalledTimes(4);
    expect(snapshot.health.status).toBe('available');
    expect(snapshot.valuation).toMatchObject({
      status: 'available',
      data: { totalValue: '1025.5' },
    });
    expect(snapshot.position.status).toBe('available');
    expect(snapshot.performance.status).toBe('available');
  });

  it('keeps healthy resources visible when another endpoint is unavailable', async () => {
    const request = vi.fn((input: string | URL | Request) => {
      const path = input.toString();
      if (path.endsWith('/valuation')) {
        return Promise.resolve(new Response(null, { status: 503 }));
      }
      return Promise.resolve(Response.json({ status: 'ok' }));
    });

    const snapshot = await loadDashboard(request);

    expect(snapshot.valuation).toEqual({
      status: 'unavailable',
      message: 'Unavailable (503)',
    });
    expect(snapshot.health.status).toBe('available');
    expect(snapshot.position.status).toBe('available');
    expect(snapshot.performance.status).toBe('available');
  });

  it('reports an unreachable local API without rejecting the refresh', async () => {
    const request = vi.fn(() => Promise.reject(new Error('offline')));

    const snapshot = await loadDashboard(request);

    expect(snapshot.health).toEqual({
      status: 'unavailable',
      message: 'Local API is unreachable',
    });
    expect(snapshot.valuation.status).toBe('unavailable');
    expect(snapshot.position.status).toBe('unavailable');
    expect(snapshot.performance.status).toBe('unavailable');
  });
});
