import Decimal from 'decimal.js';
import { HistoricalCandle } from '../../domain/historical-candle';
import {
  HistoricalCandleProvider,
  HistoricalCandleRequest,
} from '../../domain/historical-candle-provider';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;
type Sleeper = (delayMs: number, signal?: AbortSignal) => Promise<void>;

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;
const REQUEST_TIMEOUT_MS = 10_000;
const ONE_MINUTE_MS = 60_000;
const MAX_PAGE_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_AFTER_MS = 30_000;
export const MAX_HISTORICAL_CANDLE_PAGE_LIMIT = 1_000;
export const MAX_HISTORICAL_CANDLE_LIMIT = 10_000;

export class BinanceHistoricalCandlesClient implements HistoricalCandleProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly httpClient: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
    private readonly sleeper: Sleeper = abortableSleep,
  ) {}

  async load(
    request: HistoricalCandleRequest,
    signal?: AbortSignal,
  ): Promise<HistoricalCandle[]> {
    this.validateRequest(request);
    const candles: HistoricalCandle[] = [];
    let nextStartTime = request.startTime.getTime();

    while (
      candles.length < request.limit &&
      nextStartTime <= request.endTime.getTime()
    ) {
      const pageRequest: HistoricalCandleRequest = {
        ...request,
        startTime: new Date(nextStartTime),
        limit: Math.min(
          MAX_HISTORICAL_CANDLE_PAGE_LIMIT,
          request.limit - candles.length,
        ),
      };
      const page = await this.loadPage(pageRequest, signal);
      if (page.length === 0) {
        break;
      }

      const previousCandle = candles.at(-1);
      if (
        previousCandle &&
        page[0].openTime.getTime() <= previousCandle.openTime.getTime()
      ) {
        throw new Error(
          'Binance historical candle pages must be uniquely ordered',
        );
      }
      candles.push(...page);

      const lastOpenTime = page.at(-1)!.openTime.getTime();
      const advancedStartTime = lastOpenTime + ONE_MINUTE_MS;
      if (
        !Number.isSafeInteger(advancedStartTime) ||
        advancedStartTime <= nextStartTime
      ) {
        throw new Error('Binance historical candle pagination did not advance');
      }
      nextStartTime = advancedStartTime;
      if (page.length < pageRequest.limit) {
        break;
      }
    }

    return candles;
  }

  private async loadPage(
    request: HistoricalCandleRequest,
    signal?: AbortSignal,
  ): Promise<HistoricalCandle[]> {
    for (let attempt = 1; attempt <= MAX_PAGE_ATTEMPTS; attempt += 1) {
      let response: Response;
      try {
        const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
        response = await this.httpClient(this.buildUrl(request), {
          headers: { accept: 'application/json' },
          signal: signal
            ? AbortSignal.any([signal, timeoutSignal])
            : timeoutSignal,
        });
      } catch (error) {
        if (signal?.aborted || attempt === MAX_PAGE_ATTEMPTS) {
          throw error;
        }
        await this.sleeper(this.retryDelay(null, attempt), signal);
        continue;
      }

      if (!response.ok) {
        if (
          !isRetryableStatus(response.status) ||
          attempt === MAX_PAGE_ATTEMPTS
        ) {
          throw new Error(
            `Binance historical candles request failed: ${response.status}`,
          );
        }
        await this.sleeper(
          this.retryDelay(response.headers.get('retry-after'), attempt),
          signal,
        );
        continue;
      }

      const payload: unknown = JSON.parse(await response.text());
      return this.normalize(payload, request);
    }

    throw new Error('Binance historical candle retry state is invalid');
  }

  private retryDelay(retryAfter: string | null, attempt: number): number {
    if (retryAfter !== null) {
      const seconds =
        retryAfter.trim() === '' ? Number.NaN : Number(retryAfter);
      const retryAt = Date.parse(retryAfter);
      const delayMs = Number.isFinite(seconds)
        ? seconds * 1_000
        : retryAt - this.clock().getTime();
      if (Number.isFinite(delayMs) && delayMs >= 0) {
        return Math.min(delayMs, MAX_RETRY_AFTER_MS);
      }
    }
    return INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
  }

  normalize(
    payload: unknown,
    request: HistoricalCandleRequest,
  ): HistoricalCandle[] {
    this.validateRequest(request);
    if (
      request.limit > MAX_HISTORICAL_CANDLE_PAGE_LIMIT ||
      !Array.isArray(payload) ||
      payload.length > request.limit
    ) {
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
      endTime < startTime ||
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

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function abortableSleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }

    const onAbort = () => {
      clearTimeout(timeout);
      reject(abortReason(signal));
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function abortReason(signal?: AbortSignal): Error {
  return signal?.reason instanceof Error
    ? signal.reason
    : new Error('Historical candle request aborted');
}
