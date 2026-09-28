import Decimal from 'decimal.js';
import { isPredictionMarketTokenId } from '../domain/prediction-market-midpoint';
import {
  PredictionMarketHistoricalPriceObservation,
  PredictionMarketHistoricalPriceUnavailableError,
  PredictionMarketPriceHistoryPage,
  PredictionMarketPriceHistoryProvider,
  PredictionMarketPriceHistoryQuery,
  PredictionMarketPriceHistoryResolution,
  PredictionMarketPriceHistoryUnavailableError,
} from '../domain/prediction-market-price-history';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const BUCKET_SECONDS: Record<PredictionMarketPriceHistoryResolution, number> = {
  '1m': 60,
  '5m': 300,
  '30m': 1_800,
  '3h': 10_800,
  '12h': 43_200,
};

export class PolymarketDataPriceHistoryClient implements PredictionMarketPriceHistoryProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getPriceHistory(
    tokenId: string,
    query: PredictionMarketPriceHistoryQuery,
    signal?: AbortSignal,
  ): Promise<PredictionMarketPriceHistoryPage> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new Error('Invalid Polymarket token identity');
    }
    const url = new URL(
      '/v2/prices-history',
      `${this.baseUrl.replace(/\/$/, '')}/`,
    );
    url.searchParams.set('token_id', tokenId);
    url.searchParams.set('start', toEpochSeconds(query.start));
    url.searchParams.set('end', toEpochSeconds(query.end));
    url.searchParams.set(
      'bucket_seconds',
      String(BUCKET_SECONDS[query.resolution]),
    );
    url.searchParams.set('limit', String(query.limit));
    if (query.afterCursor !== undefined) {
      url.searchParams.set('cursor', query.afterCursor);
    }
    return this.normalize(tokenId, query, await this.load(url, signal));
  }

  async getPriceAt(
    tokenId: string,
    at: Date,
    signal?: AbortSignal,
  ): Promise<PredictionMarketHistoricalPriceObservation> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new Error('Invalid Polymarket token identity');
    }
    const url = new URL(
      '/v2/prices-history',
      `${this.baseUrl.replace(/\/$/, '')}/`,
    );
    url.searchParams.set('token_id', tokenId);
    url.searchParams.set('as_of', toEpochSeconds(at));
    url.searchParams.set('limit', '1');
    return this.normalizePriceAt(tokenId, at, await this.load(url, signal));
  }

  normalize(
    tokenId: string,
    query: PredictionMarketPriceHistoryQuery,
    payload: unknown,
  ): PredictionMarketPriceHistoryPage {
    if (!isRecord(payload)) throw invalidPayload();
    if (payload.data === null) {
      throw new PredictionMarketPriceHistoryUnavailableError(tokenId);
    }
    if (!Array.isArray(payload.data) || payload.data.length > query.limit) {
      throw invalidPayload();
    }
    const pagination = payload.pagination;
    if (
      !isRecord(pagination) ||
      typeof pagination.has_more !== 'boolean' ||
      !Number.isSafeInteger(pagination.limit) ||
      (pagination.limit as number) < 0 ||
      (pagination.limit as number) > 1_000 ||
      !Number.isSafeInteger(pagination.offset) ||
      (pagination.offset as number) < 0
    ) {
      throw invalidPayload();
    }
    const nextCursor = pagination.next_cursor;
    if (
      (nextCursor !== null &&
        (typeof nextCursor !== 'string' ||
          !/^\S{1,4096}$/u.test(nextCursor))) ||
      pagination.has_more !== (nextCursor !== null)
    ) {
      throw invalidPayload();
    }
    let previousTimestamp = 0;
    const points = payload.data.map((value) => {
      if (!isRecord(value)) throw invalidPayload();
      const timestamp = value.timestamp;
      const resolutionSeconds = value.resolution_seconds;
      if (
        !Number.isSafeInteger(timestamp) ||
        (timestamp as number) <= previousTimestamp ||
        (timestamp as number) < query.start.getTime() / 1000 ||
        (timestamp as number) > query.end.getTime() / 1000 ||
        !Number.isSafeInteger(resolutionSeconds) ||
        (resolutionSeconds as number) < 0
      ) {
        throw invalidPayload();
      }
      previousTimestamp = timestamp as number;
      return {
        timestamp: new Date((timestamp as number) * 1000),
        price: normalizePrice(value.price),
        resolutionSeconds: resolutionSeconds as number,
      };
    });
    return {
      provider: 'polymarket',
      tokenId,
      start: query.start,
      end: query.end,
      resolution: query.resolution,
      points,
      nextCursor,
      source: 'data-api-price-history',
      receivedAt: this.clock(),
      executable: false,
    };
  }

  normalizePriceAt(
    tokenId: string,
    at: Date,
    payload: unknown,
  ): PredictionMarketHistoricalPriceObservation {
    if (!isRecord(payload)) throw invalidPayload();
    if (
      payload.data === null ||
      (Array.isArray(payload.data) && payload.data.length === 0)
    ) {
      throw new PredictionMarketHistoricalPriceUnavailableError(tokenId, at);
    }
    if (!Array.isArray(payload.data) || payload.data.length !== 1) {
      throw invalidPayload();
    }
    validateTerminalPagination(payload.pagination);
    const value: unknown = payload.data[0];
    if (!isRecord(value)) throw invalidPayload();
    const timestamp = value.timestamp;
    const resolutionSeconds = value.resolution_seconds;
    if (
      !Number.isSafeInteger(timestamp) ||
      (timestamp as number) <= 0 ||
      (timestamp as number) > at.getTime() / 1000 ||
      !Number.isSafeInteger(resolutionSeconds) ||
      (resolutionSeconds as number) < 0
    ) {
      throw invalidPayload();
    }
    const observedAt = new Date((timestamp as number) * 1000);
    return {
      provider: 'polymarket',
      tokenId,
      requestedAt: at,
      observedAt,
      price: normalizePrice(value.price),
      resolutionSeconds: resolutionSeconds as number,
      exactTimestamp: observedAt.getTime() === at.getTime(),
      source: 'data-api-price-history',
      receivedAt: this.clock(),
      executable: false,
    };
  }

  private async load(url: URL, signal?: AbortSignal): Promise<unknown> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      throw new Error(
        `Polymarket price-history request failed: ${response.status}`,
      );
    }
    return JSON.parse(await response.text()) as unknown;
  }
}

function validateTerminalPagination(value: unknown): void {
  if (
    !isRecord(value) ||
    value.has_more !== false ||
    value.next_cursor !== null ||
    value.limit !== 1 ||
    value.offset !== 0
  ) {
    throw invalidPayload();
  }
}

function toEpochSeconds(value: Date): string {
  const milliseconds = value.getTime();
  if (!Number.isSafeInteger(milliseconds) || milliseconds % 1000 !== 0) {
    throw new Error('Invalid Polymarket price-history timestamp');
  }
  return String(milliseconds / 1000);
}

function normalizePrice(value: unknown): string {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'number' && !Number.isFinite(value))
  ) {
    throw invalidPayload();
  }
  const text = String(value);
  if (!DECIMAL.test(text) || text.length > 100) throw invalidPayload();
  try {
    const decimal = new Decimal(text);
    if (!decimal.isFinite() || decimal.isNegative() || decimal.greaterThan(1)) {
      throw invalidPayload();
    }
  } catch {
    throw invalidPayload();
  }
  return text;
}

function invalidPayload(): Error {
  return new Error('Invalid Polymarket price-history payload');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
