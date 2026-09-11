import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Decimal from 'decimal.js';
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
import { PaperWalletService } from '../src/modules/paper-wallet/application/paper-wallet.service';
import { PaperTradingExecutor } from '../src/modules/paper-trading/application/paper-trading.executor';

describe('Application (e2e)', () => {
  let app: INestApplication;
  let latestMarketPrice: LatestMarketPriceService;

  beforeAll(async () => {
    const pairMetadataProvider: PairMetadataProvider = {
      load: () => Promise.resolve(null),
    };
    const tickerStream: TickerStream = {
      start: () => undefined,
      stop: () => undefined,
    };
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAIR_METADATA_PROVIDER)
      .useValue(pairMetadataProvider)
      .overrideProvider(TICKER_STREAM)
      .useValue(tickerStream)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    latestMarketPrice = app.get(LatestMarketPriceService);
  });

  afterAll(async () => app.close());

  it('/health (GET)', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    return request(server).get('/health').expect(200);
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

    await expect(
      executor.execute({
        idempotencyKey,
        symbol: 'BTC/USDT',
        side: 'buy',
        quantity: '0.02',
      }),
    ).rejects.toThrow('Insufficient USDT paper balance');

    await expect(wallet.getBalances()).resolves.toEqual(before);
    await expect(
      prisma.paperExecution.findUnique({ where: { id: idempotencyKey } }),
    ).resolves.toBeNull();
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
});

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
