import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { BacktestResult } from '../domain/backtest';
import { HistoricalStrategyReplayService } from '../application/historical-strategy-replay.service';
import { BacktestingController } from './backtesting.controller';
import { BacktestSimulationRequestValidator } from '../application/backtest-simulation-request-validator';
import { BacktestExecutionRulesValidator } from '../application/backtest-execution-rules-validator';

describe('BacktestingController', () => {
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
): BacktestingController {
  return new BacktestingController(
    service as HistoricalStrategyReplayService,
    new BacktestSimulationRequestValidator(
      new BacktestExecutionRulesValidator(),
    ),
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
