import Decimal from 'decimal.js';
import { HistoricalCandle } from '../../domain/historical-candle';
import {
  HistoricalCandleProvider,
  HistoricalCandleRequest,
} from '../../domain/historical-candle-provider';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;
const REQUEST_TIMEOUT_MS = 10_000;
const ONE_MINUTE_MS = 60_000;
export const MAX_HISTORICAL_CANDLE_LIMIT = 1_000;

export class BinanceHistoricalCandlesClient implements HistoricalCandleProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly httpClient: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async load(
    request: HistoricalCandleRequest,
    signal?: AbortSignal,
  ): Promise<HistoricalCandle[]> {
    this.validateRequest(request);
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const response = await this.httpClient(this.buildUrl(request), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });

    if (!response.ok) {
      throw new Error(
        `Binance historical candles request failed: ${response.status}`,
      );
    }

    const payload: unknown = JSON.parse(await response.text());
    return this.normalize(payload, request);
  }

  normalize(
    payload: unknown,
    request: HistoricalCandleRequest,
  ): HistoricalCandle[] {
    this.validateRequest(request);
    if (!Array.isArray(payload) || payload.length > request.limit) {
      throw new Error('Invalid Binance historical candles payload');
    }

    const candles = payload.map((row) => this.normalizeRow(row, request));
    let previousCloseTime = Number.NEGATIVE_INFINITY;
    for (const candle of candles) {
      const closeTime = candle.closeTime.getTime();
      if (closeTime <= previousCloseTime) {
        throw new Error('Binance historical candles must be uniquely ordered');
      }
      previousCloseTime = closeTime;
    }

    const now = this.clock().getTime();
    return candles.filter((candle) => candle.closeTime.getTime() < now);
  }

  private normalizeRow(
    value: unknown,
    request: HistoricalCandleRequest,
  ): HistoricalCandle {
    if (!isKline(value)) {
      throw new Error('Invalid Binance historical candle');
    }

    const [
      openTime,
      openPrice,
      highPrice,
      lowPrice,
      closePrice,
      baseVolume,
      closeTime,
      quoteVolume,
      tradeCount,
      takerBuyBaseVolume,
      takerBuyQuoteVolume,
    ] = value;
    if (
      openTime < request.startTime.getTime() ||
      openTime > request.endTime.getTime()
    ) {
      throw new Error('Binance historical candle is outside requested range');
    }
    if (
      !isCoherentOhlcv(
        openPrice,
        highPrice,
        lowPrice,
        closePrice,
        baseVolume,
        quoteVolume,
        takerBuyBaseVolume,
        takerBuyQuoteVolume,
      )
    ) {
      throw new Error('Invalid Binance historical candle OHLCV');
    }

    return {
      symbol: 'BTC/USDT',
      interval: '1m',
      openPrice,
      highPrice,
      lowPrice,
      closePrice,
      baseVolume,
      quoteVolume,
      takerBuyBaseVolume,
      takerBuyQuoteVolume,
      tradeCount,
      openTime: new Date(openTime),
      closeTime: new Date(closeTime),
      isClosed: true,
    };
  }

  private validateRequest(request: HistoricalCandleRequest): void {
    const startTime = request.startTime.getTime();
    const endTime = request.endTime.getTime();
    if (
      request.symbol !== 'BTC/USDT' ||
      request.interval !== '1m' ||
      !Number.isSafeInteger(startTime) ||
      !Number.isSafeInteger(endTime) ||
      startTime < 0 ||
      endTime <= startTime ||
      !Number.isInteger(request.limit) ||
      request.limit < 1 ||
      request.limit > MAX_HISTORICAL_CANDLE_LIMIT ||
      endTime - startTime > MAX_HISTORICAL_CANDLE_LIMIT * ONE_MINUTE_MS
    ) {
      throw new Error('Invalid bounded historical candle request');
    }
  }

  private buildUrl(request: HistoricalCandleRequest): string {
    const query = new URLSearchParams({
      symbol: 'BTCUSDT',
      interval: '1m',
      startTime: String(request.startTime.getTime()),
      endTime: String(request.endTime.getTime()),
      limit: String(request.limit),
    });
    return `${this.baseUrl.replace(/\/$/, '')}/api/v3/klines?${query.toString()}`;
  }
}

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

function isKline(value: unknown): value is BinanceKline {
  return (
    Array.isArray(value) &&
    value.length === 12 &&
    isTimestamp(value[0]) &&
    isDecimal(value[1]) &&
    isDecimal(value[2]) &&
    isDecimal(value[3]) &&
    isDecimal(value[4]) &&
    isDecimal(value[5]) &&
    isTimestamp(value[6]) &&
    value[6] > value[0] &&
    isDecimal(value[7]) &&
    isNonNegativeInteger(value[8]) &&
    isDecimal(value[9]) &&
    isDecimal(value[10]) &&
    typeof value[11] === 'string'
  );
}

function isTimestamp(value: unknown): value is number {
  return isNonNegativeInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isDecimal(value: unknown): value is string {
  return typeof value === 'string' && DECIMAL_PATTERN.test(value);
}

function isCoherentOhlcv(
  openPrice: string,
  highPrice: string,
  lowPrice: string,
  closePrice: string,
  ...volumes: string[]
): boolean {
  const open = new Decimal(openPrice);
  const high = new Decimal(highPrice);
  const low = new Decimal(lowPrice);
  const close = new Decimal(closePrice);
  return (
    open.isPositive() &&
    high.isPositive() &&
    low.isPositive() &&
    close.isPositive() &&
    high.greaterThanOrEqualTo(Decimal.max(open, low, close)) &&
    low.lessThanOrEqualTo(Decimal.min(open, high, close)) &&
    volumes.every((volume) => new Decimal(volume).greaterThanOrEqualTo(0))
  );
}
