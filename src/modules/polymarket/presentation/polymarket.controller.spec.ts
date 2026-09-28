import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { PredictionMarketDiscoveryService } from '../application/prediction-market-discovery.service';
import { PredictionDataFreshnessService } from '../application/prediction-data-freshness.service';
import { PredictionEventService } from '../application/prediction-event.service';
import { PredictionEventLiveVolumeService } from '../application/prediction-event-live-volume.service';
import { PredictionGlobalOpenInterestService } from '../application/prediction-global-open-interest.service';
import { PredictionMarketBinaryPriceChangeService } from '../application/prediction-market-binary-price-change.service';
import { PredictionMarketBinaryResolutionService } from '../application/prediction-market-binary-resolution.service';
import { PredictionMarketDataObservationService } from '../application/prediction-market-data-observation.service';
import { PredictionMarketLastTradeService } from '../application/prediction-market-last-trade.service';
import { PredictionMarketLastTradeContextService } from '../application/prediction-market-last-trade-context.service';
import { PredictionMarketMidpointComplementService } from '../application/prediction-market-midpoint-complement.service';
import { PredictionMarketOrderBookService } from '../application/prediction-market-order-book.service';
import { PredictionMarketOpenInterestService } from '../application/prediction-market-open-interest.service';
import { PredictionMarketPricingService } from '../application/prediction-market-pricing.service';
import { PredictionMarketPriceChangeService } from '../application/prediction-market-price-change.service';
import { PredictionMarketPriceHistoryService } from '../application/prediction-market-price-history.service';
import { PredictionMarketPriceComplementAtService } from '../application/prediction-market-price-complement-at.service';
import { PredictionMarketResolutionService } from '../application/prediction-market-resolution.service';
import { PredictionTagService } from '../application/prediction-tag.service';
import { PredictionSeriesService } from '../application/prediction-series.service';
import { PredictionDataFreshnessProvider } from '../domain/prediction-data-freshness';
import { PredictionMarketBinaryPriceChangeIncoherentError } from '../domain/prediction-market-binary-price-change';
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
  PredictionGlobalOpenInterestProvider,
  PredictionMarketOpenInterestIncoherentError,
  PredictionMarketOpenInterestProvider,
  PredictionMarketOpenInterestUnavailableError,
} from '../domain/prediction-market-open-interest';
import {
  PredictionMarketHistoricalPriceUnavailableError,
  PredictionMarketPriceHistoryProvider,
  PredictionMarketPriceHistoryUnavailableError,
} from '../domain/prediction-market-price-history';
import { PredictionMarketPriceChangeIncoherentError } from '../domain/prediction-market-price-change';
import { PredictionMarketPriceComplementAtIncoherentError } from '../domain/prediction-market-price-complement-at';
import {
  PredictionMarketNotFoundError,
  PredictionMarketProvider,
} from '../domain/prediction-market';
import {
  PredictionEventNotFoundError,
  PredictionEventProvider,
} from '../domain/prediction-event';
import {
  PredictionEventLiveVolumeIncoherentError,
  PredictionEventLiveVolumeProvider,
  PredictionEventLiveVolumeUnavailableError,
} from '../domain/prediction-event-live-volume';
import {
  PredictionTagNotFoundError,
  PredictionTagProvider,
} from '../domain/prediction-tag';
import {
  PredictionSeriesNotFoundError,
  PredictionSeriesProvider,
} from '../domain/prediction-series';
import { PolymarketController } from './polymarket.controller';

describe('PolymarketController', () => {
  it('loads the public Data API freshness observation', async () => {
    const getFreshness = jest
      .fn<PredictionDataFreshnessProvider['getFreshness']>()
      .mockResolvedValue(dataFreshness());
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getFreshness },
    );

    await expect(controller.getDataFreshness()).resolves.toEqual(
      dataFreshness(),
    );
    expect(getFreshness).toHaveBeenCalledWith(undefined);
  });

  it('maps Data API freshness failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getFreshness: () => Promise.reject(new Error('not measured yet')) },
    );

    await expect(controller.getDataFreshness()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads the default bounded active-series page', async () => {
    const listActive = jest
      .fn<PredictionSeriesProvider['listActive']>()
      .mockResolvedValue(seriesPage());
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        listActive,
      },
    );

    await expect(controller.listActiveSeries()).resolves.toEqual(seriesPage());
    expect(listActive).toHaveBeenCalledWith(
      { limit: 20, offset: 0 },
      undefined,
    );
  });

  it('accepts bounded series limit and offset', async () => {
    const listActive = jest
      .fn<PredictionSeriesProvider['listActive']>()
      .mockResolvedValue(seriesPage());
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        listActive,
      },
    );

    await controller.listActiveSeries('100', '10000', 'weekly');
    expect(listActive).toHaveBeenCalledWith(
      { limit: 100, offset: 10000, recurrence: 'weekly' },
      undefined,
    );
  });

  it.each(['', ' weekly', 'weekly ', 'week\nly', 'x'.repeat(101)])(
    'rejects invalid series recurrence %s',
    async (recurrence) => {
      await expect(
        controllerWith({}).listActiveSeries(undefined, undefined, recurrence),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it.each([
    ['0', undefined],
    ['101', undefined],
    [undefined, '-1'],
    [undefined, '01'],
    [undefined, '10001'],
  ])('rejects invalid series pagination (%s, %s)', async (limit, offset) => {
    await expect(
      controllerWith({}).listActiveSeries(limit, offset),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps series-discovery failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        listActive: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.listActiveSeries()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads one selected series by validated id', async () => {
    const getById = jest
      .fn<PredictionSeriesProvider['getById']>()
      .mockResolvedValue(seriesDetails());
    const controller = controllerWith({}, {}, {}, {}, {}, {}, {}, { getById });

    await expect(controller.getSeries('1')).resolves.toEqual(seriesDetails());
    expect(getById).toHaveBeenCalledWith('1', undefined);
  });

  it.each(['0', '-1', '01', 'abc'])(
    'rejects invalid series id %s',
    async (id) => {
      await expect(controllerWith({}).getSeries(id)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('maps absent selected series to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getById: () => Promise.reject(new PredictionSeriesNotFoundError('1')),
      },
    );

    await expect(controller.getSeries('1')).rejects.toThrow(NotFoundException);
  });

  it('maps selected-series provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getById: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.getSeries('1')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads bounded event references for a validated series id', async () => {
    const getEventsById = jest
      .fn<PredictionSeriesProvider['getEventsById']>()
      .mockResolvedValue(seriesEvents());
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getEventsById,
      },
    );

    await expect(controller.getSeriesEvents('1')).resolves.toEqual(
      seriesEvents(),
    );
    expect(getEventsById).toHaveBeenCalledWith('1', undefined);
  });

  it.each(['0', '-1', '01', 'abc'])(
    'rejects invalid series-event source id %s',
    async (id) => {
      await expect(controllerWith({}).getSeriesEvents(id)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('maps absent series-event source to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getEventsById: () =>
          Promise.reject(new PredictionSeriesNotFoundError('1')),
      },
    );

    await expect(controller.getSeriesEvents('1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps series-event provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getEventsById: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.getSeriesEvents('1')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads the default bounded global tag page', async () => {
    const list = jest
      .fn<PredictionTagProvider['list']>()
      .mockResolvedValue(tagPage());
    const controller = controllerWith({}, {}, {}, {}, {}, {}, { list });

    await expect(controller.listTags()).resolves.toEqual(tagPage());
    expect(list).toHaveBeenCalledWith({ limit: 20, offset: 0 }, undefined);
  });

  it('accepts bounded tag limit and offset', async () => {
    const list = jest
      .fn<PredictionTagProvider['list']>()
      .mockResolvedValue(tagPage());
    const controller = controllerWith({}, {}, {}, {}, {}, {}, { list });

    await controller.listTags('100', '10000');
    expect(list).toHaveBeenCalledWith({ limit: 100, offset: 10000 }, undefined);
  });

  it.each([
    ['0', undefined],
    ['101', undefined],
    [undefined, '-1'],
    [undefined, '01'],
    [undefined, '10001'],
  ])('rejects invalid tag pagination (%s, %s)', async (limit, offset) => {
    await expect(controllerWith({}).listTags(limit, offset)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('maps tag catalog provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {
        list: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.listTags()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads one selected tag by validated id', async () => {
    const getById = jest
      .fn<PredictionTagProvider['getById']>()
      .mockResolvedValue(tagDetails());
    const controller = controllerWith({}, {}, {}, {}, {}, {}, { getById });

    await expect(controller.getTag('2')).resolves.toEqual(tagDetails());
    expect(getById).toHaveBeenCalledWith('2', undefined);
  });

  it.each(['0', '-1', '01', 'abc'])('rejects invalid tag id %s', async (id) => {
    await expect(controllerWith({}).getTag(id)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('maps absent selected tag to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getById: () => Promise.reject(new PredictionTagNotFoundError('2')),
      },
    );

    await expect(controller.getTag('2')).rejects.toThrow(NotFoundException);
  });

  it('maps selected-tag provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      { getById: () => Promise.reject(new Error('network unavailable')) },
    );

    await expect(controller.getTag('2')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads related tags by validated source id', async () => {
    const getRelatedById = jest
      .fn<PredictionTagProvider['getRelatedById']>()
      .mockResolvedValue(relatedTags());
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      { getRelatedById },
    );

    await expect(controller.getRelatedTags('2')).resolves.toEqual(
      relatedTags(),
    );
    expect(getRelatedById).toHaveBeenCalledWith('2', undefined);
  });

  it.each(['0', '-1', '01', 'abc'])(
    'rejects invalid related-tag source id %s',
    async (id) => {
      await expect(controllerWith({}).getRelatedTags(id)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('maps absent related-tag source to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getRelatedById: () =>
          Promise.reject(new PredictionTagNotFoundError('2')),
      },
    );

    await expect(controller.getRelatedTags('2')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps related-tag provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getRelatedById: () => Promise.reject(new Error('network unavailable')),
      },
    );

    await expect(controller.getRelatedTags('2')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

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

  it('passes a validated tag filter for event discovery', async () => {
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

    await controller.listActiveEvents('20', 'page_2-cursor', '2');
    expect(calls).toEqual([
      { limit: 20, afterCursor: 'page_2-cursor', tagId: '2' },
    ]);
  });

  it.each(['0', '-1', '01', 'abc'])(
    'rejects invalid event-discovery tag id %s',
    async (tagId) => {
      await expect(
        controllerWith({}).listActiveEvents(undefined, undefined, tagId),
      ).rejects.toThrow(BadRequestException);
    },
  );

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

  it('passes a validated tag filter for market discovery', async () => {
    const calls: unknown[] = [];
    const controller = controllerWith({
      listActive: (query) => {
        calls.push(query);
        return Promise.resolve({
          markets: [],
          nextCursor: null,
          receivedAt: new Date('2026-09-27T20:00:00.000Z'),
        });
      },
    });

    await controller.listActiveMarkets('20', 'page_2-cursor', '2');
    expect(calls).toEqual([
      { limit: 20, afterCursor: 'page_2-cursor', tagId: '2' },
    ]);
  });

  it.each(['0', '-1', '01', 'abc'])(
    'rejects invalid market-discovery tag id %s',
    async (tagId) => {
      await expect(
        controllerWith(unusedProvider()).listActiveMarkets(
          undefined,
          undefined,
          tagId,
        ),
      ).rejects.toThrow(BadRequestException);
    },
  );

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

  it('loads public open interest for one selected market', async () => {
    const getById = jest
      .fn<PredictionMarketProvider['getById']>()
      .mockResolvedValue(marketDetails());
    const getOpenInterest = jest
      .fn<PredictionMarketOpenInterestProvider['getOpenInterest']>()
      .mockResolvedValue({
        provider: 'polymarket',
        conditionId: marketDetails().conditionId,
        openInterestUsdc: '7113116.142022',
        source: 'data-api-open-interest',
        receivedAt: new Date('2026-09-28T04:00:00.000Z'),
      });
    const controller = controllerWith(
      { getById },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getOpenInterest },
    );

    await expect(
      controller.getMarketOpenInterest('703257'),
    ).resolves.toMatchObject({
      conditionId: marketDetails().conditionId,
      openInterestUsdc: '7113116.142022',
      executable: false,
    });
  });

  it.each(['0', '-1', 'abc'])(
    'rejects invalid open-interest market id %s',
    async (id) => {
      await expect(
        controllerWith({}).getMarketOpenInterest(id),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps unavailable open interest to not found', async () => {
    const controller = controllerWith(
      { getById: () => Promise.resolve(marketDetails()) },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getOpenInterest: () =>
          Promise.reject(
            new PredictionMarketOpenInterestUnavailableError(conditionId()),
          ),
      },
    );

    await expect(controller.getMarketOpenInterest('703257')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps incoherent open interest to service unavailable', async () => {
    const controller = controllerWith(
      { getById: () => Promise.resolve(marketDetails()) },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getOpenInterest: () =>
          Promise.reject(
            new PredictionMarketOpenInterestIncoherentError('703257'),
          ),
      },
    );

    await expect(controller.getMarketOpenInterest('703257')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads public live volume for one selected event', async () => {
    const getById = jest
      .fn<PredictionEventProvider['getById']>()
      .mockResolvedValue(eventDetails());
    const getLiveVolume = jest
      .fn<PredictionEventLiveVolumeProvider['getLiveVolume']>()
      .mockResolvedValue(eventLiveVolume());
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      { getById },
      {},
      {},
      {},
      {},
      { getLiveVolume },
    );

    await expect(controller.getEventLiveVolume('1000')).resolves.toMatchObject({
      event: eventDetails(),
      takerVolumeTotalShares: '10',
      executable: false,
    });
  });

  it.each(['0', '-1', 'abc'])(
    'rejects invalid live-volume event id %s',
    async (id) => {
      await expect(controllerWith({}).getEventLiveVolume(id)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('maps unavailable event live volume to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      { getById: () => Promise.resolve(eventDetails()) },
      {},
      {},
      {},
      {},
      {
        getLiveVolume: () =>
          Promise.reject(new PredictionEventLiveVolumeUnavailableError('1000')),
      },
    );

    await expect(controller.getEventLiveVolume('1000')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps incoherent event live volume to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      { getById: () => Promise.resolve(eventDetails()) },
      {},
      {},
      {},
      {},
      {
        getLiveVolume: () =>
          Promise.reject(new PredictionEventLiveVolumeIncoherentError('1000')),
      },
    );

    await expect(controller.getEventLiveVolume('1000')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads public global open interest', async () => {
    const getGlobalOpenInterest = jest
      .fn<PredictionGlobalOpenInterestProvider['getGlobalOpenInterest']>()
      .mockResolvedValue(globalOpenInterest());
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getGlobalOpenInterest },
    );

    await expect(controller.getGlobalOpenInterest()).resolves.toEqual(
      globalOpenInterest(),
    );
  });

  it('maps global open-interest failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getGlobalOpenInterest: () => Promise.reject(new Error('unavailable')) },
    );

    await expect(controller.getGlobalOpenInterest()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads a validated bounded outcome price-history page', async () => {
    const getPriceHistory = jest
      .fn<PredictionMarketPriceHistoryProvider['getPriceHistory']>()
      .mockResolvedValue(priceHistory());
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getPriceHistory },
    );

    await expect(
      controller.getOutcomePriceHistory(
        '111',
        '2026-09-27T00:00:00Z',
        '2026-09-28T00:00:00Z',
        '5m',
        '100',
        'next',
      ),
    ).resolves.toEqual(priceHistory());
    expect(getPriceHistory).toHaveBeenCalledWith(
      '111',
      {
        start: new Date('2026-09-27T00:00:00Z'),
        end: new Date('2026-09-28T00:00:00Z'),
        resolution: '5m',
        limit: 100,
        afterCursor: 'next',
      },
      undefined,
    );
  });

  it.each([
    ['01', '2026-09-27T00:00:00Z', '2026-09-28T00:00:00Z', '5m'],
    ['111', undefined, '2026-09-28T00:00:00Z', '5m'],
    ['111', '2026-09-27T00:00:00.000Z', '2026-09-28T00:00:00Z', '5m'],
    ['111', '2026-09-28T00:00:00Z', '2026-09-27T00:00:00Z', '5m'],
    ['111', '2026-08-01T00:00:00Z', '2026-09-28T00:00:00Z', '5m'],
    ['111', '2026-09-27T00:00:00Z', '2026-09-28T00:00:00Z', '15m'],
  ])(
    'rejects invalid price-history query %#',
    async (tokenId, start, end, resolution) => {
      await expect(
        controllerWith({}).getOutcomePriceHistory(
          tokenId,
          start,
          end,
          resolution,
        ),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps unavailable price history to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getPriceHistory: () =>
          Promise.reject(
            new PredictionMarketPriceHistoryUnavailableError('111'),
          ),
      },
    );
    await expect(
      controller.getOutcomePriceHistory(
        '111',
        '2026-09-27T00:00:00Z',
        '2026-09-28T00:00:00Z',
        '5m',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('loads one validated point-in-time outcome price', async () => {
    const getPriceAt = jest
      .fn<PredictionMarketPriceHistoryProvider['getPriceAt']>()
      .mockResolvedValue(historicalPrice());
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getPriceAt },
    );

    await expect(
      controller.getOutcomePriceAt('111', '2026-09-27T00:07:00Z'),
    ).resolves.toEqual(historicalPrice());
    expect(getPriceAt).toHaveBeenCalledWith(
      '111',
      new Date('2026-09-27T00:07:00Z'),
      undefined,
    );
  });

  it.each([
    ['01', '2026-09-27T00:07:00Z'],
    ['111', undefined],
    ['111', '2026-09-27T00:07:00.000Z'],
    ['111', '1970-01-01T00:00:00Z'],
    ['111', 'invalid'],
  ])('rejects invalid point-in-time query %#', async (tokenId, at) => {
    await expect(
      controllerWith({}).getOutcomePriceAt(tokenId, at),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps unavailable point-in-time price to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getPriceAt: () =>
          Promise.reject(
            new PredictionMarketHistoricalPriceUnavailableError(
              '111',
              new Date('2026-09-27T00:07:00Z'),
            ),
          ),
      },
    );
    await expect(
      controller.getOutcomePriceAt('111', '2026-09-27T00:07:00Z'),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps point-in-time provider failure to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getPriceAt: () => Promise.reject(new Error('unavailable')) },
    );
    await expect(
      controller.getOutcomePriceAt('111', '2026-09-27T00:07:00Z'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('loads an exact outcome price change between two instants', async () => {
    const getPriceAt = jest
      .fn<PredictionMarketPriceHistoryProvider['getPriceAt']>()
      .mockImplementation((tokenId, at) =>
        Promise.resolve({
          ...historicalPrice(),
          tokenId,
          requestedAt: at,
          observedAt: at,
          price:
            at.getTime() === new Date('2026-09-27T00:05:00Z').getTime()
              ? '0.2'
              : '0.35',
          exactTimestamp: true,
        }),
      );
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getPriceAt },
    );

    await expect(
      controller.getOutcomePriceChange(
        '111',
        '2026-09-27T00:05:00Z',
        '2026-09-27T00:07:00Z',
      ),
    ).resolves.toMatchObject({
      tokenId: '111',
      priceChange: '0.15',
      direction: 'up',
      sameObservedTimestamp: false,
      sameResolution: true,
      executable: false,
    });
    expect(getPriceAt).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['01', '2026-09-27T00:05:00Z', '2026-09-27T00:07:00Z'],
    ['111', undefined, '2026-09-27T00:07:00Z'],
    ['111', 'invalid', '2026-09-27T00:07:00Z'],
    ['111', '2026-09-27T00:07:00Z', '2026-09-27T00:07:00Z'],
    ['111', '2026-09-27T00:08:00Z', '2026-09-27T00:07:00Z'],
    ['111', '2026-08-01T00:00:00Z', '2026-09-27T00:07:00Z'],
  ])('rejects invalid price-change query %#', async (tokenId, from, to) => {
    await expect(
      controllerWith({}).getOutcomePriceChange(tokenId, from, to),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps unavailable price-change observations to not found', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getPriceAt: () =>
          Promise.reject(
            new PredictionMarketHistoricalPriceUnavailableError(
              '111',
              new Date('2026-09-27T00:05:00Z'),
            ),
          ),
      },
    );
    await expect(
      controller.getOutcomePriceChange(
        '111',
        '2026-09-27T00:05:00Z',
        '2026-09-27T00:07:00Z',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('maps incoherent price changes to service unavailable', async () => {
    const controller = controllerWith(
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {
        getPriceAt: () =>
          Promise.reject(new PredictionMarketPriceChangeIncoherentError('111')),
      },
    );
    await expect(
      controller.getOutcomePriceChange(
        '111',
        '2026-09-27T00:05:00Z',
        '2026-09-27T00:07:00Z',
      ),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('loads a binary market point-in-time price complement', async () => {
    const getPriceAt = jest
      .fn<PredictionMarketPriceHistoryProvider['getPriceAt']>()
      .mockImplementation((tokenId, at) =>
        Promise.resolve({
          ...historicalPrice(),
          tokenId,
          requestedAt: at,
          price: tokenId === '111' ? '0.4' : '0.6',
        }),
      );
    const controller = controllerWith(
      { getById: () => Promise.resolve(marketDetails()) },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getPriceAt },
    );

    await expect(
      controller.getMarketPriceComplementAt('703257', '2026-09-27T00:07:00Z'),
    ).resolves.toMatchObject({
      priceSum: '1',
      deviationFromOne: '0',
      status: 'balanced',
      sameObservedTimestamp: true,
      sameResolution: true,
      atomicSnapshot: false,
      executable: false,
    });
    expect(getPriceAt).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['0', '2026-09-27T00:07:00Z'],
    ['703257', undefined],
    ['703257', 'invalid'],
  ])('rejects invalid point-in-time complement query %#', async (id, at) => {
    await expect(
      controllerWith({}).getMarketPriceComplementAt(id, at),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps an incoherent point-in-time complement to service unavailable', async () => {
    const controller = controllerWith({
      getById: () =>
        Promise.reject(
          new PredictionMarketPriceComplementAtIncoherentError('703257'),
        ),
    });
    await expect(
      controller.getMarketPriceComplementAt('703257', '2026-09-27T00:07:00Z'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('loads binary outcome price changes over one interval', async () => {
    const getPriceAt = jest
      .fn<PredictionMarketPriceHistoryProvider['getPriceAt']>()
      .mockImplementation((tokenId, at) => {
        const isFrom =
          at.getTime() === new Date('2026-09-27T00:05:00Z').getTime();
        return Promise.resolve({
          ...historicalPrice(),
          tokenId,
          requestedAt: at,
          observedAt: at,
          price:
            tokenId === '111'
              ? isFrom
                ? '0.4'
                : '0.5'
              : isFrom
                ? '0.6'
                : '0.55',
          exactTimestamp: true,
        });
      });
    const controller = controllerWith(
      { getById: () => Promise.resolve(marketDetails()) },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { getPriceAt },
    );

    await expect(
      controller.getMarketPriceChange(
        '703257',
        '2026-09-27T00:05:00Z',
        '2026-09-27T00:07:00Z',
      ),
    ).resolves.toMatchObject({
      outcomes: {
        yes: { tokenId: '111', priceChange: '0.1', direction: 'up' },
        no: { tokenId: '222', priceChange: '-0.05', direction: 'down' },
      },
      combinedPriceChange: '0.05',
      combinedDirection: 'up',
      sameFromObservedTimestamp: true,
      sameToObservedTimestamp: true,
      sameFromResolution: true,
      sameToResolution: true,
      atomicSnapshot: false,
      executable: false,
    });
    expect(getPriceAt).toHaveBeenCalledTimes(4);
  });

  it.each([
    ['0', '2026-09-27T00:05:00Z', '2026-09-27T00:07:00Z'],
    ['703257', undefined, '2026-09-27T00:07:00Z'],
    ['703257', 'invalid', '2026-09-27T00:07:00Z'],
    ['703257', '2026-09-27T00:07:00Z', '2026-09-27T00:07:00Z'],
  ])('rejects invalid binary price-change query %#', async (id, from, to) => {
    await expect(
      controllerWith({}).getMarketPriceChange(id, from, to),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps incoherent binary price changes to service unavailable', async () => {
    const controller = controllerWith({
      getById: () =>
        Promise.reject(
          new PredictionMarketBinaryPriceChangeIncoherentError('703257'),
        ),
    });
    await expect(
      controller.getMarketPriceChange(
        '703257',
        '2026-09-27T00:05:00Z',
        '2026-09-27T00:07:00Z',
      ),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

function controllerWith(
  provider: Partial<PredictionMarketProvider>,
  midpointProvider: Partial<PredictionMarketMidpointProvider> = {},
  orderBookProvider: Partial<PredictionMarketOrderBookProvider> = {},
  lastTradeProvider: Partial<PredictionMarketLastTradeProvider> = {},
  resolutionProvider: Partial<PredictionMarketResolutionProvider> = {},
  eventProvider: Partial<PredictionEventProvider> = {},
  tagProvider: Partial<PredictionTagProvider> = {},
  seriesProvider: Partial<PredictionSeriesProvider> = {},
  dataFreshnessProvider: Partial<PredictionDataFreshnessProvider> = {},
  openInterestProvider: Partial<PredictionMarketOpenInterestProvider> = {},
  eventLiveVolumeProvider: Partial<PredictionEventLiveVolumeProvider> = {},
  globalOpenInterestProvider: Partial<PredictionGlobalOpenInterestProvider> = {},
  priceHistoryProvider: Partial<PredictionMarketPriceHistoryProvider> = {},
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
  const tags = new PredictionTagService({
    list:
      tagProvider.list ??
      (() => Promise.reject(new Error('unexpected tag catalog call'))),
    getById:
      tagProvider.getById ??
      (() => Promise.reject(new Error('unexpected tag detail call'))),
    getRelatedById:
      tagProvider.getRelatedById ??
      (() => Promise.reject(new Error('unexpected related-tag call'))),
  });
  const series = new PredictionSeriesService({
    listActive:
      seriesProvider.listActive ??
      (() => Promise.reject(new Error('unexpected series list call'))),
    getById:
      seriesProvider.getById ??
      (() => Promise.reject(new Error('unexpected series detail call'))),
    getEventsById:
      seriesProvider.getEventsById ??
      (() => Promise.reject(new Error('unexpected series events call'))),
  });
  const dataFreshness = new PredictionDataFreshnessService({
    getFreshness:
      dataFreshnessProvider.getFreshness ??
      (() => Promise.reject(new Error('unexpected data freshness call'))),
  });
  const openInterest = new PredictionMarketOpenInterestService(discovery, {
    getOpenInterest:
      openInterestProvider.getOpenInterest ??
      (() => Promise.reject(new Error('unexpected open-interest call'))),
  });
  const eventLiveVolume = new PredictionEventLiveVolumeService(events, {
    getLiveVolume:
      eventLiveVolumeProvider.getLiveVolume ??
      (() => Promise.reject(new Error('unexpected event live-volume call'))),
  });
  const globalOpenInterest = new PredictionGlobalOpenInterestService({
    getGlobalOpenInterest:
      globalOpenInterestProvider.getGlobalOpenInterest ??
      (() => Promise.reject(new Error('unexpected global open-interest call'))),
  });
  const priceHistoryService = new PredictionMarketPriceHistoryService({
    getPriceHistory:
      priceHistoryProvider.getPriceHistory ??
      (() => Promise.reject(new Error('unexpected price-history call'))),
    getPriceAt:
      priceHistoryProvider.getPriceAt ??
      (() => Promise.reject(new Error('unexpected price-at call'))),
  });
  const priceComplementAt = new PredictionMarketPriceComplementAtService(
    discovery,
    priceHistoryService,
  );
  const priceChange = new PredictionMarketPriceChangeService(
    priceHistoryService,
  );
  const binaryPriceChange = new PredictionMarketBinaryPriceChangeService(
    discovery,
    priceChange,
  );
  return new PolymarketController(
    events,
    tags,
    series,
    discovery,
    binaryResolution,
    pricing,
    orderBook,
    new PredictionMarketDataObservationService(pricing, orderBook),
    lastTrade,
    new PredictionMarketLastTradeContextService(lastTrade, orderBook),
    new PredictionMarketMidpointComplementService(discovery, pricing),
    resolutionService,
    dataFreshness,
    openInterest,
    eventLiveVolume,
    globalOpenInterest,
    priceHistoryService,
    priceComplementAt,
    priceChange,
    binaryPriceChange,
  );
}

function priceHistory() {
  return {
    provider: 'polymarket' as const,
    tokenId: '111',
    start: new Date('2026-09-27T00:00:00Z'),
    end: new Date('2026-09-28T00:00:00Z'),
    resolution: '5m' as const,
    points: [],
    nextCursor: null,
    source: 'data-api-price-history' as const,
    receivedAt: new Date('2026-09-28T08:00:00Z'),
    executable: false as const,
  };
}

function historicalPrice() {
  return {
    provider: 'polymarket' as const,
    tokenId: '111',
    requestedAt: new Date('2026-09-27T00:07:00Z'),
    observedAt: new Date('2026-09-27T00:05:00Z'),
    price: '0.25',
    resolutionSeconds: 300,
    exactTimestamp: false,
    source: 'data-api-price-history' as const,
    receivedAt: new Date('2026-09-28T09:00:00Z'),
    executable: false as const,
  };
}

function globalOpenInterest() {
  return {
    provider: 'polymarket' as const,
    openInterestUsdc: '356037494.1056115',
    source: 'data-api-open-interest' as const,
    receivedAt: new Date('2026-09-28T06:00:00.000Z'),
    executable: false as const,
  };
}

function eventLiveVolume() {
  return {
    provider: 'polymarket' as const,
    eventId: '1000',
    takerVolumeTotalShares: '10',
    markets: [{ conditionId: conditionId(), takerVolumeShares: '10' }],
    source: 'data-api-live-volume' as const,
    receivedAt: new Date('2026-09-28T05:00:00.000Z'),
  };
}

function dataFreshness() {
  return {
    provider: 'polymarket' as const,
    snapshotAgeSeconds: 2,
    computedAt: '2026-09-27T22:00:00Z',
    ingestion: {
      chainId: 137,
      cursorCount: 2,
      lagging: [{ behindMax: 3, block: 100, source: 'orders' }],
      maxSyncedBlock: 103,
      minSyncedBlock: 100,
      mostLagged: { behindMax: 3, block: 100, source: 'orders' },
      network: 'polygon',
    },
    serving: {
      mechanisms: [{ ageSeconds: 4, name: 'activity_feed', blocksBehind: 1 }],
      lagSeconds: 4,
      worst: 'activity_feed',
    },
    source: 'data-api-status' as const,
    receivedAt: new Date('2026-09-27T22:00:02Z'),
  };
}

function seriesPage() {
  return {
    provider: 'polymarket' as const,
    series: [
      {
        id: '1',
        slug: 'nfl',
        title: 'NFL',
        recurrence: 'weekly',
        closed: false,
      },
    ],
    offset: 0,
    nextOffset: null,
    stablePagination: false as const,
    receivedAt: new Date('2026-09-28T00:00:00.000Z'),
  };
}

function seriesEvents() {
  return {
    provider: 'polymarket' as const,
    seriesId: '1',
    events: [
      {
        id: '100',
        slug: 'nfl-week-one',
        title: 'NFL Week One',
        startDate: '2026-09-01T00:00:00Z',
        endDate: '2026-09-08T00:00:00Z',
        active: true,
        closed: false,
        archived: false,
        restricted: false,
      },
    ],
    receivedAt: new Date('2026-09-28T01:30:00.000Z'),
  };
}

function seriesDetails() {
  return {
    provider: 'polymarket' as const,
    id: '1',
    slug: 'nfl',
    title: 'NFL',
    recurrence: 'weekly',
    closed: false,
    receivedAt: new Date('2026-09-27T23:30:00.000Z'),
  };
}

function tagPage() {
  return {
    provider: 'polymarket' as const,
    tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
    offset: 0,
    nextOffset: null,
    stablePagination: false as const,
    receivedAt: new Date('2026-09-27T21:00:00.000Z'),
  };
}

function tagDetails() {
  return {
    provider: 'polymarket' as const,
    id: '2',
    label: 'Politics',
    slug: 'politics',
    receivedAt: new Date('2026-09-27T22:00:00.000Z'),
  };
}

function relatedTags() {
  return {
    provider: 'polymarket' as const,
    tagId: '2',
    tags: [{ id: '3', label: 'Elections', slug: 'elections' }],
    receivedAt: new Date('2026-09-27T23:00:00.000Z'),
  };
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
