import { PredictionMarketLastTradeContextIncoherentError } from '../domain/prediction-market-last-trade-context';
import type { PredictionMarketLastTradeObservation } from '../domain/prediction-market-last-trade';
import type { PredictionMarketTopOfBook } from '../domain/prediction-market-top-of-book';
import { PredictionMarketLastTradeContextService } from './prediction-market-last-trade-context.service';
import { PredictionMarketLastTradeService } from './prediction-market-last-trade.service';
import { PredictionMarketOrderBookService } from './prediction-market-order-book.service';

describe('PredictionMarketLastTradeContextService', () => {
  it.each([
    ['0.39', 'below_bid', '-0.01', '0.21'],
    ['0.40', 'at_bid', '0', '0.2'],
    ['0.50', 'inside_spread', '0.1', '0.1'],
    ['0.60', 'at_ask', '0.2', '0'],
    ['0.61', 'above_ask', '0.21', '-0.01'],
  ] as const)(
    'classifies price %s as %s with exact signed distances',
    async (price, position, priceMinusBid, askMinusPrice) => {
      const service = createService(
        () => Promise.resolve({ ...lastTrade(), price }),
        () => Promise.resolve(topOfBook()),
      );

      await expect(service.getContext('111')).resolves.toMatchObject({
        relation: {
          status: 'comparable',
          position,
          priceMinusBid,
          askMinusPrice,
          reason: null,
        },
        atomicSnapshot: false,
        executable: false,
      });
    },
  );

  it('classifies a locked book without arbitrarily choosing one side', async () => {
    const service = createService(
      () => Promise.resolve({ ...lastTrade(), price: '0.4' }),
      () =>
        Promise.resolve({
          ...topOfBook(),
          ask: { price: '0.4', quantity: '12' },
          spread: '0',
        }),
    );

    await expect(service.getContext('111')).resolves.toMatchObject({
      relation: { position: 'at_bid_and_ask' },
    });
  });

  it.each([
    [null, null, 'missing_bid_and_ask'],
    [null, { price: '0.6', quantity: '12' }, 'missing_bid'],
    [{ price: '0.4', quantity: '10' }, null, 'missing_ask'],
  ] as const)(
    'marks incomplete book liquidity as unverifiable',
    async (bid, ask, reason) => {
      const service = createService(
        () => Promise.resolve(lastTrade()),
        () => Promise.resolve({ ...topOfBook(), bid, ask, spread: null }),
      );

      await expect(service.getContext('111')).resolves.toMatchObject({
        relation: {
          status: 'unverifiable',
          position: null,
          priceMinusBid: null,
          askMinusPrice: null,
          reason,
        },
      });
    },
  );

  it('loads both independent observations concurrently', async () => {
    const calls: string[] = [];
    let releaseTrade: (() => void) | undefined;
    const tradeGate = new Promise<void>((resolve) => {
      releaseTrade = resolve;
    });
    const service = createService(
      async () => {
        calls.push('trade-started');
        await tradeGate;
        return lastTrade();
      },
      () => {
        calls.push('book-started');
        releaseTrade?.();
        return Promise.resolve(topOfBook());
      },
    );

    await service.getContext('111');
    expect(calls).toEqual(['trade-started', 'book-started']);
  });

  it('rejects a component identity mismatch', async () => {
    const service = createService(
      () => Promise.resolve({ ...lastTrade(), tokenId: '222' }),
      () => Promise.resolve(topOfBook()),
    );

    await expect(service.getContext('111')).rejects.toBeInstanceOf(
      PredictionMarketLastTradeContextIncoherentError,
    );
  });
});

function createService(
  getLastTrade: () => Promise<PredictionMarketLastTradeObservation>,
  getTopOfBook: () => Promise<PredictionMarketTopOfBook>,
): PredictionMarketLastTradeContextService {
  return new PredictionMarketLastTradeContextService(
    new PredictionMarketLastTradeService({ getLastTrade }),
    new PredictionMarketOrderBookService({ getTopOfBook }),
  );
}

function lastTrade(): PredictionMarketLastTradeObservation {
  return {
    provider: 'polymarket',
    tokenId: '111',
    price: '0.5',
    side: 'buy',
    source: 'clob-last-trade',
    executable: false,
    providerTimestamp: null,
    receivedAt: new Date('2026-09-27T13:00:00.000Z'),
  };
}

function topOfBook(): PredictionMarketTopOfBook {
  return {
    provider: 'polymarket',
    tokenId: '111',
    conditionId: '0xcondition',
    snapshotHash: '0xhash',
    bid: { price: '0.4', quantity: '10' },
    ask: { price: '0.6', quantity: '12' },
    spread: '0.2',
    source: 'clob-order-book',
    executable: false,
    providerTimestamp: '1788364800000',
    receivedAt: new Date('2026-09-27T13:00:00.010Z'),
  };
}
