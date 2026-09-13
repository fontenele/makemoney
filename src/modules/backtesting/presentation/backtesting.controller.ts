import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HistoricalStrategyReplayService } from '../application/historical-strategy-replay.service';
import { BacktestSimulationRequestValidator } from '../application/backtest-simulation-request-validator';
import { BacktestResult } from '../domain/backtest';
import {
  BacktestSimulationConfiguration,
  HistoricalBacktestSimulationResult,
} from '../domain/backtest-simulation';
import { HistoricalCandleRequest } from '../domain/historical-candle-provider';

const MAX_CANDLE_LIMIT = 10_000;
const MAX_RANGE_MS = MAX_CANDLE_LIMIT * 60_000;

@Controller('backtesting')
export class BacktestingController {
  constructor(
    private readonly replay: HistoricalStrategyReplayService,
    private readonly simulationValidator: BacktestSimulationRequestValidator,
  ) {}

  @Post('replay')
  @HttpCode(HttpStatus.OK)
  async runReplay(@Body() body: unknown): Promise<BacktestResult> {
    const request = validReplayRequest(body);
    try {
      return await this.replay.run(request);
    } catch {
      throw new ServiceUnavailableException({
        message: 'Historical replay is currently unavailable',
        reason: 'historical_replay_unavailable',
      });
    }
  }

  @Post('simulate')
  @HttpCode(HttpStatus.OK)
  async runSimulation(
    @Body() body: unknown,
  ): Promise<HistoricalBacktestSimulationResult> {
    const { request, configuration } = this.validSimulationRequest(body);
    try {
      return await this.replay.runSimulation(request, configuration);
    } catch {
      throw new ServiceUnavailableException({
        message: 'Historical simulation is currently unavailable',
        reason: 'historical_simulation_unavailable',
      });
    }
  }

  private validSimulationRequest(value: unknown): {
    request: HistoricalCandleRequest;
    configuration: BacktestSimulationConfiguration;
  } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Invalid historical simulation request');
    }
    const body = value as Record<string, unknown>;
    const allowedFields = ['startTime', 'endTime', 'limit', 'configuration'];
    if (
      Object.keys(body).length !== allowedFields.length ||
      Object.keys(body).some((key) => !allowedFields.includes(key))
    ) {
      throw new BadRequestException('Invalid historical simulation request');
    }
    const request = validReplayRequest({
      startTime: body.startTime,
      endTime: body.endTime,
      limit: body.limit,
    });
    try {
      return {
        request,
        configuration: this.simulationValidator.validate(body.configuration),
      };
    } catch {
      throw new BadRequestException(
        'Invalid backtest simulation configuration',
      );
    }
  }
}

function validReplayRequest(value: unknown): HistoricalCandleRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Invalid historical replay request');
  }
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).some(
      (key) => !['startTime', 'endTime', 'limit'].includes(key),
    )
  ) {
    throw new BadRequestException('Invalid historical replay request');
  }
  const startTime = validUtcTimestamp(body.startTime, 'startTime');
  const endTime = validUtcTimestamp(body.endTime, 'endTime');
  if (
    typeof body.limit !== 'number' ||
    !Number.isInteger(body.limit) ||
    body.limit < 1 ||
    body.limit > MAX_CANDLE_LIMIT
  ) {
    throw new BadRequestException('limit must be an integer from 1 to 10000');
  }
  if (
    startTime.getTime() < 0 ||
    endTime.getTime() < startTime.getTime() ||
    endTime.getTime() - startTime.getTime() > MAX_RANGE_MS
  ) {
    throw new BadRequestException(
      'endTime must be at or after startTime within 10000 minutes',
    );
  }
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    startTime,
    endTime,
    limit: body.limit,
  };
}

function validUtcTimestamp(value: unknown, field: string): Date {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be an ISO 8601 UTC timestamp`);
  }
  const parsed = new Date(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    throw new BadRequestException(`${field} must be an ISO 8601 UTC timestamp`);
  }
  return parsed;
}
