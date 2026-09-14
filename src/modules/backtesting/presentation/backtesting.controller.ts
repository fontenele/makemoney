import {
  BadRequestException,
  Body,
  Controller,
  ConflictException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
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
import {
  BacktestRunCursorNotFoundError,
  BacktestRunIdempotencyConflictError,
} from '../domain/backtest-run';
import {
  BacktestRunResponse,
  BacktestRunService,
  StoredBacktestRunResponse,
} from '../application/backtest-run.service';

const MAX_CANDLE_LIMIT = 10_000;
const MAX_RANGE_MS = MAX_CANDLE_LIMIT * 60_000;

@Controller('backtesting')
export class BacktestingController {
  constructor(
    private readonly replay: HistoricalStrategyReplayService,
    private readonly simulationValidator: BacktestSimulationRequestValidator,
    private readonly runs: BacktestRunService,
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

  @Post('runs')
  @HttpCode(HttpStatus.OK)
  async createRun(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<BacktestRunResponse> {
    const key = validIdempotencyKey(idempotencyKey);
    const { request, configuration } = this.validSimulationRequest(body);
    try {
      return await this.runs.create(key, request, configuration);
    } catch (error: unknown) {
      if (error instanceof BacktestRunIdempotencyConflictError) {
        throw new ConflictException(error.message);
      }
      throw new ServiceUnavailableException({
        message: 'Backtest run could not be persisted',
        reason: 'backtest_run_unavailable',
      });
    }
  }

  @Get('runs/:id')
  async getRun(@Param('id') id: string): Promise<StoredBacktestRunResponse> {
    const validId = validUuid(id);
    try {
      const run = await this.runs.findById(validId);
      if (!run) {
        throw new NotFoundException('Backtest run was not found');
      }
      return run;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new ServiceUnavailableException({
        message: 'Backtest run is currently unavailable',
        reason: 'backtest_run_unavailable',
      });
    }
  }

  @Get('runs')
  async getRuns(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<StoredBacktestRunResponse[]> {
    const validLimit = validRunLimit(limit);
    const validCursor = cursor === undefined ? undefined : validUuid(cursor);
    try {
      return await this.runs.findRecent(validLimit, validCursor);
    } catch (error: unknown) {
      if (error instanceof BacktestRunCursorNotFoundError) {
        throw new BadRequestException(error.message);
      }
      throw new ServiceUnavailableException({
        message: 'Backtest runs are currently unavailable',
        reason: 'backtest_runs_unavailable',
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

function validUuid(value: string): string {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new BadRequestException('Invalid backtest run id');
  }
  return value;
}

function validRunLimit(value: string | undefined): number {
  if (value === undefined) {
    return 50;
  }
  if (!/^[1-9]\d*$/.test(value)) {
    throw new BadRequestException('limit must be an integer from 1 to 100');
  }
  const limit = Number(value);
  if (limit > 100) {
    throw new BadRequestException('limit must be an integer from 1 to 100');
  }
  return limit;
}

function validIdempotencyKey(value: string | undefined): string {
  if (!value || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
    throw new BadRequestException('Invalid Idempotency-Key header');
  }
  return value;
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
