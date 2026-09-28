import { PredictionMarketPriceChangeIncoherentError } from '../domain/prediction-market-price-change';
import { PredictionMarketHistoricalPriceObservation } from '../domain/prediction-market-price-history';
import { PredictionMarketPriceChangeService } from './prediction-market-price-change.service';
import { PredictionMarketPriceHistoryService } from './prediction-market-price-history.service';

describe('PredictionMarketPriceChangeService', () => {
  it.each([
    ['0.2', '0.35', '0.15', 'up'],
    ['0.35', '0.2', '-0.15', 'down'],
    ['0.2', '0.2', '0', 'unchanged'],
  ] as const)(
    'calculates the exact change from %s to %s',
    async (fromPrice, toPrice, priceChange, direction) => {
      const service = createService((tokenId, at) =>
        Promise.resolve(
          observation(
            tokenId,
            at,
            at.getTime() === requestedFrom().getTime() ? fromPrice : toPrice,
          ),
        ),
      );

      await expect(
        service.getPriceChange('111', requestedFrom(), requestedTo()),
      ).resolves.toMatchObject({
        tokenId: '111',
        priceChange,
        direction,
        sameObservedTimestamp: false,
        sameResolution: true,
        executable: false,
      });
    },
  );

  it('preserves both observations and exposes timestamp and resolution alignment', async () => {
    const service = createService((tokenId, at) =>
      Promise.resolve({
        ...observation(tokenId, at, '0.5'),
        observedAt: new Date('2026-09-27T00:04:00Z'),
        resolutionSeconds:
          at.getTime() === requestedFrom().getTime() ? 60 : 300,
      }),
    );

    await expect(
      service.getPriceChange('111', requestedFrom(), requestedTo()),
    ).resolves.toMatchObject({
      observations: {
        from: { requestedAt: requestedFrom(), price: '0.5' },
        to: { requestedAt: requestedTo(), price: '0.5' },
      },
      sameObservedTimestamp: true,
      sameResolution: false,
    });
  });

  it('loads both point-in-time observations concurrently', async () => {
    const calls: Date[] = [];
    let releaseFrom: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseFrom = resolve;
    });
    const service = createService(async (tokenId, at) => {
      calls.push(at);
      if (at.getTime() === requestedFrom().getTime()) await gate;
      else releaseFrom?.();
      return observation(tokenId, at, '0.5');
    });

    await service.getPriceChange('111', requestedFrom(), requestedTo());
    expect(calls).toEqual([requestedFrom(), requestedTo()]);
  });

  it.each(['token', 'requested-from', 'requested-to', 'observed-order'])(
    'rejects incoherent %s responses',
    async (divergence) => {
      const service = createService((tokenId, at) => {
        const result = observation(tokenId, at, '0.5');
        if (at.getTime() === requestedFrom().getTime()) {
          if (divergence === 'token') result.tokenId = '222';
          if (divergence === 'requested-from') {
            result.requestedAt = requestedTo();
          }
          if (divergence === 'observed-order') {
            result.observedAt = new Date('2026-09-27T00:09:00Z');
          }
        } else if (divergence === 'requested-to') {
          result.requestedAt = requestedFrom();
        }
        return Promise.resolve(result);
      });

      await expect(
        service.getPriceChange('111', requestedFrom(), requestedTo()),
      ).rejects.toBeInstanceOf(PredictionMarketPriceChangeIncoherentError);
    },
  );
});

function createService(
  getPriceAt: (
    tokenId: string,
    at: Date,
  ) => Promise<PredictionMarketHistoricalPriceObservation>,
): PredictionMarketPriceChangeService {
  return new PredictionMarketPriceChangeService(
    new PredictionMarketPriceHistoryService({
      getPriceHistory: () =>
        Promise.reject(new Error('unexpected history call')),
      getPriceAt,
    }),
  );
}

function requestedFrom(): Date {
  return new Date('2026-09-27T00:05:00Z');
}

function requestedTo(): Date {
  return new Date('2026-09-27T00:07:00Z');
}

function observation(
  tokenId: string,
  requestedAt: Date,
  price: string,
): PredictionMarketHistoricalPriceObservation {
  return {
    provider: 'polymarket',
    tokenId,
    requestedAt,
    observedAt: new Date(
      requestedAt.getTime() === requestedFrom().getTime()
        ? '2026-09-27T00:03:00Z'
        : '2026-09-27T00:06:00Z',
    ),
    price,
    resolutionSeconds: 60,
    exactTimestamp: false,
    source: 'data-api-price-history',
    receivedAt: new Date('2026-09-28T10:00:00Z'),
    executable: false,
  };
}
