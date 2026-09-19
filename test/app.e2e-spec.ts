import { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import { createHash } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { LatestPairMetadataService } from '../src/modules/market-data/application/latest-pair-metadata.service';
import { LatestTopOfBookService } from '../src/modules/market-data/application/latest-top-of-book.service';
import { LatestMarketPriceService } from '../src/modules/market-data/application/latest-market-price.service';
import {
  PAIR_METADATA_PROVIDER,
  PairMetadataProvider,
} from '../src/modules/market-data/domain/pair-metadata-provider';
import {
  TICKER_STREAM,
  TickerStream,
} from '../src/modules/market-data/domain/ticker-stream';
import {
  TRADE_STREAM,
  TradeStream,
} from '../src/modules/market-data/domain/trade-stream';
import {
  CANDLE_STREAM,
  CandleStream,
} from '../src/modules/market-data/domain/candle-stream';
import {
  TOP_OF_BOOK_STREAM,
  TopOfBookStream,
} from '../src/modules/market-data/domain/top-of-book-stream';
import {
  SPOT_SYMBOL_CATALOG_PROVIDER,
  SpotSymbolCatalogProvider,
} from '../src/modules/new-listings/domain/spot-symbol-catalog';
import { PaperWalletService } from '../src/modules/paper-wallet/application/paper-wallet.service';
import { PaperTradingExecutor } from '../src/modules/paper-trading/application/paper-trading.executor';
import {
  PAPER_EXECUTION_REPOSITORY,
  PaperDailyLossLimitReachedError,
  PaperExecutionRepository,
  PaperPositionLimitExceededError,
} from '../src/modules/paper-trading/domain/paper-execution-repository';
import { PaperMarketBuyQuote } from '../src/modules/paper-trading/domain/paper-market-buy-quote';
import { PaperMarketSellQuote } from '../src/modules/paper-trading/domain/paper-market-sell-quote';
import { EmergencyStopService } from '../src/modules/risk-engine/application/emergency-stop.service';
import {
  EXECUTION_RATE_LIMITER,
  ExecutionRateLimiter,
} from '../src/modules/risk-engine/domain/execution-rate-limiter';
import { REDIS_CLIENT } from '../src/infrastructure/redis/redis.constants';
import Redis from 'ioredis';
import { StrategySignalReadModelService } from '../src/modules/strategies/application/strategy-signal-read-model.service';
import { HistoricalStrategyReplayService } from '../src/modules/backtesting/application/historical-strategy-replay.service';
import { BacktestResult } from '../src/modules/backtesting/domain/backtest';
import { HistoricalBacktestSimulationResult } from '../src/modules/backtesting/domain/backtest-simulation';
import { BacktestRunService } from '../src/modules/backtesting/application/backtest-run.service';

describe('Application (e2e)', () => {
  let app: INestApplication;
  let latestMarketPrice: LatestMarketPriceService;
  const runHistoricalReplay = jest.fn(() =>
    Promise.resolve(historicalReplayResult()),
  );
  const runHistoricalSimulation = jest.fn(() =>
    Promise.resolve(historicalSimulationResult()),
  );
  const createBacktestRun = jest.fn(() =>
    Promise.resolve({
      id: '00000000-0000-0000-0000-000000000001',
      createdAt: new Date('2026-09-13T20:30:00.000Z'),
      replayed: false,
      request: {},
      result: {},
    }),
  );
  const findBacktestRun = jest.fn(() =>
    Promise.resolve({
      id: '00000000-0000-4000-8000-000000000001',
      createdAt: new Date('2026-09-13T20:30:00.000Z'),
      request: { symbol: 'BTC/USDT' },
      result: { totalNetReturnUsdt: '1.25' },
    }),
  );
  const findRecentBacktestRuns = jest.fn(() =>
    Promise.resolve([
      {
        id: '00000000-0000-4000-8000-000000000002',
        createdAt: new Date('2026-09-13T20:31:00.000Z'),
        request: { symbol: 'BTC/USDT' },
        result: { totalNetReturnUsdt: '2.50' },
      },
    ]),
  );
  const deleteBacktestRun = jest.fn(() => Promise.resolve(true));

  beforeAll(async () => {
    const pairMetadataProvider: PairMetadataProvider = {
      load: () => Promise.resolve(null),
    };
    const tickerStream: TickerStream = {
      start: () => undefined,
      stop: () => undefined,
    };
    const tradeStream: TradeStream = {
      start: () => undefined,
      stop: () => undefined,
    };
    const candleStream: CandleStream = {
      start: () => undefined,
      stop: () => undefined,
    };
    const topOfBookStream: TopOfBookStream = {
      start: () => undefined,
      stop: () => undefined,
    };
    const spotSymbolCatalogProvider: SpotSymbolCatalogProvider = {
      load: () =>
        Promise.resolve({
          symbols: [],
          receivedAt: new Date(),
        }),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAIR_METADATA_PROVIDER)
      .useValue(pairMetadataProvider)
      .overrideProvider(TICKER_STREAM)
      .useValue(tickerStream)
      .overrideProvider(TRADE_STREAM)
      .useValue(tradeStream)
      .overrideProvider(CANDLE_STREAM)
      .useValue(candleStream)
      .overrideProvider(TOP_OF_BOOK_STREAM)
      .useValue(topOfBookStream)
      .overrideProvider(SPOT_SYMBOL_CATALOG_PROVIDER)
      .useValue(spotSymbolCatalogProvider)
      .overrideProvider(HistoricalStrategyReplayService)
      .useValue({
        run: runHistoricalReplay,
        runSimulation: runHistoricalSimulation,
      })
      .overrideProvider(BacktestRunService)
      .useValue({
        create: createBacktestRun,
        findById: findBacktestRun,
        findRecent: findRecentBacktestRuns,
        deleteById: deleteBacktestRun,
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    app.get(ConfigService).set('RISK_MAX_EXECUTIONS_PER_WINDOW', 1000);
    latestMarketPrice = app.get(LatestMarketPriceService);
  }, 30_000);

  afterAll(async () => app.close());

  it('/health (GET)', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    return request(server).get('/health').expect(200);
  });

  it('/new-listings/summary (GET) exposes aggregate detection coverage', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/new-listings/summary?provider=binance&spotTradingAllowed=true')
      .expect(200);
  });

  it('/new-listings/performance (GET) validates bounded cohort input', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/new-listings/performance?limit=101')
      .expect(400);
  });

  it('/new-listings/classification (GET) requires thresholds', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/new-listings/classification').expect(400);
  });

  it('/new-listings/classification/magnitudes (GET) requires thresholds', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/new-listings/classification/magnitudes')
      .expect(400);
  });

  it('/new-listings/:provider/:symbol/observations validates identity', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/new-listings/other/NEWUSDT/observations')
      .expect(400);
  });

  it('/new-listings/:provider/:symbol/performance validates identity', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/new-listings/binance/newusdt/performance')
      .expect(400);
  });

  it('/new-listings/:provider/:symbol/classification requires thresholds', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get('/new-listings/binance/NEWUSDT/classification')
      .expect(400);
  });

  it('/backtesting/replay (POST) exposes bounded deterministic replay', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const body = {
      startTime: '2026-09-01T00:00:00.000Z',
      endTime: '2026-09-01T00:00:00.000Z',
      limit: 1,
    };

    await request(server)
      .post('/backtesting/replay')
      .send(body)
      .expect(200)
      .expect(serializeHistoricalReplayResult(historicalReplayResult()));
    expect(runHistoricalReplay).toHaveBeenCalledWith({
      symbol: 'BTC/USDT',
      interval: '1m',
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      limit: 1,
    });
  });

  it('/backtesting/simulate (POST) exposes explicit research simulation', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const body = historicalSimulationRequest();

    await request(server)
      .post('/backtesting/simulate')
      .send(body)
      .expect(200)
      .expect(historicalSimulationResult());
    expect(runHistoricalSimulation).toHaveBeenCalledWith(
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

  it('/backtesting/runs (POST) persists an idempotent research run', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const body = historicalSimulationRequest();

    await request(server)
      .post('/backtesting/runs')
      .set('Idempotency-Key', 'e2e-backtest-run')
      .send(body)
      .expect(200)
      .expect({
        id: '00000000-0000-0000-0000-000000000001',
        createdAt: '2026-09-13T20:30:00.000Z',
        replayed: false,
        request: {},
        result: {},
      });
    expect(createBacktestRun).toHaveBeenCalledWith(
      'e2e-backtest-run',
      expect.objectContaining({ symbol: 'BTC/USDT', interval: '1m', limit: 2 }),
      body.configuration,
    );
  });

  it('/backtesting/runs/:id (GET) returns an immutable stored run', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const id = '00000000-0000-4000-8000-000000000001';

    await request(server)
      .get(`/backtesting/runs/${id}`)
      .expect(200)
      .expect({
        id,
        createdAt: '2026-09-13T20:30:00.000Z',
        request: { symbol: 'BTC/USDT' },
        result: { totalNetReturnUsdt: '1.25' },
      });
    expect(findBacktestRun).toHaveBeenCalledWith(id);
  });

  it('/backtesting/runs/:id (DELETE) deletes one stored run', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const id = '00000000-0000-4000-8000-000000000001';

    await request(server).delete(`/backtesting/runs/${id}`).expect(204);
    expect(deleteBacktestRun).toHaveBeenCalledWith(id);
  });

  it('/backtesting/runs (GET) returns cursor-paginated immutable runs', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const cursor = '00000000-0000-4000-8000-000000000001';
    const createdFrom = '2026-09-01T00:00:00.000Z';
    const createdTo = '2026-09-30T23:59:59.999Z';

    await request(server)
      .get(
        `/backtesting/runs?limit=1&cursor=${cursor}&createdFrom=${createdFrom}&createdTo=${createdTo}`,
      )
      .expect(200)
      .expect([
        {
          id: '00000000-0000-4000-8000-000000000002',
          createdAt: '2026-09-13T20:31:00.000Z',
          request: { symbol: 'BTC/USDT' },
          result: { totalNetReturnUsdt: '2.50' },
        },
      ]);
    expect(findRecentBacktestRuns).toHaveBeenCalledWith(
      1,
      cursor,
      new Date(createdFrom),
      new Date(createdTo),
    );
  });

  it('/backtesting/runs (GET) rejects a malformed cursor', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/backtesting/runs?cursor=invalid').expect(400);
  });

  it('/backtesting/runs (GET) rejects an inverted creation range', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get(
        '/backtesting/runs?createdFrom=2026-09-02T00:00:00.000Z&createdTo=2026-09-01T00:00:00.000Z',
      )
      .expect(400);
  });

  it('persists strategy signals idempotently and serves them after memory-independent reads', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const prisma = app.get(PrismaService);
    const signals = app.get(StrategySignalReadModelService);
    const suffix = Date.now() % 1000;
    const firstCloseTime = new Date(
      `2099-01-01T00:00:00.${String(suffix).padStart(3, '0')}Z`,
    );
    const secondCloseTime = new Date(firstCloseTime.getTime() + 60_000);
    const makeSignal = (
      latestCandleCloseTime: Date,
      action: 'hold' | 'buy',
    ) => ({
      strategy: 'moving_average_crossover' as const,
      symbol: 'BTC/USDT' as const,
      action,
      reason:
        action === 'buy'
          ? ('bullish_moving_average_crossover' as const)
          : ('no_moving_average_crossover' as const),
      shortPeriod: 3,
      longPeriod: 5,
      previousShortAverage: '9',
      previousLongAverage: '10',
      currentShortAverage:
        action === 'buy' ? '11.123456789012345678901234567890123456789' : '10',
      currentLongAverage: '10',
      latestCandleCloseTime,
      evaluatedAt: new Date(latestCandleCloseTime.getTime() + 100),
    });
    const first = makeSignal(firstCloseTime, 'hold');
    const latest = makeSignal(secondCloseTime, 'buy');

    try {
      await signals.record(first);
      await signals.record(first);
      await signals.record(latest);

      await expect(
        prisma.strategySignal.count({
          where: {
            latestCandleCloseTime: { in: [firstCloseTime, secondCloseTime] },
          },
        }),
      ).resolves.toBe(2);
      await request(server)
        .get('/strategies/signals?limit=2')
        .expect(200)
        .expect([serializeSignal(latest), serializeSignal(first)]);
      await request(server)
        .get('/strategies/signals/latest')
        .expect(200)
        .expect(serializeSignal(latest));
    } finally {
      await prisma.strategySignal.deleteMany({
        where: {
          latestCandleCloseTime: { in: [firstCloseTime, secondCloseTime] },
        },
      });
    }
  });

  it('atomically limits distinct approved execution keys in Redis', async () => {
    const limiter = app.get<ExecutionRateLimiter>(EXECUTION_RATE_LIMITER);
    const redis = app.get<Redis>(REDIS_CLIENT);
    const config = app.get(ConfigService);
    const key = 'risk:paper-execution:fixed-window';
    const suffix = Date.now();
    config.set('RISK_MAX_EXECUTIONS_PER_WINDOW', 2);
    config.set('RISK_EXECUTION_WINDOW_MS', 50);
    await redis.del(key);

    try {
      const results = await Promise.allSettled([
        limiter.consume(`e2e-rate-a-${suffix}`),
        limiter.consume(`e2e-rate-b-${suffix}`),
        limiter.consume(`e2e-rate-c-${suffix}`),
      ]);
      expect(
        results.filter(({ status }) => status === 'fulfilled'),
      ).toHaveLength(2);
      expect(
        results.filter(({ status }) => status === 'rejected'),
      ).toHaveLength(1);

      await expect(
        limiter.consume(`e2e-rate-a-${suffix}`),
      ).resolves.toMatchObject({
        count: 2,
        limit: 2,
      });
      await new Promise((resolve) => setTimeout(resolve, 75));
      await expect(
        limiter.consume(`e2e-rate-new-${suffix}`),
      ).resolves.toMatchObject({
        count: 1,
        limit: 2,
      });
    } finally {
      await redis.del(key);
      config.set('RISK_MAX_EXECUTIONS_PER_WINDOW', 1000);
      config.set('RISK_EXECUTION_WINDOW_MS', 60000);
    }
  });

  it('persists and idempotently controls the paper emergency stop', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const emergencyStop = app.get(EmergencyStopService);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const config = app.get(ConfigService);
    const suffix = Date.now();
    const activateId = `e2e-stop-on-${suffix}`;
    const disableId = `e2e-stop-off-${suffix}`;
    const rejectedOrderId = `e2e-stop-order-${suffix}`;
    const controlToken = `e2e-control-token-${suffix}`;
    const controlTokenHash = createHash('sha256')
      .update(controlToken)
      .digest('hex');
    const previousTokenHash = config.get<string>('RISK_CONTROL_TOKEN_SHA256');
    const before = await wallet.getBalances();

    try {
      config.set('RISK_CONTROL_TOKEN_SHA256', '');
      await request(server)
        .put('/risk/emergency-stop')
        .set('Idempotency-Key', activateId)
        .send({ active: true, reason: 'e2e safety review' })
        .expect(503);
      config.set('RISK_CONTROL_TOKEN_SHA256', controlTokenHash);
      await request(server)
        .put('/risk/emergency-stop')
        .set('Idempotency-Key', activateId)
        .set('Authorization', 'Bearer wrong-token')
        .send({ active: true, reason: 'e2e safety review' })
        .expect(401);
      await request(server)
        .put('/risk/emergency-stop')
        .set('Idempotency-Key', activateId)
        .set('Authorization', `Bearer ${controlToken}`)
        .send({ active: true, reason: 'e2e safety review' })
        .expect(200)
        .expect((response) => {
          expect(response.body).toMatchObject({
            active: true,
            source: 'persisted',
            changeId: activateId,
            reason: 'e2e safety review',
            replayed: false,
          });
        });
      await request(server)
        .put('/risk/emergency-stop')
        .set('Idempotency-Key', activateId)
        .set('Authorization', `Bearer ${controlToken}`)
        .send({ active: true, reason: 'e2e safety review' })
        .expect(200)
        .expect((response) => {
          expect((response.body as { replayed: boolean }).replayed).toBe(true);
        });
      await request(server)
        .put('/risk/emergency-stop')
        .set('Idempotency-Key', activateId)
        .set('Authorization', `Bearer ${controlToken}`)
        .send({ active: false, reason: 'different change' })
        .expect(409);

      await emergencyStop.onModuleInit();
      await request(server)
        .get('/risk/emergency-stop')
        .expect(200)
        .expect((response) => {
          expect(response.body).toMatchObject({
            active: true,
            source: 'persisted',
            changeId: activateId,
            replayed: false,
          });
        });

      preparePaperMarket(app);
      await expect(
        executor.execute({
          idempotencyKey: rejectedOrderId,
          symbol: 'BTC/USDT',
          side: 'buy',
          quantity: '0.0001',
        }),
      ).rejects.toThrow('emergency_stop_active');
      await expect(wallet.getBalances()).resolves.toEqual(before);
      await expect(
        prisma.paperExecution.findUnique({ where: { id: rejectedOrderId } }),
      ).resolves.toBeNull();

      await request(server)
        .put('/risk/emergency-stop')
        .set('Idempotency-Key', disableId)
        .set('Authorization', `Bearer ${controlToken}`)
        .send({ active: false, reason: 'e2e cleanup' })
        .expect(200)
        .expect((response) => {
          expect((response.body as { active: boolean }).active).toBe(false);
        });
    } finally {
      config.set('RISK_CONTROL_TOKEN_SHA256', previousTokenHash);
      if (emergencyStop.isActive()) {
        await emergencyStop.change(disableId, false, 'e2e cleanup');
      }
      await prisma.riskControlEvent.deleteMany({
        where: { id: { in: [activateId, disableId] } },
      });
      await prisma.paperExecution.deleteMany({
        where: { id: rejectedOrderId },
      });
    }
  });

  it('/paper-wallet/balances (GET)', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    return request(server)
      .get('/paper-wallet/balances')
      .expect(200)
      .expect({ BTC: '0', USDT: '1000' });
  });

  it('/paper-wallet/valuation (GET) returns 503 without a price', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    return request(server).get('/paper-wallet/valuation').expect(503);
  });

  it('/paper-wallet/valuation (GET) returns the current valuation', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    latestMarketPrice.update({
      provider: 'binance',
      symbol: 'BTC/USDT',
      lastPrice: '77777.12',
      eventTime: new Date('2026-09-11T12:00:00.000Z'),
      receivedAt: new Date(),
    });

    return request(server).get('/paper-wallet/valuation').expect(200).expect({
      quoteAsset: 'USDT',
      btcBalance: '0',
      btcPrice: '77777.12',
      btcValue: '0',
      usdtBalance: '1000',
      totalValue: '1000',
      pricedAt: '2026-09-11T12:00:00.000Z',
    });
  });

  it('/paper-wallet/valuation (GET) returns 503 for a stale price', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    latestMarketPrice.update({
      provider: 'binance',
      symbol: 'BTC/USDT',
      lastPrice: '77777.12',
      eventTime: new Date('2026-09-11T12:00:00.000Z'),
      receivedAt: new Date(Date.now() - 10001),
    });

    return request(server).get('/paper-wallet/valuation').expect(503);
  });

  it('preserves a persisted balance across wallet reinitialization', async () => {
    const wallet = app.get(PaperWalletService);

    await expect(wallet.credit('BTC', '0.00000001')).resolves.toBe(
      '0.00000001',
    );
    await wallet.onModuleInit();
    await expect(wallet.getBalance('BTC')).resolves.toBe('0.00000001');
    await expect(wallet.debit('BTC', '0.00000001')).resolves.toBe('0');
  });

  it('executes and replays an idempotent paper buy atomically', async () => {
    preparePaperMarket(app);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const idempotencyKey = `e2e-buy-${Date.now()}`;
    const before = await wallet.getBalances();

    const first = await executor.execute({
      idempotencyKey,
      symbol: 'BTC/USDT',
      side: 'buy',
      quantity: '0.0001',
    });
    const afterFirst = await wallet.getBalances();
    const replay = await executor.execute({
      idempotencyKey,
      symbol: 'BTC/USDT',
      side: 'buy',
      quantity: '0.0001',
    });
    const afterReplay = await wallet.getBalances();

    try {
      if (first.side !== 'buy' || replay.side !== 'buy')
        throw new Error('Expected buy executions');
      expect(first.replayed).toBe(false);
      expect(replay).toEqual({ ...first, replayed: true });
      expect(afterReplay).toEqual(afterFirst);
      expect(afterFirst.BTC).toBe(
        new Decimal(before.BTC).plus(first.quantity).toFixed(),
      );
      expect(afterFirst.USDT).toBe(
        new Decimal(before.USDT).minus(first.totalCost).toFixed(),
      );
    } finally {
      await prisma.paperExecution.delete({ where: { id: idempotencyKey } });
      await wallet.debit('BTC', first.quantity);
      if (first.side === 'buy') await wallet.credit('USDT', first.totalCost);
    }
  });

  it('rolls back a paper buy when USDT is insufficient', async () => {
    preparePaperMarket(app);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const idempotencyKey = `e2e-rejected-${Date.now()}`;
    const before = await wallet.getBalances();
    const heldUsdt = new Decimal(before.USDT).minus('1').toFixed();
    await wallet.debit('USDT', heldUsdt);

    try {
      await expect(
        executor.execute({
          idempotencyKey,
          symbol: 'BTC/USDT',
          side: 'buy',
          quantity: '0.0001',
        }),
      ).rejects.toThrow('Insufficient USDT paper balance');
      await expect(
        prisma.paperExecution.findUnique({ where: { id: idempotencyKey } }),
      ).resolves.toBeNull();
    } finally {
      await wallet.credit('USDT', heldUsdt);
    }
    await expect(wallet.getBalances()).resolves.toEqual(before);
  });

  it('rejects a paper buy above the risk notional limit without mutation', async () => {
    preparePaperMarket(app);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const idempotencyKey = `e2e-risk-rejected-${Date.now()}`;
    const before = await wallet.getBalances();

    await expect(
      executor.execute({
        idempotencyKey,
        symbol: 'BTC/USDT',
        side: 'buy',
        quantity: '0.0021',
      }),
    ).rejects.toThrow('Paper order rejected by risk');

    await expect(wallet.getBalances()).resolves.toEqual(before);
    await expect(
      prisma.paperExecution.findUnique({ where: { id: idempotencyKey } }),
    ).resolves.toBeNull();
  });

  it('rejects excessive top-of-book participation without mutation', async () => {
    preparePaperMarket(app);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const idempotencyKey = `e2e-liquidity-risk-${Date.now()}`;
    const before = await wallet.getBalances();
    app.get(LatestTopOfBookService).update({
      provider: 'binance',
      symbol: 'BTC/USDT',
      updateId: 'liquidity-risk',
      bidPrice: '49999.99',
      bidQuantity: '1',
      askPrice: '50000',
      askQuantity: '0.0005',
      receivedAt: new Date(),
    });

    await expect(
      executor.execute({
        idempotencyKey,
        symbol: 'BTC/USDT',
        side: 'buy',
        quantity: '0.0001',
      }),
    ).rejects.toThrow('top_of_book_participation_exceeded');
    await expect(wallet.getBalances()).resolves.toEqual(before);
    await expect(
      prisma.paperExecution.findUnique({ where: { id: idempotencyKey } }),
    ).resolves.toBeNull();
  });

  it('rejects new paper executions while the emergency stop is active', async () => {
    preparePaperMarket(app);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const emergencyStop = app.get(EmergencyStopService);
    const idempotencyKey = `e2e-emergency-stop-${Date.now()}`;
    const activateId = `${idempotencyKey}-on`;
    const disableId = `${idempotencyKey}-off`;
    const before = await wallet.getBalances();
    await emergencyStop.change(activateId, true, 'e2e rejection check');

    try {
      await expect(
        executor.execute({
          idempotencyKey,
          symbol: 'BTC/USDT',
          side: 'buy',
          quantity: '0.0001',
        }),
      ).rejects.toThrow('emergency_stop_active');
      await expect(wallet.getBalances()).resolves.toEqual(before);
      await expect(
        prisma.paperExecution.findUnique({ where: { id: idempotencyKey } }),
      ).resolves.toBeNull();
    } finally {
      await emergencyStop.change(disableId, false, 'e2e cleanup');
      await prisma.riskControlEvent.deleteMany({
        where: { id: { in: [activateId, disableId] } },
      });
    }
  });

  it('rejects a buy above the cumulative BTC position limit without mutation', async () => {
    preparePaperMarket(app);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const config = app.get(ConfigService);
    const idempotencyKey = `e2e-position-risk-${Date.now()}`;
    const before = await wallet.getBalances();
    config.set('RISK_MAX_BTC_POSITION_QUANTITY', '0.00005');

    try {
      await expect(
        executor.execute({
          idempotencyKey,
          symbol: 'BTC/USDT',
          side: 'buy',
          quantity: '0.0001',
        }),
      ).rejects.toThrow('max_btc_position_quantity_exceeded');
      await expect(wallet.getBalances()).resolves.toEqual(before);
      await expect(
        prisma.paperExecution.findUnique({ where: { id: idempotencyKey } }),
      ).resolves.toBeNull();
    } finally {
      config.set('RISK_MAX_BTC_POSITION_QUANTITY', '0.01');
    }
  });

  it('rejects a new buy after the UTC daily realized loss limit is reached', async () => {
    preparePaperMarket(app);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const config = app.get(ConfigService);
    const suffix = Date.now();
    const buyId = `e2e-daily-loss-buy-${suffix}`;
    const sellId = `e2e-daily-loss-sell-${suffix}`;
    const rejectedId = `e2e-daily-loss-rejected-${suffix}`;
    const before = await wallet.getBalances();
    const now = new Date();
    const buyTime = new Date(now.getTime() - 2000);
    const sellTime = new Date(now.getTime() - 1000);
    await prisma.paperExecution.createMany({
      data: [
        {
          id: buyId,
          symbol: 'BTC/USDT',
          side: 'buy',
          quantity: '0.0001',
          price: '50000',
          notional: '5',
          feeRate: '0.001',
          fee: '0.005',
          totalCost: '5.005',
          quotedAt: buyTime,
          marketDataReceivedAt: buyTime,
          executedAt: buyTime,
        },
        {
          id: sellId,
          symbol: 'BTC/USDT',
          side: 'sell',
          quantity: '0.0001',
          price: '40000',
          notional: '4',
          feeRate: '0.001',
          fee: '0.004',
          netProceeds: '3.996',
          quotedAt: sellTime,
          marketDataReceivedAt: sellTime,
          executedAt: sellTime,
        },
      ],
    });
    config.set('RISK_MAX_DAILY_REALIZED_LOSS_USDT', '1');

    try {
      await expect(
        executor.execute({
          idempotencyKey: rejectedId,
          symbol: 'BTC/USDT',
          side: 'buy',
          quantity: '0.0001',
        }),
      ).rejects.toThrow('max_daily_realized_loss_reached');
      await expect(wallet.getBalances()).resolves.toEqual(before);
      await expect(
        prisma.paperExecution.findUnique({ where: { id: rejectedId } }),
      ).resolves.toBeNull();
    } finally {
      config.set('RISK_MAX_DAILY_REALIZED_LOSS_USDT', '25');
      await prisma.paperExecution.deleteMany({
        where: { id: { in: [buyId, sellId, rejectedId] } },
      });
    }
  });

  it('rejects a new buy at the net unrealized loss limit without mutation', async () => {
    preparePaperMarket(app);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const config = app.get(ConfigService);
    const suffix = Date.now();
    const historicalBuyId = `e2e-unrealized-loss-history-${suffix}`;
    const rejectedId = `e2e-unrealized-loss-rejected-${suffix}`;
    const before = await wallet.getBalances();
    const now = new Date();
    await prisma.paperExecution.create({
      data: {
        id: historicalBuyId,
        symbol: 'BTC/USDT',
        side: 'buy',
        quantity: '0.0001',
        price: '100000',
        notional: '10',
        feeRate: '0.001',
        fee: '0.01',
        totalCost: '10.01',
        quotedAt: now,
        marketDataReceivedAt: now,
        executedAt: now,
      },
    });
    config.set('RISK_MAX_UNREALIZED_LOSS_USDT', '5');

    try {
      await expect(
        executor.execute({
          idempotencyKey: rejectedId,
          symbol: 'BTC/USDT',
          side: 'buy',
          quantity: '0.0001',
        }),
      ).rejects.toThrow('max_unrealized_loss_reached');
      await expect(wallet.getBalances()).resolves.toEqual(before);
      await expect(
        prisma.paperExecution.findUnique({ where: { id: rejectedId } }),
      ).resolves.toBeNull();
    } finally {
      config.set('RISK_MAX_UNREALIZED_LOSS_USDT', '25');
      await prisma.paperExecution.deleteMany({
        where: { id: { in: [historicalBuyId, rejectedId] } },
      });
    }
  });

  it('atomically allows only one of two buys competing for the remaining BTC limit', async () => {
    const repository = app.get<PaperExecutionRepository>(
      PAPER_EXECUTION_REPOSITORY,
    );
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const config = app.get(ConfigService);
    const before = await wallet.getBalances();
    const quantity = '0.0001';
    const totalCost = '5.005';
    const positionLimit = new Decimal(before.BTC).plus(quantity).toFixed();
    const firstId = `e2e-atomic-position-a-${Date.now()}`;
    const secondId = `e2e-atomic-position-b-${Date.now()}`;
    const quotedAt = new Date();
    const quote = (id: string): [string, PaperMarketBuyQuote] => [
      id,
      {
        symbol: 'BTC/USDT',
        side: 'buy',
        quantity,
        topOfBookAvailableQuantity: '1',
        price: '50000',
        notional: '5',
        feeRate: '0.001',
        fee: '0.005',
        totalCost,
        quotedAt,
        marketDataReceivedAt: quotedAt,
      },
    ];
    config.set('RISK_MAX_BTC_POSITION_QUANTITY', positionLimit);

    try {
      const results = await Promise.allSettled([
        repository.executeBuy(...quote(firstId)),
        repository.executeBuy(...quote(secondId)),
      ]);
      const fulfilled = results.filter(
        (result) => result.status === 'fulfilled',
      );
      const rejected = results.filter((result) => result.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toBeInstanceOf(
        PaperPositionLimitExceededError,
      );
      await expect(wallet.getBalances()).resolves.toEqual({
        BTC: positionLimit,
        USDT: new Decimal(before.USDT).minus(totalCost).toFixed(),
      });
      await expect(
        prisma.paperExecution.count({
          where: { id: { in: [firstId, secondId] } },
        }),
      ).resolves.toBe(1);
    } finally {
      await prisma.paperExecution.deleteMany({
        where: { id: { in: [firstId, secondId] } },
      });
      const current = await wallet.getBalances();
      if (current.BTC !== before.BTC) await wallet.debit('BTC', quantity);
      if (current.USDT !== before.USDT) await wallet.credit('USDT', totalCost);
      config.set('RISK_MAX_BTC_POSITION_QUANTITY', '0.01');
    }
  });

  it('atomically observes a concurrent realized loss before accepting a new buy', async () => {
    const repository = app.get<PaperExecutionRepository>(
      PAPER_EXECUTION_REPOSITORY,
    );
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const config = app.get(ConfigService);
    const before = await wallet.getBalances();
    const suffix = Date.now();
    const historicalBuyId = `e2e-atomic-loss-history-${suffix}`;
    const sellId = `e2e-atomic-loss-sell-${suffix}`;
    const rejectedBuyId = `e2e-atomic-loss-buy-${suffix}`;
    const now = new Date();
    const quantity = '0.0001';
    const sellQuote: PaperMarketSellQuote = {
      symbol: 'BTC/USDT',
      side: 'sell',
      quantity,
      topOfBookAvailableQuantity: '1',
      price: '40000',
      notional: '4',
      feeRate: '0.001',
      fee: '0.004',
      netProceeds: '3.996',
      quotedAt: now,
      marketDataReceivedAt: now,
    };
    const buyQuote: PaperMarketBuyQuote = {
      symbol: 'BTC/USDT',
      side: 'buy',
      quantity,
      topOfBookAvailableQuantity: '1',
      price: '50000',
      notional: '5',
      feeRate: '0.001',
      fee: '0.005',
      totalCost: '5.005',
      quotedAt: now,
      marketDataReceivedAt: now,
    };
    await prisma.paperExecution.create({
      data: {
        id: historicalBuyId,
        symbol: 'BTC/USDT',
        side: 'buy',
        quantity,
        price: '50000',
        notional: '5',
        feeRate: '0.001',
        fee: '0.005',
        totalCost: '5.005',
        quotedAt: now,
        marketDataReceivedAt: now,
        executedAt: now,
      },
    });
    await wallet.credit('BTC', quantity);
    config.set('RISK_MAX_DAILY_REALIZED_LOSS_USDT', '1');

    let releaseLock = () => undefined;
    let confirmLock = () => undefined;
    const lockHeld = new Promise<void>((resolve) => (confirmLock = resolve));
    const lockRelease = new Promise<void>((resolve) => (releaseLock = resolve));
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT 1 AS locked
          FROM (SELECT pg_advisory_xact_lock(20260912, 1)) AS financial_lock
        `;
        confirmLock();
        await lockRelease;
      },
      { timeout: 10_000 },
    );

    try {
      await lockHeld;
      const sell = repository.executeSell(sellId, sellQuote);
      await waitForAdvisoryWaiter(prisma);
      const buy = repository.executeBuy(rejectedBuyId, buyQuote, now).then(
        (value) => ({ value, error: undefined }),
        (error: unknown) => ({ value: undefined, error }),
      );
      releaseLock();
      await holder;

      await expect(sell).resolves.toMatchObject({ id: sellId, side: 'sell' });
      const buyResult = await buy;
      expect(buyResult.value).toBeUndefined();
      expect(buyResult.error).toBeInstanceOf(PaperDailyLossLimitReachedError);
      await expect(
        prisma.paperExecution.findUnique({ where: { id: rejectedBuyId } }),
      ).resolves.toBeNull();
    } finally {
      releaseLock();
      await holder.catch(() => undefined);
      config.set('RISK_MAX_DAILY_REALIZED_LOSS_USDT', '25');
      await prisma.paperExecution.deleteMany({
        where: {
          id: { in: [historicalBuyId, sellId, rejectedBuyId] },
        },
      });
      const current = await wallet.getBalances();
      const btcDifference = new Decimal(current.BTC).minus(before.BTC);
      const usdtDifference = new Decimal(current.USDT).minus(before.USDT);
      if (btcDifference.greaterThan(0))
        await wallet.debit('BTC', btcDifference.toFixed());
      if (btcDifference.lessThan(0))
        await wallet.credit('BTC', btcDifference.negated().toFixed());
      if (usdtDifference.greaterThan(0))
        await wallet.debit('USDT', usdtDifference.toFixed());
      if (usdtDifference.lessThan(0))
        await wallet.credit('USDT', usdtDifference.negated().toFixed());
    }
  });

  it('executes and replays an idempotent paper sell atomically', async () => {
    preparePaperMarket(app);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const idempotencyKey = `e2e-sell-${Date.now()}`;
    await wallet.credit('BTC', '0.0002');
    const before = await wallet.getBalances();

    const first = await executor.execute({
      idempotencyKey,
      symbol: 'BTC/USDT',
      side: 'sell',
      quantity: '0.0002',
    });
    const afterFirst = await wallet.getBalances();
    const replay = await executor.execute({
      idempotencyKey,
      symbol: 'BTC/USDT',
      side: 'sell',
      quantity: '0.0002',
    });
    const afterReplay = await wallet.getBalances();

    try {
      if (first.side !== 'sell' || replay.side !== 'sell')
        throw new Error('Expected sell executions');
      expect(first.replayed).toBe(false);
      expect(replay).toEqual({ ...first, replayed: true });
      expect(afterReplay).toEqual(afterFirst);
      expect(afterFirst.BTC).toBe(
        new Decimal(before.BTC).minus(first.quantity).toFixed(),
      );
      expect(afterFirst.USDT).toBe(
        new Decimal(before.USDT).plus(first.netProceeds).toFixed(),
      );
    } finally {
      await prisma.paperExecution.delete({ where: { id: idempotencyKey } });
      await wallet.credit('BTC', first.quantity);
      if (first.side === 'sell') await wallet.debit('USDT', first.netProceeds);
      await wallet.debit('BTC', '0.0002');
    }
  });

  it('rolls back a paper sell when BTC is insufficient', async () => {
    preparePaperMarket(app);
    const executor = app.get(PaperTradingExecutor);
    const wallet = app.get(PaperWalletService);
    const prisma = app.get(PrismaService);
    const idempotencyKey = `e2e-sell-rejected-${Date.now()}`;
    const before = await wallet.getBalances();

    await expect(
      executor.execute({
        idempotencyKey,
        symbol: 'BTC/USDT',
        side: 'sell',
        quantity: '0.0002',
      }),
    ).rejects.toThrow('Insufficient BTC paper balance');

    await expect(wallet.getBalances()).resolves.toEqual(before);
    await expect(
      prisma.paperExecution.findUnique({ where: { id: idempotencyKey } }),
    ).resolves.toBeNull();
  });

  it('lists bounded buy and sell execution history newest first', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const prisma = app.get(PrismaService);
    const suffix = Date.now();
    const buyId = `e2e-history-buy-${suffix}`;
    const sellId = `e2e-history-sell-${suffix}`;
    const quotedAt = new Date('2099-01-01T00:00:00.000Z');
    const receivedAt = new Date('2098-12-31T23:59:59.000Z');
    const buyExecutedAt = new Date('2099-01-01T00:00:01.000Z');
    const sellExecutedAt = new Date('2099-01-01T00:00:02.000Z');

    await prisma.paperExecution.createMany({
      data: [
        {
          id: buyId,
          symbol: 'BTC/USDT',
          side: 'buy',
          quantity: '0.001',
          price: '50000',
          notional: '50',
          feeRate: '0.001',
          fee: '0.05',
          totalCost: '50.05',
          quotedAt,
          marketDataReceivedAt: receivedAt,
          executedAt: buyExecutedAt,
        },
        {
          id: sellId,
          symbol: 'BTC/USDT',
          side: 'sell',
          quantity: '0.001',
          price: '51000',
          notional: '51',
          feeRate: '0.001',
          fee: '0.051',
          netProceeds: '50.949',
          quotedAt,
          marketDataReceivedAt: receivedAt,
          executedAt: sellExecutedAt,
        },
      ],
    });

    try {
      await request(server)
        .get('/paper-trading/executions?limit=2')
        .expect(200)
        .expect([
          {
            id: sellId,
            symbol: 'BTC/USDT',
            side: 'sell',
            quantity: '0.001',
            price: '51000',
            notional: '51',
            feeRate: '0.001',
            fee: '0.051',
            quotedAt: quotedAt.toISOString(),
            marketDataReceivedAt: receivedAt.toISOString(),
            executedAt: sellExecutedAt.toISOString(),
            replayed: false,
            netProceeds: '50.949',
          },
          {
            id: buyId,
            symbol: 'BTC/USDT',
            side: 'buy',
            quantity: '0.001',
            price: '50000',
            notional: '50',
            feeRate: '0.001',
            fee: '0.05',
            quotedAt: quotedAt.toISOString(),
            marketDataReceivedAt: receivedAt.toISOString(),
            executedAt: buyExecutedAt.toISOString(),
            replayed: false,
            totalCost: '50.05',
          },
        ]);
      await request(server).get('/paper-trading/position').expect(200).expect({
        symbol: 'BTC/USDT',
        quantity: '0',
        costBasis: '0',
        averageEntryPrice: null,
        realizedPnl: '0.899',
        totalFees: '0.101',
        markPrice: null,
        grossMarketValue: '0',
        estimatedExitFee: '0',
        netLiquidationValue: '0',
        unrealizedPnl: '0',
        totalPnl: '0.899',
        marketDataReceivedAt: null,
      });
      await request(server)
        .get('/paper-trading/performance')
        .expect(200)
        .expect({
          symbol: 'BTC/USDT',
          executionCount: 2,
          buyExecutionCount: 1,
          sellExecutionCount: 1,
          profitableSellCount: 1,
          losingSellCount: 0,
          breakEvenSellCount: 0,
          winRate: '1',
          realizedPnl: '0.899',
          totalFees: '0.101',
        });
    } finally {
      await prisma.paperExecution.deleteMany({
        where: { id: { in: [buyId, sellId] } },
      });
    }
  });

  it('/paper-trading/executions (GET) rejects an invalid limit', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    return request(server)
      .get('/paper-trading/executions?limit=101')
      .expect(400);
  });

  it('/paper-trading/position (GET) values an open position at the fresh best bid', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const prisma = app.get(PrismaService);
    const id = `e2e-open-position-${Date.now()}`;
    const receivedAt = new Date();
    app.get(LatestTopOfBookService).update({
      provider: 'binance',
      symbol: 'BTC/USDT',
      updateId: 'position',
      bidPrice: '49999.99',
      bidQuantity: '1',
      askPrice: '50000',
      askQuantity: '1',
      receivedAt,
    });
    await prisma.paperExecution.create({
      data: {
        id,
        symbol: 'BTC/USDT',
        side: 'buy',
        quantity: '0.001',
        price: '50000',
        notional: '50',
        feeRate: '0.001',
        fee: '0.05',
        totalCost: '50.05',
        quotedAt: receivedAt,
        marketDataReceivedAt: receivedAt,
        executedAt: receivedAt,
      },
    });

    try {
      await request(server).get('/paper-trading/position').expect(200).expect({
        symbol: 'BTC/USDT',
        quantity: '0.001',
        costBasis: '50.05',
        averageEntryPrice: '50050',
        realizedPnl: '0',
        totalFees: '0.05',
        markPrice: '49999.99',
        grossMarketValue: '49.99999',
        estimatedExitFee: '0.04999999',
        netLiquidationValue: '49.94999001',
        unrealizedPnl: '-0.10000999',
        totalPnl: '-0.10000999',
        marketDataReceivedAt: receivedAt.toISOString(),
      });
    } finally {
      await prisma.paperExecution.delete({ where: { id } });
    }
  });
});

function historicalReplayResult(): BacktestResult {
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    candleCount: 1,
    startedAt: new Date('2026-09-01T00:00:00.000Z'),
    endedAt: new Date('2026-09-01T00:00:59.999Z'),
    signalCount: 0,
    buySignalCount: 0,
    sellSignalCount: 0,
    holdSignalCount: 0,
    signals: [],
  };
}

function historicalSimulationResult(): HistoricalBacktestSimulationResult {
  return {
    replay: {
      ...historicalReplayResult(),
      startedAt: null,
      endedAt: null,
    },
    simulation: { fixture: 'research-only' },
  } as unknown as HistoricalBacktestSimulationResult;
}

function historicalSimulationRequest() {
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

function serializeHistoricalReplayResult(value: BacktestResult) {
  return {
    ...value,
    startedAt: value.startedAt?.toISOString() ?? null,
    endedAt: value.endedAt?.toISOString() ?? null,
  };
}

function preparePaperMarket(app: INestApplication): void {
  app.get(LatestTopOfBookService).update({
    provider: 'binance',
    symbol: 'BTC/USDT',
    updateId: '1',
    bidPrice: '49999.99',
    bidQuantity: '1',
    askPrice: '50000',
    askQuantity: '1',
    receivedAt: new Date(),
  });
  app.get(LatestPairMetadataService).update({
    provider: 'binance',
    symbol: 'BTC/USDT',
    status: 'TRADING',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    minPrice: '0.01',
    maxPrice: '1000000',
    tickSize: '0.01',
    minQuantity: '0.00001',
    maxQuantity: '9000',
    stepSize: '0.00001',
    minNotional: '5',
    receivedAt: new Date(),
  });
}

function serializeSignal(signal: {
  strategy: 'moving_average_crossover';
  symbol: 'BTC/USDT';
  action: 'hold' | 'buy';
  reason: 'no_moving_average_crossover' | 'bullish_moving_average_crossover';
  shortPeriod: number;
  longPeriod: number;
  previousShortAverage: string;
  previousLongAverage: string;
  currentShortAverage: string;
  currentLongAverage: string;
  latestCandleCloseTime: Date;
  evaluatedAt: Date;
}) {
  return {
    ...signal,
    latestCandleCloseTime: signal.latestCandleCloseTime.toISOString(),
    evaluatedAt: signal.evaluatedAt.toISOString(),
  };
}

async function waitForAdvisoryWaiter(prisma: PrismaService): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const [result] = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM pg_locks
      WHERE locktype = 'advisory' AND granted = false
    `;
    if ((result?.count ?? 0) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for the paper-trading advisory lock');
}
