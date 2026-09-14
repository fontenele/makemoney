import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  DEFAULT_DETECTED_SPOT_SYMBOL_LIMIT,
  MAX_DETECTED_SPOT_SYMBOL_LIMIT,
  SpotSymbolDetectionReadModelService,
} from '../application/spot-symbol-detection-read-model.service';
import { DetectedSpotSymbol } from '../domain/spot-symbol-catalog';

@Controller('new-listings')
export class NewListingsController {
  constructor(
    private readonly detections: SpotSymbolDetectionReadModelService,
  ) {}

  @Get()
  list(@Query('limit') limit?: string): Promise<DetectedSpotSymbol[]> {
    if (limit === undefined) {
      return this.detections.listRecent(DEFAULT_DETECTED_SPOT_SYMBOL_LIMIT);
    }
    if (!/^[1-9]\d*$/.test(limit)) {
      throw new BadRequestException('limit must be an integer from 1 to 100');
    }
    const parsedLimit = Number(limit);
    if (parsedLimit > MAX_DETECTED_SPOT_SYMBOL_LIMIT) {
      throw new BadRequestException('limit must be an integer from 1 to 100');
    }
    return this.detections.listRecent(parsedLimit);
  }
}
