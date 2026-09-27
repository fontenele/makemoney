import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PredictionMarketDiscoveryService } from '../application/prediction-market-discovery.service';
import { PredictionEventService } from '../application/prediction-event.service';
import { PredictionMarketBinaryResolutionService } from '../application/prediction-market-binary-resolution.service';
import { PredictionMarketDataObservationService } from '../application/prediction-market-data-observation.service';
import { PredictionMarketLastTradeService } from '../application/prediction-market-last-trade.service';
import { PredictionMarketLastTradeContextService } from '../application/prediction-market-last-trade-context.service';
import { PredictionMarketMidpointComplementService } from '../application/prediction-market-midpoint-complement.service';
import { PredictionMarketOrderBookService } from '../application/prediction-market-order-book.service';
import { PredictionMarketPricingService } from '../application/prediction-market-pricing.service';
import { PredictionMarketResolutionService } from '../application/prediction-market-resolution.service';
import {
  PredictionMarketBinaryResolutionIncoherentError,
  PredictionMarketBinaryResolutionUnavailableError,
} from '../domain/prediction-market-binary-resolution';
import {
  PredictionMarketLastTradeProvider,
  PredictionMarketLastTradeUnavailableError,
} from '../domain/prediction-market-last-trade';
import {
  PredictionMarketMidpointProvider,
  PredictionMarketMidpointUnavailableError,
} from '../domain/prediction-market-midpoint';
import {
  PredictionMarketOrderBookProvider,
  PredictionMarketOrderBookUnavailableError,
} from '../domain/prediction-market-top-of-book';
import {
  PredictionMarketResolutionProvider,
  PredictionMarketResolutionUnavailableError,
} from '../domain/prediction-market-resolution';
import {
  PredictionMarketNotFoundError,
  PredictionMarketProvider,
} from '../domain/prediction-market';
import {
  PredictionEventNotFoundError,
  PredictionEventProvider,
} from '../domain/prediction-event';
import { PolymarketController } from './polymarket.controller';

describe('PolymarketController', () => {
  it('loads the default bounded active-event page', async () => {
    const calls: unknown[] = [];
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {
        listActive: (query) => {
          calls.push(query);
          return Promise.resolve({
            events: [],
            nextCursor: null,
            receivedAt: new Date('2026-09-27T20:00:00.000Z'),
          });
        },
      },
    );

    await expect(controller.listActiveEvents()).resolves.toMatchObject({
      events: [],
    });
    expect(calls).toEqual([{ limit: 20 }]);
  });

  it('passes a validated limit and opaque cursor for event discovery', async () => {
    const calls: unknown[] = [];
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {
        listActive: (query) => {
          calls.push(query);
          return Promise.resolve({
            events: [],
            nextCursor: null,
            receivedAt: new Date('2026-09-27T20:00:00.000Z'),
          });
        },
      },
    );

    await controller.listActiveEvents('100', 'page_2-cursor');
    expect(calls).toEqual([{ limit: 100, afterCursor: 'page_2-cursor' }]);
  });

  it.each(['0', '-1', '1.5', 'abc', '101'])(
    'rejects invalid event-discovery limit %s',
    async (limit) => {
      await expect(controllerWith({}).listActiveEvents(limit)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('maps event-discovery provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {
        listActive: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.listActiveEvents()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads the default bounded active-market page', async () => {
    const calls: unknown[] = [];
    const controller = controllerWith({
      listActive: (query) => {
        calls.push(query);
        return Promise.resolve({
          markets: [],
          nextCursor: null,
          receivedAt: new Date('2026-09-26T12:00:00.000Z'),
        });
      },
    });

    await expect(controller.listActiveMarkets()).resolves.toMatchObject({
      markets: [],
    });
    expect(calls).toEqual([{ limit: 20 }]);
  });

  it('passes a validated limit and opaque keyset cursor', async () => {
    const calls: unknown[] = [];
    const controller = controllerWith({
      listActive: (query) => {
        calls.push(query);
        return Promise.resolve({
          markets: [],
          nextCursor: null,
          receivedAt: new Date('2026-09-26T12:00:00.000Z'),
        });
      },
    });

    await controller.listActiveMarkets('100', 'page_2-cursor');
    expect(calls).toEqual([{ limit: 100, afterCursor: 'page_2-cursor' }]);
  });

  it.each(['0', '-1', '1.5', 'abc', '101'])(
    'rejects invalid limit %s',
    async (limit) => {
      await expect(
        controllerWith(unusedProvider()).listActiveMarkets(limit),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it.each(['', 'contains space', 'line\nbreak'])(
    'rejects invalid cursor %s',
    async (cursor) => {
      await expect(
        controllerWith(unusedProvider()).listActiveMarkets(undefined, cursor),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps provider failure to service unavailable', async () => {
    const controller = controllerWith({
      listActive: () => Promise.reject(new Error('network unavailable')),
    });

    await expect(controller.listActiveMarkets()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads one selected event with lifecycle and market references', async () => {
    const calls: string[] = [];
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {
        getById: (id) => {
          calls.push(id);
          return Promise.resolve(eventDetails());
        },
      },
    );

    await expect(controller.getEvent('1000')).resolves.toEqual(eventDetails());
    expect(calls).toEqual(['1000']);
  });

  it.each(['', '0', '-1', '1.5', 'abc'])(
    'rejects invalid event id %s',
    async (id) => {
      await expect(controllerWith({}).getEvent(id)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('maps an absent selected event to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {
        getById: () => Promise.reject(new PredictionEventNotFoundError('1000')),
      },
    );

    await expect(controller.getEvent('1000')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps selected-event provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {
        getById: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.getEvent('1000')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads bounded taxonomy for one selected event', async () => {
    const calls: string[] = [];
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {
        getTagsById: (id) => {
          calls.push(id);
          return Promise.resolve(eventTags());
        },
      },
    );

    await expect(controller.getEventTags('1000')).resolves.toEqual(eventTags());
    expect(calls).toEqual(['1000']);
  });

  it.each(['', '0', '-1', '1.5', 'abc'])(
    'rejects invalid event-tag event id %s',
    async (id) => {
      await expect(controllerWith({}).getEventTags(id)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('maps absent event taxonomy to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {
        getTagsById: () =>
          Promise.reject(new PredictionEventNotFoundError('1000')),
      },
    );

    await expect(controller.getEventTags('1000')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps event-taxonomy provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {
        getTagsById: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.getEventTags('1000')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads one selected market with YES and NO token identities', async () => {
    const calls: string[] = [];
    const controller = controllerWith({
      getById: (id) => {
        calls.push(id);
        return Promise.resolve(marketDetails());
      },
    });

    await expect(controller.getMarket('703257')).resolves.toEqual(
      marketDetails(),
    );
    expect(calls).toEqual(['703257']);
  });

  it.each(['', '0', '-1', '1.5', 'abc'])(
    'rejects invalid market id %s',
    async (id) => {
      await expect(controllerWith({}).getMarket(id)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('maps an absent selected market to not found', async () => {
    const controller = controllerWith({
      getById: (id) => Promise.reject(new PredictionMarketNotFoundError(id)),
    });

    await expect(controller.getMarket('703257')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps selected-market provider failure to service unavailable', async () => {
    const controller = controllerWith({
      getById: () => Promise.reject(new Error('network unavailable')),
    });

    await expect(controller.getMarket('703257')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads bounded taxonomy for one selected market', async () => {
    const calls: string[] = [];
    const controller = controllerWith({
      getTagsById: (id) => {
        calls.push(id);
        return Promise.resolve(marketTags());
      },
    });

    await expect(controller.getMarketTags('703257')).resolves.toEqual(
      marketTags(),
    );
    expect(calls).toEqual(['703257']);
  });

  it.each(['', '0', '-1', '1.5', 'abc'])(
    'rejects invalid market-tag market id %s',
    async (id) => {
      await expect(controllerWith({}).getMarketTags(id)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('maps absent market taxonomy to not found', async () => {
    const controller = controllerWith({
      getTagsById: () =>
        Promise.reject(new PredictionMarketNotFoundError('703257')),
    });

    await expect(controller.getMarketTags('703257')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps market-taxonomy provider failure to service unavailable', async () => {
    const controller = controllerWith({
      getTagsById: () => Promise.reject(new Error('network unavailable')),
    });

    await expect(controller.getMarketTags('703257')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads one exact non-executable outcome midpoint', async () => {
    const calls: string[] = [];
    const controller = controllerWith(
      {},
      {
        getMidpoint: (tokenId) => {
          calls.push(tokenId);
          return Promise.resolve(midpoint());
        },
      },
    );

    await expect(controller.getOutcomeMidpoint('111')).resolves.toEqual(
      midpoint(),
    );
    expect(calls).toEqual(['111']);
  });

  it.each(['', '01', '-1', '1.5', 'abc', '1'.repeat(79)])(
    'rejects invalid midpoint token id %s',
    async (tokenId) => {
      await expect(
        controllerWith({}).getOutcomeMidpoint(tokenId),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps an unavailable midpoint to not found', async () => {
    const controller = controllerWith(
      {},
      {
        getMidpoint: (tokenId) =>
          Promise.reject(new PredictionMarketMidpointUnavailableError(tokenId)),
      },
    );

    await expect(controller.getOutcomeMidpoint('111')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps midpoint provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {
        getMidpoint: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.getOutcomeMidpoint('111')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads one exact non-executable outcome top of book', async () => {
    const calls: string[] = [];
    const controller = controllerWith(
      {},
      {},
      {
        getTopOfBook: (tokenId) => {
          calls.push(tokenId);
          return Promise.resolve(topOfBook());
        },
      },
    );

    await expect(controller.getOutcomeTopOfBook('111')).resolves.toEqual(
      topOfBook(),
    );
    expect(calls).toEqual(['111']);
  });

  it.each(['', '01', '-1', '1.5', 'abc', '1'.repeat(79)])(
    'rejects invalid order-book token id %s',
    async (tokenId) => {
      await expect(
        controllerWith({}).getOutcomeTopOfBook(tokenId),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps an unavailable order book to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {
        getTopOfBook: (tokenId) =>
          Promise.reject(
            new PredictionMarketOrderBookUnavailableError(tokenId),
          ),
      },
    );

    await expect(controller.getOutcomeTopOfBook('111')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps order-book provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {
        getTopOfBook: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.getOutcomeTopOfBook('111')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads independently normalized coherent outcome market data', async () => {
    const controller = controllerWith(
      {},
      {
        getMidpoint: () => Promise.resolve({ ...midpoint(), price: '0.455' }),
      },
      { getTopOfBook: () => Promise.resolve(topOfBook()) },
    );

    await expect(controller.getOutcomeMarketData('111')).resolves.toMatchObject(
      {
        tokenId: '111',
        coherence: {
          status: 'verified',
          bookMidpoint: '0.455',
          reason: null,
        },
        executable: false,
      },
    );
  });

  it.each(['', '01', '-1', '1.5', 'abc', '1'.repeat(79)])(
    'rejects invalid market-data token id %s',
    async (tokenId) => {
      await expect(
        controllerWith({}).getOutcomeMarketData(tokenId),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps an unavailable component observation to not found', async () => {
    const controller = controllerWith(
      {},
      {
        getMidpoint: (tokenId) =>
          Promise.reject(new PredictionMarketMidpointUnavailableError(tokenId)),
      },
      { getTopOfBook: () => Promise.resolve(topOfBook()) },
    );

    await expect(controller.getOutcomeMarketData('111')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps incoherent component observations to service unavailable', async () => {
    const controller = controllerWith(
      {},
      { getMidpoint: () => Promise.resolve(midpoint()) },
      { getTopOfBook: () => Promise.resolve(topOfBook()) },
    );

    await expect(controller.getOutcomeMarketData('111')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads one exact non-executable outcome last trade', async () => {
    const calls: string[] = [];
    const controller = controllerWith(
      {},
      {},
      {},
      {
        getLastTrade: (tokenId) => {
          calls.push(tokenId);
          return Promise.resolve(lastTrade());
        },
      },
    );

    await expect(controller.getOutcomeLastTrade('111')).resolves.toEqual(
      lastTrade(),
    );
    expect(calls).toEqual(['111']);
  });

  it.each(['', '01', '-1', '1.5', 'abc', '1'.repeat(79)])(
    'rejects invalid last-trade token id %s',
    async (tokenId) => {
      await expect(
        controllerWith({}).getOutcomeLastTrade(tokenId),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps an unavailable last trade to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {
        getLastTrade: (tokenId) =>
          Promise.reject(
            new PredictionMarketLastTradeUnavailableError(tokenId),
          ),
      },
    );

    await expect(controller.getOutcomeLastTrade('111')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps last-trade provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {
        getLastTrade: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.getOutcomeLastTrade('111')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads descriptive last-trade context without atomicity claims', async () => {
    const controller = controllerWith(
      {},
      {},
      { getTopOfBook: () => Promise.resolve(topOfBook()) },
      { getLastTrade: () => Promise.resolve(lastTrade()) },
    );

    await expect(
      controller.getOutcomeLastTradeContext('111'),
    ).resolves.toMatchObject({
      tokenId: '111',
      relation: {
        status: 'comparable',
        position: 'below_bid',
        priceMinusBid: '-0.01',
        askMinusPrice: '0.02',
      },
      atomicSnapshot: false,
      executable: false,
    });
  });

  it.each(['', '01', '-1', '1.5', 'abc', '1'.repeat(79)])(
    'rejects invalid last-trade-context token id %s',
    async (tokenId) => {
      await expect(
        controllerWith({}).getOutcomeLastTradeContext(tokenId),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps unavailable last-trade context components to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      { getTopOfBook: () => Promise.resolve(topOfBook()) },
      {
        getLastTrade: (tokenId) =>
          Promise.reject(
            new PredictionMarketLastTradeUnavailableError(tokenId),
          ),
      },
    );

    await expect(controller.getOutcomeLastTradeContext('111')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps incoherent last-trade context to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      { getTopOfBook: () => Promise.resolve(topOfBook()) },
      {
        getLastTrade: () => Promise.resolve({ ...lastTrade(), tokenId: '222' }),
      },
    );

    await expect(controller.getOutcomeLastTradeContext('111')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads a descriptive binary-market midpoint complement', async () => {
    const controller = controllerWith(
      { getById: () => Promise.resolve(marketDetails()) },
      {
        getMidpoint: (tokenId) =>
          Promise.resolve({
            ...midpoint(),
            tokenId,
            price: tokenId === '111' ? '0.4' : '0.59',
          }),
      },
    );

    await expect(
      controller.getMarketMidpointComplement('703257'),
    ).resolves.toMatchObject({
      midpointSum: '0.99',
      deviationFromOne: '-0.01',
      status: 'below_one',
      atomicSnapshot: false,
      executable: false,
    });
  });

  it.each(['', '0', '-1', '1.5', 'abc'])(
    'rejects invalid midpoint-complement market id %s',
    async (id) => {
      await expect(
        controllerWith({}).getMarketMidpointComplement(id),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps incomplete outcome-token identities to not found', async () => {
    const details = marketDetails();
    const controller = controllerWith({
      getById: () =>
        Promise.resolve({
          ...details,
          outcomes: {
            ...details.outcomes,
            no: { ...details.outcomes.no, tokenId: null },
          },
        }),
    });

    await expect(
      controller.getMarketMidpointComplement('703257'),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps duplicate outcome-token identities to service unavailable', async () => {
    const details = marketDetails();
    const controller = controllerWith({
      getById: () =>
        Promise.resolve({
          ...details,
          outcomes: {
            ...details.outcomes,
            no: { ...details.outcomes.no, tokenId: '111' },
          },
        }),
    });

    await expect(
      controller.getMarketMidpointComplement('703257'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('loads one public condition resolution state', async () => {
    const calls: string[] = [];
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {
        getResolution: (condition) => {
          calls.push(condition);
          return Promise.resolve(resolutionRecord());
        },
      },
    );

    await expect(
      controller.getConditionResolution(conditionId()),
    ).resolves.toEqual(resolution());
    expect(calls).toEqual([conditionId()]);
  });

  it.each(['', '0x1234', `0x${'g'.repeat(64)}`, 'a'.repeat(64)])(
    'rejects invalid condition id %s',
    async (condition) => {
      await expect(
        controllerWith({}).getConditionResolution(condition),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps an absent condition resolution to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {
        getResolution: () =>
          Promise.reject(
            new PredictionMarketResolutionUnavailableError(conditionId()),
          ),
      },
    );

    await expect(
      controller.getConditionResolution(conditionId()),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps resolution provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {
        getResolution: () => Promise.reject(new Error('provider unavailable')),
      },
    );

    await expect(
      controller.getConditionResolution(conditionId()),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('loads one indexed binary market resolution result', async () => {
    const details = marketDetails();
    const controller = controllerWith(
      { getById: () => Promise.resolve(details) },
      {},
      {},
      {},
      {
        getResolution: () =>
          Promise.resolve(resolutionRecord(['1', '0'], details.conditionId)),
      },
    );

    await expect(
      controller.getMarketResolution('703257'),
    ).resolves.toMatchObject({
      result: 'yes',
      payouts: {
        yes: { payoutRate: '1', status: 'winner', tokenId: '111' },
        no: { payoutRate: '0', status: 'loser', tokenId: '222' },
      },
      executable: false,
    });
  });

  it.each(['', '0', '-1', '1.5', 'abc'])(
    'rejects invalid resolution market id %s',
    async (id) => {
      await expect(controllerWith({}).getMarketResolution(id)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it.each([
    new PredictionMarketBinaryResolutionUnavailableError('703257'),
    new PredictionMarketResolutionUnavailableError(conditionId()),
    new PredictionMarketNotFoundError('703257'),
  ])('maps unavailable binary resolution to not found', async (error) => {
    const controller = controllerWith({
      getById: () => Promise.reject(error),
    });

    await expect(controller.getMarketResolution('703257')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps incoherent binary resolution to service unavailable', async () => {
    const controller = controllerWith({
      getById: () =>
        Promise.reject(
          new PredictionMarketBinaryResolutionIncoherentError('703257'),
        ),
    });

    await expect(controller.getMarketResolution('703257')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

function controllerWith(
  provider: Partial<PredictionMarketProvider>,
  midpointProvider: Partial<PredictionMarketMidpointProvider> = {},
  orderBookProvider: Partial<PredictionMarketOrderBookProvider> = {},
  lastTradeProvider: Partial<PredictionMarketLastTradeProvider> = {},
  resolutionProvider: Partial<PredictionMarketResolutionProvider> = {},
  eventProvider: Partial<PredictionEventProvider> = {},
): PolymarketController {
  const pricing = new PredictionMarketPricingService({
    getMidpoint:
      midpointProvider.getMidpoint ??
      (() => Promise.reject(new Error('unexpected midpoint call'))),
  });
  const orderBook = new PredictionMarketOrderBookService({
    getTopOfBook:
      orderBookProvider.getTopOfBook ??
      (() => Promise.reject(new Error('unexpected order-book call'))),
  });
  const discovery = new PredictionMarketDiscoveryService({
    listActive:
      provider.listActive ??
      (() => Promise.reject(new Error('unexpected list call'))),
    getById:
      provider.getById ??
      (() => Promise.reject(new Error('unexpected detail call'))),
    getTagsById:
      provider.getTagsById ??
      (() => Promise.reject(new Error('unexpected market tags call'))),
  });
  const lastTrade = new PredictionMarketLastTradeService({
    getLastTrade:
      lastTradeProvider.getLastTrade ??
      (() => Promise.reject(new Error('unexpected last-trade call'))),
  });
  const resolutionService = new PredictionMarketResolutionService({
    getResolution:
      resolutionProvider.getResolution ??
      (() => Promise.reject(new Error('unexpected resolution call'))),
  });
  const binaryResolution = new PredictionMarketBinaryResolutionService(
    discovery,
    resolutionService,
  );
  const events = new PredictionEventService({
    listActive:
      eventProvider.listActive ??
      (() => Promise.reject(new Error('unexpected event list call'))),
    getById:
      eventProvider.getById ??
      (() => Promise.reject(new Error('unexpected event call'))),
    getTagsById:
      eventProvider.getTagsById ??
      (() => Promise.reject(new Error('unexpected event tags call'))),
  });
  return new PolymarketController(
    events,
    discovery,
    binaryResolution,
    pricing,
    orderBook,
    new PredictionMarketDataObservationService(pricing, orderBook),
    lastTrade,
    new PredictionMarketLastTradeContextService(lastTrade, orderBook),
    new PredictionMarketMidpointComplementService(discovery, pricing),
    resolutionService,
  );
}

function unusedProvider(): Partial<PredictionMarketProvider> {
  return {};
}

function marketDetails() {
  return {
    provider: 'polymarket' as const,
    id: '703257',
    slug: 'will-example-happen',
    question: 'Will the example happen?',
    conditionId:
      '0x747dc809fb79e1b05be09c42d6179459a58de2ef3e40f02484a4e1260f741f75',
    outcomes: {
      yes: { label: 'Yes', tokenId: '111' },
      no: { label: 'No', tokenId: '222' },
    },
    receivedAt: new Date('2026-09-26T12:00:00.000Z'),
  };
}

function marketTags() {
  return {
    provider: 'polymarket' as const,
    marketId: '703257',
    tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
    receivedAt: new Date('2026-09-27T20:00:00.000Z'),
  };
}

function eventDetails() {
  return {
    provider: 'polymarket' as const,
    id: '1000',
    slug: 'example-event',
    title: 'Example event',
    description: 'An event grouping one market.',
    resolutionSource: 'Official source',
    startDate: '2026-09-01T00:00:00Z',
    endDate: '2026-12-31T23:59:59Z',
    active: true,
    closed: false,
    archived: false,
    restricted: false,
    markets: [
      {
        id: '703257',
        slug: 'will-example-happen',
        question: 'Will the example happen?',
        conditionId: conditionId(),
        closed: false,
      },
    ],
    receivedAt: new Date('2026-09-27T20:00:00.000Z'),
  };
}

function eventTags() {
  return {
    provider: 'polymarket' as const,
    eventId: '1000',
    tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
    receivedAt: new Date('2026-09-27T20:00:00.000Z'),
  };
}

function midpoint() {
  return {
    provider: 'polymarket' as const,
    tokenId: '111',
    price: '0.45',
    source: 'clob-midpoint' as const,
    executable: false as const,
    providerTimestamp: null,
    receivedAt: new Date('2026-09-26T18:00:00.000Z'),
  };
}

function topOfBook() {
  return {
    provider: 'polymarket' as const,
    tokenId: '111',
    conditionId: '0xcondition',
    snapshotHash: '0xhash',
    bid: { price: '0.45', quantity: '100' },
    ask: { price: '0.46', quantity: '150' },
    spread: '0.01',
    source: 'clob-order-book' as const,
    executable: false as const,
    providerTimestamp: '1758920000123',
    receivedAt: new Date('2026-09-26T20:00:00.000Z'),
  };
}

function lastTrade() {
  return {
    provider: 'polymarket' as const,
    tokenId: '111',
    price: '0.44',
    side: 'sell' as const,
    source: 'clob-last-trade' as const,
    executable: false as const,
    providerTimestamp: null,
    receivedAt: new Date('2026-09-27T12:00:00.000Z'),
  };
}

function conditionId(): string {
  return `0x${'a'.repeat(64)}`;
}

function resolution() {
  return {
    provider: 'polymarket' as const,
    conditionId: conditionId(),
    status: 'resolved',
    extendedReview: false,
    wasDisputed: true,
    wasArbitrated: false,
    resolvedAt: '2026-09-27T17:00:00Z',
    source: 'data-api-resolution' as const,
    receivedAt: new Date('2026-09-27T18:00:00.000Z'),
  };
}

function resolutionRecord(
  payouts: readonly string[] | null = ['0', '1'],
  condition = conditionId(),
) {
  return {
    ...resolution(),
    conditionId: condition,
    payouts,
  };
}
