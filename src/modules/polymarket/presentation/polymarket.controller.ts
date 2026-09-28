import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
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
import { PredictionTagService } from '../application/prediction-tag.service';
import { PredictionSeriesService } from '../application/prediction-series.service';
import {
  PredictionMarketDataIncoherentError,
  PredictionMarketDataObservation,
} from '../domain/prediction-market-data-observation';
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
  isPredictionMarketConditionId,
  PredictionMarketResolutionState,
  PredictionMarketResolutionUnavailableError,
} from '../domain/prediction-market-resolution';
import {
  PredictionMarketDetails,
  PredictionMarketNotFoundError,
  PredictionMarketPage,
  PredictionMarketTags,
} from '../domain/prediction-market';
import {
  PredictionEventDetails,
  PredictionEventNotFoundError,
  PredictionEventPage,
  PredictionEventTags,
} from '../domain/prediction-event';
import {
  PredictionTagDetails,
  PredictionTagNotFoundError,
  PredictionTagPage,
  PredictionRelatedTags,
} from '../domain/prediction-tag';
import {
  PredictionSeriesDetails,
  PredictionSeriesNotFoundError,
  PredictionSeriesPage,
} from '../domain/prediction-series';

const DEFAULT_LIMIT = 20;
const MAXIMUM_LIMIT = 100;
const MAXIMUM_OFFSET = 10_000;
const CURSOR = /^\S{1,4096}$/u;

@Controller('polymarket')
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
  ) {}

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
    } catch {
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
