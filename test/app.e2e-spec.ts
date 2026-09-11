import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
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
});
