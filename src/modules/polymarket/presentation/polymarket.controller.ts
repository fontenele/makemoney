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
import { PredictionMarketOrderBookService } from '../application/prediction-market-order-book.service';
import { PredictionMarketPricingService } from '../application/prediction-market-pricing.service';
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
  PredictionMarketDetails,
  PredictionMarketNotFoundError,
  PredictionMarketPage,
} from '../domain/prediction-market';

const DEFAULT_LIMIT = 20;
const MAXIMUM_LIMIT = 100;
const CURSOR = /^\S{1,4096}$/u;

@Controller('polymarket')
export class PolymarketController {
  constructor(
    private readonly discovery: PredictionMarketDiscoveryService,
    private readonly pricing: PredictionMarketPricingService,
    private readonly orderBook: PredictionMarketOrderBookService,
  ) {}

  @Get('markets')
  async listActiveMarkets(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<PredictionMarketPage> {
    const query = {
      limit: validLimit(limit),
      ...(cursor === undefined ? {} : { afterCursor: validCursor(cursor) }),
    };
    try {
      return await this.discovery.listActive(query);
    } catch {
      throw new ServiceUnavailableException(
        'Polymarket market discovery is unavailable',
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
}

function validMarketId(value: string): string {
  if (!/^[1-9]\d{0,99}$/.test(value)) {
    throw new BadRequestException(
      'market id must be a positive Polymarket numeric identifier',
    );
  }
  return value;
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

function validCursor(value: string): string {
  if (!CURSOR.test(value)) {
    throw new BadRequestException(
      'cursor must be a non-empty Polymarket keyset cursor',
    );
  }
  return value;
}
