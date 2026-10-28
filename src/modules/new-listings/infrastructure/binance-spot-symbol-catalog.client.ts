import {
  ProviderRequestWeightObservation,
  SpotSymbol,
  SpotSymbolCatalog,
  SpotSymbolCatalogProvider,
  SpotSymbolCatalogRateLimitError,
} from '../domain/spot-symbol-catalog';
import {
  isCanonicalBinanceAsset,
  isCanonicalBinanceSymbol,
} from '../domain/binance-spot-identity';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;
const TIMEOUT_MS = 10_000;
const RATE_LIMIT_FALLBACK_MS = 60_000;

export class BinanceSpotSymbolCatalogClient implements SpotSymbolCatalogProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async load(signal?: AbortSignal): Promise<SpotSymbolCatalog> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/api/v3/exchangeInfo`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (response.status === 418 || response.status === 429) {
      throw new SpotSymbolCatalogRateLimitError(
        response.status,
        retryAfterMs(response.headers.get('retry-after'), this.clock()),
      );
    }
    if (!response.ok) {
      throw new Error(
        `Binance exchange info request failed: ${response.status}`,
      );
    }
    const payload = JSON.parse(await response.text()) as unknown;
    const catalog = this.normalize(payload);
    const requestWeight = normalizeRequestWeight(
      response.headers.get('x-mbx-used-weight-1m'),
      payload,
      catalog.receivedAt,
    );
    return requestWeight ? { ...catalog, requestWeight } : catalog;
  }

  normalize(payload: unknown): SpotSymbolCatalog {
    if (!isRecord(payload) || !Array.isArray(payload.symbols)) {
      throw new Error('Invalid Binance exchange info payload');
    }
    const symbols = payload.symbols
      .map(normalizeSymbol)
      .filter((value): value is SpotSymbol => value !== undefined)
      .sort((left, right) => left.symbol.localeCompare(right.symbol));
    return { symbols, receivedAt: this.clock() };
  }
}

function normalizeRequestWeight(
  usedWeightHeader: string | null,
  payload: unknown,
  observedAt: Date,
): ProviderRequestWeightObservation | undefined {
  const usedWeight = positiveInteger(usedWeightHeader);
  if (usedWeight === undefined) return undefined;

  const rateLimits: unknown[] =
    isRecord(payload) && Array.isArray(payload.rateLimits)
      ? (payload.rateLimits as unknown[])
      : [];
  const minuteLimit = rateLimits.find(
    (value) =>
      isRecord(value) &&
      value.rateLimitType === 'REQUEST_WEIGHT' &&
      value.interval === 'MINUTE' &&
      value.intervalNum === 1,
  );
  const parsedLimit =
    isRecord(minuteLimit) && typeof minuteLimit.limit === 'number'
      ? positiveInteger(String(minuteLimit.limit))
      : undefined;
  const limit =
    parsedLimit !== undefined && parsedLimit > 0 ? parsedLimit : undefined;

  return {
    usedWeight,
    limit: limit ?? null,
    intervalMs: limit === undefined ? null : 60_000,
    observedAt,
  };
}

function retryAfterMs(value: string | null, now: Date): number {
  if (value !== null) {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.max(1000, Math.ceil(seconds * 1000));
    }
    const retryAt = Date.parse(value);
    if (Number.isFinite(retryAt)) {
      return Math.max(1000, retryAt - now.getTime());
    }
  }
  return RATE_LIMIT_FALLBACK_MS;
}

function positiveInteger(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizeSymbol(value: unknown): SpotSymbol | undefined {
  if (!isRecord(value) || value.quoteAsset !== 'USDT') return undefined;
  if (
    typeof value.symbol !== 'string' ||
    typeof value.baseAsset !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.isSpotTradingAllowed !== 'boolean' ||
    !isCanonicalBinanceSymbol(value.symbol) ||
    !isCanonicalBinanceAsset(value.baseAsset) ||
    value.status.length === 0
  ) {
    throw new Error('Invalid Binance USDT Spot symbol');
  }
  return {
    provider: 'binance',
    symbol: value.symbol,
    baseAsset: value.baseAsset,
    quoteAsset: 'USDT',
    status: value.status,
    spotTradingAllowed: value.isSpotTradingAllowed,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
