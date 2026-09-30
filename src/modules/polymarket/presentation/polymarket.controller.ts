import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
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
import { PredictionMarketTokenParentService } from '../application/prediction-market-token-parent.service';
import { PredictionTagService } from '../application/prediction-tag.service';
import { PredictionSeriesService } from '../application/prediction-series.service';
import { PredictionSearchService } from '../application/prediction-search.service';
import { PolymarketEnabledGuard } from './polymarket-enabled.guard';
import { PredictionDataFreshnessObservation } from '../domain/prediction-data-freshness';
import {
  PredictionMarketDataIncoherentError,
  PredictionMarketDataObservation,
} from '../domain/prediction-market-data-observation';
import {
  PredictionMarketBinaryPriceChange,
  PredictionMarketBinaryPriceChangeIncoherentError,
} from '../domain/prediction-market-binary-price-change';
import {
  PredictionMarketBinaryResolution,
  PredictionMarketBinaryResolutionIncoherentError,
  PredictionMarketBinaryResolutionUnavailableError,
  PredictionMarketConditionUnavailableError,
} from '../domain/prediction-market-binary-resolution';
import {
  PredictionMarketLastTradeContext,
  PredictionMarketLastTradeContextIncoherentError,
} from '../domain/prediction-market-last-trade-context';
import {
  PredictionMarketLastTradeObservation,
  PredictionMarketLastTradeUnavailableError,
} from '../domain/prediction-market-last-trade';
import {
  PredictionMarketMidpointComplement,
  PredictionMarketMidpointComplementIncoherentError,
  PredictionMarketOutcomeTokensUnavailableError,
} from '../domain/prediction-market-midpoint-complement';
import {
  isPredictionMarketTokenId,
  PredictionMarketMidpointUnavailableError,
  PredictionMarketOutcomeMidpoint,
} from '../domain/prediction-market-midpoint';
import {
  PredictionMarketOrderBookUnavailableError,
  PredictionMarketTopOfBook,
} from '../domain/prediction-market-top-of-book';
import {
  PredictionGlobalOpenInterest,
  PredictionMarketOpenInterest,
  PredictionMarketOpenInterestIncoherentError,
  PredictionMarketOpenInterestUnavailableError,
} from '../domain/prediction-market-open-interest';
import {
  isPredictionMarketConditionId,
  PredictionMarketResolutionState,
  PredictionMarketResolutionUnavailableError,
} from '../domain/prediction-market-resolution';
import {
  PredictionMarketDetails,
  PredictionMarketNotFoundError,
  PredictionMarketPage,
  PredictionMarketProviderDnsError,
  PredictionMarketTags,
} from '../domain/prediction-market';
import {
  PredictionMarketTokenParent,
  PredictionMarketTokenParentUnavailableError,
} from '../domain/prediction-market-token-parent';
import {
  PredictionMarketHistoricalPriceObservation,
  PredictionMarketHistoricalPriceUnavailableError,
  PredictionMarketPriceHistoryPage,
  PredictionMarketPriceHistoryResolution,
  PredictionMarketPriceHistoryUnavailableError,
} from '../domain/prediction-market-price-history';
import {
  PredictionMarketPriceChange,
  PredictionMarketPriceChangeIncoherentError,
} from '../domain/prediction-market-price-change';
import {
  PredictionMarketPriceComplementAt,
  PredictionMarketPriceComplementAtIncoherentError,
} from '../domain/prediction-market-price-complement-at';
import {
  PredictionEventDetails,
  PredictionEventNotFoundError,
  PredictionEventPage,
  PredictionEventTags,
} from '../domain/prediction-event';
import {
  PredictionEventLiveVolume,
  PredictionEventLiveVolumeIncoherentError,
  PredictionEventLiveVolumeUnavailableError,
} from '../domain/prediction-event-live-volume';
import {
  PredictionTagDetails,
  PredictionTagNotFoundError,
  PredictionTagPage,
  PredictionRelatedTags,
} from '../domain/prediction-tag';
import {
  PredictionSeriesDetails,
  PredictionSeriesEvents,
  PredictionSeriesNotFoundError,
  PredictionSeriesPage,
} from '../domain/prediction-series';
import { PredictionSearchResult } from '../domain/prediction-search';

const DEFAULT_LIMIT = 20;
const MAXIMUM_LIMIT = 100;
const MAXIMUM_SEARCH_PAGE = 100;
const MAXIMUM_OFFSET = 10_000;
const CURSOR = /^\S{1,4096}$/u;

@Controller('polymarket')
@UseGuards(PolymarketEnabledGuard)
export class PolymarketController {
  constructor(
    private readonly events: PredictionEventService,
    private readonly tags: PredictionTagService,
    private readonly series: PredictionSeriesService,
    private readonly discovery: PredictionMarketDiscoveryService,
    private readonly binaryResolution: PredictionMarketBinaryResolutionService,
    private readonly pricing: PredictionMarketPricingService,
    private readonly orderBook: PredictionMarketOrderBookService,
    private readonly marketData: PredictionMarketDataObservationService,
    private readonly lastTrade: PredictionMarketLastTradeService,
    private readonly lastTradeContext: PredictionMarketLastTradeContextService,
    private readonly midpointComplement: PredictionMarketMidpointComplementService,
    private readonly resolution: PredictionMarketResolutionService,
    private readonly dataFreshness: PredictionDataFreshnessService,
    private readonly openInterest: PredictionMarketOpenInterestService,
    private readonly eventLiveVolume: PredictionEventLiveVolumeService,
    private readonly globalOpenInterest: PredictionGlobalOpenInterestService,
    private readonly priceHistory: PredictionMarketPriceHistoryService,
    private readonly priceComplementAt: PredictionMarketPriceComplementAtService,
    private readonly priceChange: PredictionMarketPriceChangeService,
    private readonly binaryPriceChange: PredictionMarketBinaryPriceChangeService,
    private readonly tokenParent: PredictionMarketTokenParentService,
    private readonly search: PredictionSearchService,
  ) {}

  @Get('search')
  async searchActiveEvents(
    @Query('q') query?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ): Promise<PredictionSearchResult> {
    const parsedQuery = validSearchQuery(query);
    const parsedLimit = validLimit(limit);
    const parsedPage = validSearchPage(page);
    try {
      return await this.search.searchActiveEvents({
        query: parsedQuery,
        limit: parsedLimit,
        page: parsedPage,
      });
    } catch {
      throw new ServiceUnavailableException('Polymarket search is unavailable');
    }
  }

  @Get('data-freshness')
  async getDataFreshness(): Promise<PredictionDataFreshnessObservation> {
    try {
      return await this.dataFreshness.getFreshness();
    } catch {
      throw new ServiceUnavailableException(
        'Polymarket Data API freshness is unavailable',
      );
    }
  }

  @Get('open-interest')
  async getGlobalOpenInterest(): Promise<PredictionGlobalOpenInterest> {
    try {
      return await this.globalOpenInterest.getGlobalOpenInterest();
    } catch {
      throw new ServiceUnavailableException(
        'Polymarket global open interest is unavailable',
      );
    }
  }

  @Get('series')
  async listActiveSeries(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('recurrence') recurrence?: string,
  ): Promise<PredictionSeriesPage> {
    const query = {
      limit: validLimit(limit),
      offset: validOffset(offset),
      ...(recurrence === undefined
        ? {}
        : { recurrence: validRecurrence(recurrence) }),
    };
    try {
      return await this.series.listActive(query);
    } catch {
      throw new ServiceUnavailableException(
        'Polymarket series discovery is unavailable',
      );
    }
  }

  @Get('series/:id')
  async getSeries(@Param('id') id: string): Promise<PredictionSeriesDetails> {
    const parsedId = validSeriesId(id);
    try {
      return await this.series.getById(parsedId);
    } catch (error) {
      if (error instanceof PredictionSeriesNotFoundError) {
        throw new NotFoundException('Polymarket series was not found');
      }
      throw new ServiceUnavailableException(
        'Polymarket series detail is unavailable',
      );
    }
  }

  @Get('series/:id/events')
  async getSeriesEvents(
    @Param('id') id: string,
  ): Promise<PredictionSeriesEvents> {
    const parsedId = validSeriesId(id);
    try {
      return await this.series.getEventsById(parsedId);
    } catch (error) {
      if (error instanceof PredictionSeriesNotFoundError) {
        throw new NotFoundException('Polymarket series was not found');
      }
      throw new ServiceUnavailableException(
        'Polymarket series events are unavailable',
      );
    }
  }

  @Get('tags')
  async listTags(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<PredictionTagPage> {
    const query = {
      limit: validLimit(limit),
      offset: validOffset(offset),
    };
    try {
      return await this.tags.list(query);
    } catch {
      throw new ServiceUnavailableException(
        'Polymarket tag catalog is unavailable',
      );
    }
  }

  @Get('tags/:id')
  async getTag(@Param('id') id: string): Promise<PredictionTagDetails> {
    const parsedId = validTagId(id);
    try {
      return await this.tags.getById(parsedId);
    } catch (error) {
      if (error instanceof PredictionTagNotFoundError) {
        throw new NotFoundException('Polymarket tag was not found');
      }
      throw new ServiceUnavailableException(
        'Polymarket tag detail is unavailable',
      );
    }
  }

  @Get('tags/:id/related')
  async getRelatedTags(
    @Param('id') id: string,
  ): Promise<PredictionRelatedTags> {
    const parsedId = validTagId(id);
    try {
      return await this.tags.getRelatedById(parsedId);
    } catch (error) {
      if (error instanceof PredictionTagNotFoundError) {
        throw new NotFoundException('Polymarket tag was not found');
      }
      throw new ServiceUnavailableException(
        'Polymarket related tags are unavailable',
      );
    }
  }

  @Get('events')
  async listActiveEvents(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('tagId') tagId?: string,
  ): Promise<PredictionEventPage> {
    const query = {
      limit: validLimit(limit),
      ...(cursor === undefined ? {} : { afterCursor: validCursor(cursor) }),
      ...(tagId === undefined ? {} : { tagId: validTagId(tagId) }),
    };
    try {
      return await this.events.listActive(query);
    } catch {
      throw new ServiceUnavailableException(
        'Polymarket event discovery is unavailable',
      );
    }
  }

  @Get('events/:id')
  async getEvent(@Param('id') id: string): Promise<PredictionEventDetails> {
    const parsedId = validEventId(id);
    try {
      return await this.events.getById(parsedId);
    } catch (error) {
      if (error instanceof PredictionEventNotFoundError) {
        throw new NotFoundException('Polymarket event was not found');
      }
      throw new ServiceUnavailableException(
        'Polymarket event detail is unavailable',
      );
    }
  }

  @Get('events/:id/tags')
  async getEventTags(@Param('id') id: string): Promise<PredictionEventTags> {
    const parsedId = validEventId(id);
    try {
      return await this.events.getTagsById(parsedId);
    } catch (error) {
      if (error instanceof PredictionEventNotFoundError) {
        throw new NotFoundException('Polymarket event was not found');
      }
      throw new ServiceUnavailableException(
        'Polymarket event tags are unavailable',
      );
    }
  }

  @Get('events/:id/live-volume')
  async getEventLiveVolume(
    @Param('id') id: string,
  ): Promise<PredictionEventLiveVolume> {
    const parsedId = validEventId(id);
    try {
      return await this.eventLiveVolume.getLiveVolume(parsedId);
    } catch (error) {
      if (
        error instanceof PredictionEventNotFoundError ||
        error instanceof PredictionEventLiveVolumeUnavailableError
      ) {
        throw new NotFoundException(
          'Polymarket event live volume is unavailable',
        );
      }
      if (error instanceof PredictionEventLiveVolumeIncoherentError) {
        throw new ServiceUnavailableException(
          'Polymarket event live volume is incoherent',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket event live-volume providers are unavailable',
      );
    }
  }

  @Get('markets')
  async listActiveMarkets(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('tagId') tagId?: string,
  ): Promise<PredictionMarketPage> {
    const query = {
      limit: validLimit(limit),
      ...(cursor === undefined ? {} : { afterCursor: validCursor(cursor) }),
      ...(tagId === undefined ? {} : { tagId: validTagId(tagId) }),
    };
    try {
      return await this.discovery.listActive(query);
    } catch (error) {
      if (error instanceof PredictionMarketProviderDnsError) {
        throw new ServiceUnavailableException(
          'Polymarket market discovery is unavailable because provider DNS resolution failed',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket market discovery is unavailable',
      );
    }
  }

  @Get('conditions/:conditionId/resolution')
  async getConditionResolution(
    @Param('conditionId') conditionId: string,
  ): Promise<PredictionMarketResolutionState> {
    if (!isPredictionMarketConditionId(conditionId)) {
      throw new BadRequestException(
        'conditionId must be a Polymarket 0x-prefixed 32-byte hexadecimal identifier',
      );
    }
    try {
      return await this.resolution.getResolution(conditionId.toLowerCase());
    } catch (error) {
      if (error instanceof PredictionMarketResolutionUnavailableError) {
        throw new NotFoundException(
          'Polymarket condition resolution is unavailable',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket condition resolution provider is unavailable',
      );
    }
  }

  @Get('markets/:id')
  async getMarket(@Param('id') id: string): Promise<PredictionMarketDetails> {
    const parsedId = validMarketId(id);
    try {
      return await this.discovery.getById(parsedId);
    } catch (error) {
      if (error instanceof PredictionMarketNotFoundError) {
        throw new NotFoundException('Polymarket market was not found');
      }
      throw new ServiceUnavailableException(
        'Polymarket market detail is unavailable',
      );
    }
  }

  @Get('markets/:id/tags')
  async getMarketTags(@Param('id') id: string): Promise<PredictionMarketTags> {
    const parsedId = validMarketId(id);
    try {
      return await this.discovery.getTagsById(parsedId);
    } catch (error) {
      if (error instanceof PredictionMarketNotFoundError) {
        throw new NotFoundException('Polymarket market was not found');
      }
      throw new ServiceUnavailableException(
        'Polymarket market tags are unavailable',
      );
    }
  }

  @Get('markets/:id/resolution')
  async getMarketResolution(
    @Param('id') id: string,
  ): Promise<PredictionMarketBinaryResolution> {
    const parsedId = validMarketId(id);
    try {
      return await this.binaryResolution.getResolution(parsedId);
    } catch (error) {
      if (
        error instanceof PredictionMarketNotFoundError ||
        error instanceof PredictionMarketConditionUnavailableError ||
        error instanceof PredictionMarketResolutionUnavailableError ||
        error instanceof PredictionMarketBinaryResolutionUnavailableError
      ) {
        throw new NotFoundException(
          'Polymarket binary market resolution is unavailable',
        );
      }
      if (error instanceof PredictionMarketBinaryResolutionIncoherentError) {
        throw new ServiceUnavailableException(
          'Polymarket binary market resolution is incoherent',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket binary market resolution providers are unavailable',
      );
    }
  }

  @Get('markets/:id/open-interest')
  async getMarketOpenInterest(
    @Param('id') id: string,
  ): Promise<PredictionMarketOpenInterest> {
    const parsedId = validMarketId(id);
    try {
      return await this.openInterest.getOpenInterest(parsedId);
    } catch (error) {
      if (
        error instanceof PredictionMarketNotFoundError ||
        error instanceof PredictionMarketConditionUnavailableError ||
        error instanceof PredictionMarketOpenInterestUnavailableError
      ) {
        throw new NotFoundException(
          'Polymarket market open interest is unavailable',
        );
      }
      if (error instanceof PredictionMarketOpenInterestIncoherentError) {
        throw new ServiceUnavailableException(
          'Polymarket market open interest is incoherent',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket market open-interest providers are unavailable',
      );
    }
  }

  @Get('markets/:id/midpoint-complement')
  async getMarketMidpointComplement(
    @Param('id') id: string,
  ): Promise<PredictionMarketMidpointComplement> {
    const parsedId = validMarketId(id);
    try {
      return await this.midpointComplement.getComplement(parsedId);
    } catch (error) {
      if (
        error instanceof PredictionMarketNotFoundError ||
        error instanceof PredictionMarketOutcomeTokensUnavailableError ||
        error instanceof PredictionMarketMidpointUnavailableError
      ) {
        throw new NotFoundException(
          'Polymarket market midpoint complement is unavailable',
        );
      }
      if (error instanceof PredictionMarketMidpointComplementIncoherentError) {
        throw new ServiceUnavailableException(
          'Polymarket market midpoint complement is incoherent',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket market midpoint-complement providers are unavailable',
      );
    }
  }

  @Get('markets/:id/price-complement-at')
  async getMarketPriceComplementAt(
    @Param('id') id: string,
    @Query('at') at: string | undefined,
  ): Promise<PredictionMarketPriceComplementAt> {
    const parsedId = validMarketId(id);
    const requestedAt = validUtcSecond(at, 'at');
    try {
      return await this.priceComplementAt.getComplementAt(
        parsedId,
        requestedAt,
      );
    } catch (error) {
      if (
        error instanceof PredictionMarketNotFoundError ||
        error instanceof PredictionMarketOutcomeTokensUnavailableError ||
        error instanceof PredictionMarketHistoricalPriceUnavailableError
      ) {
        throw new NotFoundException(
          'Polymarket market point-in-time price complement is unavailable',
        );
      }
      if (error instanceof PredictionMarketPriceComplementAtIncoherentError) {
        throw new ServiceUnavailableException(
          'Polymarket market point-in-time price complement is incoherent',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket market point-in-time price providers are unavailable',
      );
    }
  }

  @Get('markets/:id/price-change')
  async getMarketPriceChange(
    @Param('id') id: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ): Promise<PredictionMarketBinaryPriceChange> {
    const parsedId = validMarketId(id);
    const window = validPriceChangeWindow(from, to);
    try {
      return await this.binaryPriceChange.getPriceChange(
        parsedId,
        window.from,
        window.to,
      );
    } catch (error) {
      if (
        error instanceof PredictionMarketNotFoundError ||
        error instanceof PredictionMarketOutcomeTokensUnavailableError ||
        error instanceof PredictionMarketHistoricalPriceUnavailableError
      ) {
        throw new NotFoundException(
          'Polymarket binary historical price change is unavailable',
        );
      }
      if (
        error instanceof PredictionMarketBinaryPriceChangeIncoherentError ||
        error instanceof PredictionMarketPriceChangeIncoherentError
      ) {
        throw new ServiceUnavailableException(
          'Polymarket binary historical price change is incoherent',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket binary historical price-change providers are unavailable',
      );
    }
  }

  @Get('outcomes/:tokenId/midpoint')
  async getOutcomeMidpoint(
    @Param('tokenId') tokenId: string,
  ): Promise<PredictionMarketOutcomeMidpoint> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new BadRequestException(
        'tokenId must be a canonical Polymarket decimal token identifier',
      );
    }
    try {
      return await this.pricing.getMidpoint(tokenId);
    } catch (error) {
      if (error instanceof PredictionMarketMidpointUnavailableError) {
        throw new NotFoundException(
          'Polymarket outcome midpoint is unavailable',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket outcome midpoint provider is unavailable',
      );
    }
  }

  @Get('outcomes/:tokenId/market')
  async getOutcomeMarket(
    @Param('tokenId') tokenId: string,
  ): Promise<PredictionMarketTokenParent> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new BadRequestException(
        'tokenId must be a canonical Polymarket decimal token identifier',
      );
    }
    try {
      return await this.tokenParent.getByToken(tokenId);
    } catch (error) {
      if (error instanceof PredictionMarketTokenParentUnavailableError) {
        throw new NotFoundException(
          'Polymarket outcome parent market is unavailable',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket outcome parent-market provider is unavailable',
      );
    }
  }

  @Get('outcomes/:tokenId/price-history')
  async getOutcomePriceHistory(
    @Param('tokenId') tokenId: string,
    @Query('start') start: string | undefined,
    @Query('end') end: string | undefined,
    @Query('resolution') resolution: string | undefined,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<PredictionMarketPriceHistoryPage> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new BadRequestException(
        'tokenId must be a canonical Polymarket decimal token identifier',
      );
    }
    const parsedStart = validUtcSecond(start, 'start');
    const parsedEnd = validUtcSecond(end, 'end');
    if (
      parsedEnd.getTime() <= parsedStart.getTime() ||
      parsedEnd.getTime() - parsedStart.getTime() > 31 * 24 * 60 * 60 * 1000
    ) {
      throw new BadRequestException(
        'price-history window must be positive and no longer than 31 days',
      );
    }
    const query = {
      start: parsedStart,
      end: parsedEnd,
      resolution: validPriceHistoryResolution(resolution),
      limit: validLimit(limit),
      ...(cursor === undefined ? {} : { afterCursor: validCursor(cursor) }),
    };
    try {
      return await this.priceHistory.getPriceHistory(tokenId, query);
    } catch (error) {
      if (error instanceof PredictionMarketPriceHistoryUnavailableError) {
        throw new NotFoundException(
          'Polymarket outcome price history is unavailable',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket outcome price-history provider is unavailable',
      );
    }
  }

  @Get('outcomes/:tokenId/price-at')
  async getOutcomePriceAt(
    @Param('tokenId') tokenId: string,
    @Query('at') at: string | undefined,
  ): Promise<PredictionMarketHistoricalPriceObservation> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new BadRequestException(
        'tokenId must be a canonical Polymarket decimal token identifier',
      );
    }
    const requestedAt = validUtcSecond(at, 'at');
    try {
      return await this.priceHistory.getPriceAt(tokenId, requestedAt);
    } catch (error) {
      if (error instanceof PredictionMarketHistoricalPriceUnavailableError) {
        throw new NotFoundException(
          'Polymarket historical outcome price is unavailable',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket historical outcome-price provider is unavailable',
      );
    }
  }

  @Get('outcomes/:tokenId/price-change')
  async getOutcomePriceChange(
    @Param('tokenId') tokenId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ): Promise<PredictionMarketPriceChange> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new BadRequestException(
        'tokenId must be a canonical Polymarket decimal token identifier',
      );
    }
    const window = validPriceChangeWindow(from, to);
    try {
      return await this.priceChange.getPriceChange(
        tokenId,
        window.from,
        window.to,
      );
    } catch (error) {
      if (error instanceof PredictionMarketHistoricalPriceUnavailableError) {
        throw new NotFoundException(
          'Polymarket historical outcome price is unavailable',
        );
      }
      if (error instanceof PredictionMarketPriceChangeIncoherentError) {
        throw new ServiceUnavailableException(
          'Polymarket historical outcome-price change is incoherent',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket historical outcome-price provider is unavailable',
      );
    }
  }

  @Get('outcomes/:tokenId/top-of-book')
  async getOutcomeTopOfBook(
    @Param('tokenId') tokenId: string,
  ): Promise<PredictionMarketTopOfBook> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new BadRequestException(
        'tokenId must be a canonical Polymarket decimal token identifier',
      );
    }
    try {
      return await this.orderBook.getTopOfBook(tokenId);
    } catch (error) {
      if (error instanceof PredictionMarketOrderBookUnavailableError) {
        throw new NotFoundException(
          'Polymarket outcome order book is unavailable',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket outcome order-book provider is unavailable',
      );
    }
  }

  @Get('outcomes/:tokenId/market-data')
  async getOutcomeMarketData(
    @Param('tokenId') tokenId: string,
  ): Promise<PredictionMarketDataObservation> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new BadRequestException(
        'tokenId must be a canonical Polymarket decimal token identifier',
      );
    }
    try {
      return await this.marketData.getObservation(tokenId);
    } catch (error) {
      if (
        error instanceof PredictionMarketMidpointUnavailableError ||
        error instanceof PredictionMarketOrderBookUnavailableError
      ) {
        throw new NotFoundException(
          'Polymarket outcome market data is unavailable',
        );
      }
      if (error instanceof PredictionMarketDataIncoherentError) {
        throw new ServiceUnavailableException(
          'Polymarket outcome market data is incoherent',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket outcome market-data providers are unavailable',
      );
    }
  }

  @Get('outcomes/:tokenId/last-trade')
  async getOutcomeLastTrade(
    @Param('tokenId') tokenId: string,
  ): Promise<PredictionMarketLastTradeObservation> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new BadRequestException(
        'tokenId must be a canonical Polymarket decimal token identifier',
      );
    }
    try {
      return await this.lastTrade.getLastTrade(tokenId);
    } catch (error) {
      if (error instanceof PredictionMarketLastTradeUnavailableError) {
        throw new NotFoundException(
          'Polymarket outcome last trade is unavailable',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket outcome last-trade provider is unavailable',
      );
    }
  }

  @Get('outcomes/:tokenId/last-trade/context')
  async getOutcomeLastTradeContext(
    @Param('tokenId') tokenId: string,
  ): Promise<PredictionMarketLastTradeContext> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new BadRequestException(
        'tokenId must be a canonical Polymarket decimal token identifier',
      );
    }
    try {
      return await this.lastTradeContext.getContext(tokenId);
    } catch (error) {
      if (
        error instanceof PredictionMarketLastTradeUnavailableError ||
        error instanceof PredictionMarketOrderBookUnavailableError
      ) {
        throw new NotFoundException(
          'Polymarket outcome last-trade context is unavailable',
        );
      }
      if (error instanceof PredictionMarketLastTradeContextIncoherentError) {
        throw new ServiceUnavailableException(
          'Polymarket outcome last-trade context is incoherent',
        );
      }
      throw new ServiceUnavailableException(
        'Polymarket outcome last-trade context providers are unavailable',
      );
    }
  }
}

function validMarketId(value: string): string {
  if (!/^[1-9]\d{0,99}$/.test(value)) {
    throw new BadRequestException(
      'market id must be a positive Polymarket numeric identifier',
    );
  }
  return value;
}

function validEventId(value: string): string {
  if (!/^[1-9]\d{0,99}$/.test(value)) {
    throw new BadRequestException(
      'event id must be a positive Polymarket numeric identifier',
    );
  }
  return value;
}

function validTagId(value: string): string {
  if (!/^[1-9]\d{0,99}$/.test(value)) {
    throw new BadRequestException(
      'tag id must be a positive Polymarket numeric identifier',
    );
  }
  return value;
}

function validSeriesId(value: string): string {
  if (!/^[1-9]\d{0,99}$/.test(value)) {
    throw new BadRequestException(
      'series id must be a positive Polymarket numeric identifier',
    );
  }
  return value;
}

function validRecurrence(value: string): string {
  if (
    value.length === 0 ||
    value.length > 100 ||
    value !== value.trim() ||
    containsControlCharacter(value)
  ) {
    throw new BadRequestException(
      'recurrence must be a non-empty Polymarket series recurrence up to 100 characters',
    );
  }
  return value;
}

function validSearchQuery(value: string | undefined): string {
  if (
    value === undefined ||
    value.length < 2 ||
    value.length > 100 ||
    value !== value.trim() ||
    containsControlCharacter(value)
  ) {
    throw new BadRequestException(
      'q must be a trimmed Polymarket search term from 2 to 100 characters',
    );
  }
  return value;
}

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function validLimit(value?: string): number {
  if (value === undefined) return DEFAULT_LIMIT;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new BadRequestException('limit must be an integer from 1 to 100');
  }
  const parsed = Number(value);
  if (parsed > MAXIMUM_LIMIT) {
    throw new BadRequestException('limit must be an integer from 1 to 100');
  }
  return parsed;
}

function validSearchPage(value?: string): number {
  if (value === undefined) return 1;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new BadRequestException('page must be an integer from 1 to 100');
  }
  const parsed = Number(value);
  if (parsed > MAXIMUM_SEARCH_PAGE) {
    throw new BadRequestException('page must be an integer from 1 to 100');
  }
  return parsed;
}

function validOffset(value?: string): number {
  if (value === undefined) return 0;
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new BadRequestException('offset must be an integer from 0 to 10000');
  }
  const parsed = Number(value);
  if (parsed > MAXIMUM_OFFSET) {
    throw new BadRequestException('offset must be an integer from 0 to 10000');
  }
  return parsed;
}

function validCursor(value: string): string {
  if (!CURSOR.test(value)) {
    throw new BadRequestException(
      'cursor must be a non-empty Polymarket keyset cursor',
    );
  }
  return value;
}

function validUtcSecond(value: string | undefined, field: string): Date {
  if (
    value === undefined ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value)
  ) {
    throw new BadRequestException(
      `${field} must be a canonical UTC timestamp with whole-second precision`,
    );
  }
  const parsed = new Date(value);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getTime() <= 0 ||
    parsed.toISOString() !== value.replace('Z', '.000Z')
  ) {
    throw new BadRequestException(
      `${field} must be a canonical UTC timestamp with whole-second precision`,
    );
  }
  return parsed;
}

function validPriceChangeWindow(
  from: string | undefined,
  to: string | undefined,
): { from: Date; to: Date } {
  const parsedFrom = validUtcSecond(from, 'from');
  const parsedTo = validUtcSecond(to, 'to');
  if (
    parsedTo.getTime() <= parsedFrom.getTime() ||
    parsedTo.getTime() - parsedFrom.getTime() > 31 * 24 * 60 * 60 * 1000
  ) {
    throw new BadRequestException(
      'price-change window must be positive and no longer than 31 days',
    );
  }
  return { from: parsedFrom, to: parsedTo };
}

function validPriceHistoryResolution(
  value: string | undefined,
): PredictionMarketPriceHistoryResolution {
  if (
    value !== '1m' &&
    value !== '5m' &&
    value !== '30m' &&
    value !== '3h' &&
    value !== '12h'
  ) {
    throw new BadRequestException(
      'resolution must be one of 1m, 5m, 30m, 3h, or 12h',
    );
  }
  return value;
}
