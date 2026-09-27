import {
  BadRequestException,
  Controller,
  Get,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PredictionMarketDiscoveryService } from '../application/prediction-market-discovery.service';
import { PredictionMarketPage } from '../domain/prediction-market';

const DEFAULT_LIMIT = 20;
const MAXIMUM_LIMIT = 100;
const CURSOR = /^\S{1,4096}$/u;

@Controller('polymarket')
export class PolymarketController {
  constructor(private readonly discovery: PredictionMarketDiscoveryService) {}

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
