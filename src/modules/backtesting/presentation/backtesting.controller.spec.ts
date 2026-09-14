import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { BacktestResult } from '../domain/backtest';
import { HistoricalStrategyReplayService } from '../application/historical-strategy-replay.service';
import { BacktestingController } from './backtesting.controller';
import { BacktestSimulationRequestValidator } from '../application/backtest-simulation-request-validator';
import { BacktestExecutionRulesValidator } from '../application/backtest-execution-rules-validator';
import { BacktestRunService } from '../application/backtest-run.service';

describe('BacktestingController', () => {
  it('returns recent backtest runs with a default bounded limit', async () => {
    const runs = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        createdAt: new Date('2026-09-13T20:30:00.000Z'),
        request: {},
        result: {},
      },
    ];
    const findRecent = jest.fn(() => Promise.resolve(runs));
    const controller = controllerWith({}, { findRecent });

    await expect(controller.getRuns()).resolves.toBe(runs);
    expect(findRecent).toHaveBeenCalledWith(50);
  });

  it('accepts an explicit recent-run limit', async () => {
    const findRecent = jest.fn(() => Promise.resolve([]));
    const controller = controllerWith({}, { findRecent });
    await expect(controller.getRuns('10')).resolves.toEqual([]);
    expect(findRecent).toHaveBeenCalledWith(10);
  });

  it.each(['0', '101', '1.5', '-1', 'abc', '01'])(
    'rejects invalid recent-run limit %s',
    async (limit) => {
      const findRecent = jest.fn();
      const controller = controllerWith({}, { findRecent });
      await expect(controller.getRuns(limit)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(findRecent).not.toHaveBeenCalled();
    },
  );

  it('sanitizes an operational recent-run lookup failure', async () => {
    const controller = controllerWith(
      {},
      { findRecent: jest.fn(() => Promise.reject(new Error('database'))) },
    );
    await expect(controller.getRuns()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns a stored backtest run by UUID', async () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const stored = {
      id,
      createdAt: new Date('2026-09-13T20:30:00.000Z'),
      request: {},
      result: {},
    };
    const controller = controllerWith(
      {},
      {
        findById: jest.fn(() => Promise.resolve(stored)),
      },
    );
    await expect(controller.getRun(id)).resolves.toBe(stored);
  });

  it('rejects an invalid run UUID before repository access', async () => {
    const findById = jest.fn();
    const controller = controllerWith({}, { findById });
    await expect(controller.getRun('not-a-uuid')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(findById).not.toHaveBeenCalled();
  });

  it('returns not found for an absent run', async () => {
    const controller = controllerWith(
      {},
      {
        findById: jest.fn(() => Promise.resolve(undefined)),
      },
    );
    await expect(
      controller.getRun('00000000-0000-4000-8000-000000000001'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sanitizes an operational run lookup failure', async () => {
    const controller = controllerWith(
      {},
      { findById: jest.fn(() => Promise.reject(new Error('database'))) },
    );
    await expect(
      controller.getRun('00000000-0000-4000-8000-000000000001'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('runs fixed BTC/USDT one-minute replay for a valid bounded request', async () => {
    const result = { candleCount: 1 } as BacktestResult;
    const run = jest.fn(() => Promise.resolve(result));
    const controller = controllerWith({ run });

    await expect(
      controller.runReplay({
        startTime: '2026-09-01T00:00:00.000Z',
        endTime: '2026-09-01T00:00:00.000Z',
        limit: 1,
      }),
    ).resolves.toBe(result);
    expect(run).toHaveBeenCalledWith({
      symbol: 'BTC/USDT',
      interval: '1m',
      startTime: new Date('2026-09-01T00:00:00.000Z'),
      endTime: new Date('2026-09-01T00:00:00.000Z'),
      limit: 1,
    });
  });

  it.each([
    null,
    {},
    { startTime: '2026-09-01', endTime: '2026-09-01T00:00:00.000Z', limit: 1 },
    {
      startTime: '2026-09-01T00:01:00.000Z',
      endTime: '2026-09-01T00:00:00.000Z',
      limit: 1,
    },
    {
      startTime: '2026-09-01T00:00:00.000Z',
      endTime: '2026-09-01T00:00:00.000Z',
      limit: 10001,
    },
    {
      startTime: '2026-09-01T00:00:00.000Z',
      endTime: '2026-09-01T00:00:00.000Z',
      limit: 1,
      symbol: 'BTC/USDT',
    },
  ])('rejects an invalid public request %#', async (body) => {
    const controller = controllerWith({ run: jest.fn() });
    await expect(controller.runReplay(body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps internal loading failure to explicit service unavailability', async () => {
    const controller = controllerWith({
      run: jest.fn(() => Promise.reject(new Error('provider details'))),
    });

    await expect(
      controller.runReplay({
        startTime: '2026-09-01T00:00:00.000Z',
        endTime: '2026-09-01T00:00:00.000Z',
        limit: 1,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('validates configuration before running historical simulation', async () => {
    const result = { replay: {}, simulation: {} } as never;
    const runSimulation = jest.fn(() => Promise.resolve(result));
    const controller = controllerWith({ runSimulation });
    const body = simulationRequest();

    await expect(controller.runSimulation(body)).resolves.toBe(result);
    expect(runSimulation).toHaveBeenCalledWith(
      {
        symbol: 'BTC/USDT',
        interval: '1m',
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        limit: body.limit,
      },
      body.configuration,
    );
  });

  it('rejects invalid simulation configuration before calling the service', async () => {
    const runSimulation = jest.fn();
    const controller = controllerWith({ runSimulation });
    const body = simulationRequest();
    body.configuration.feeRate = '1';

    await expect(controller.runSimulation(body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(runSimulation).not.toHaveBeenCalled();
  });

  it('maps simulation loading failure to explicit service unavailability', async () => {
    const controller = controllerWith({
      runSimulation: jest.fn(() => Promise.reject(new Error('database'))),
    });
    await expect(
      controller.runSimulation(simulationRequest()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

function controllerWith(
  service: Partial<HistoricalStrategyReplayService>,
  runs: Partial<BacktestRunService> = {},
): BacktestingController {
  return new BacktestingController(
    service as HistoricalStrategyReplayService,
    new BacktestSimulationRequestValidator(
      new BacktestExecutionRulesValidator(),
    ),
    {
      create: jest.fn(),
      findById: jest.fn(),
      findRecent: jest.fn(),
      ...runs,
    } as BacktestRunService,
  );
}

function simulationRequest() {
  return {
    startTime: '2026-09-01T00:00:00.000Z',
    endTime: '2026-09-01T00:01:00.000Z',
    limit: 2,
    configuration: {
      quantity: '0.001',
      feeRate: '0.001',
      spreadRate: '0.0002',
      slippageRate: '0.0001',
      maximumVolumeParticipationRate: '0.1',
      initialCapitalUsdt: '1000',
      executionRules: {
        minQuantity: '0.00001',
        maxQuantity: '1000',
        stepSize: '0.00001',
        minNotional: '5',
        tickSize: '0.01',
        minPrice: '0.01',
        maxPrice: '1000000',
      },
    },
  };
}
