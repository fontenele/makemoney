import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  BACKTEST_RUN_REPOSITORY,
  BacktestRun,
  BacktestRunIdempotencyConflictError,
  BacktestRunRepository,
  JsonValue,
} from '../domain/backtest-run';
import { BacktestSimulationConfiguration } from '../domain/backtest-simulation';
import { HistoricalCandleRequest } from '../domain/historical-candle-provider';
import { HistoricalStrategyReplayService } from './historical-strategy-replay.service';

export interface BacktestRunResponse {
  id: string;
  createdAt: Date;
  replayed: boolean;
  request: JsonValue;
  result: JsonValue;
}

export type StoredBacktestRunResponse = Omit<BacktestRunResponse, 'replayed'>;

@Injectable()
export class BacktestRunService {
  constructor(
    private readonly replay: HistoricalStrategyReplayService,
    @Inject(BACKTEST_RUN_REPOSITORY)
    private readonly repository: BacktestRunRepository,
  ) {}

  async findById(id: string): Promise<StoredBacktestRunResponse | undefined> {
    const run = await this.repository.findById(id);
    if (!run) {
      return undefined;
    }
    return storedResponse(run);
  }

  async create(
    idempotencyKey: string,
    request: HistoricalCandleRequest,
    configuration: BacktestSimulationConfiguration,
  ): Promise<BacktestRunResponse> {
    const requestSnapshot = toJson({
      symbol: request.symbol,
      interval: request.interval,
      startTime: request.startTime,
      endTime: request.endTime,
      limit: request.limit,
      configuration,
    });
    const requestFingerprint = createHash('sha256')
      .update(JSON.stringify(requestSnapshot))
      .digest('hex');
    const existing = await this.repository.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new BacktestRunIdempotencyConflictError();
      }
      return response(existing, true);
    }

    const result = toJson(
      await this.replay.runSimulation(request, configuration),
    );
    const created = await this.repository.create({
      idempotencyKey,
      requestFingerprint,
      request: requestSnapshot,
      result,
    });
    return response(created.run, created.replayed);
  }
}

function storedResponse(run: BacktestRun): StoredBacktestRunResponse {
  return {
    id: run.id,
    createdAt: run.createdAt,
    request: run.request,
    result: run.result,
  };
}

function response(run: BacktestRun, replayed: boolean): BacktestRunResponse {
  return {
    id: run.id,
    createdAt: run.createdAt,
    replayed,
    request: run.request,
    result: run.result,
  };
}

function toJson(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}
