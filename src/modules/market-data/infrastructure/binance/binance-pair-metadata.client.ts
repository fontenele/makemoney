import { MarketPairMetadata } from '../../domain/market-pair-metadata';
import { PairMetadataProvider } from '../../domain/pair-metadata-provider';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

interface PriceFilter {
  filterType: 'PRICE_FILTER';
  minPrice: string;
  maxPrice: string;
  tickSize: string;
}

interface LotSizeFilter {
  filterType: 'LOT_SIZE';
  minQty: string;
  maxQty: string;
  stepSize: string;
}

interface NotionalFilter {
  filterType: 'MIN_NOTIONAL' | 'NOTIONAL';
  minNotional: string;
}

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;
const REQUEST_TIMEOUT_MS = 10_000;

export class BinancePairMetadataClient implements PairMetadataProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly httpClient: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async load(signal?: AbortSignal): Promise<MarketPairMetadata | null> {
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const response = await this.httpClient(this.buildUrl(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });

    if (!response.ok) {
      throw new Error(
        `Binance exchange info request failed: ${response.status}`,
      );
    }

    const payload: unknown = JSON.parse(await response.text());

    return this.normalize(payload);
  }

  normalize(payload: unknown): MarketPairMetadata | null {
    if (!isRecord(payload) || !isUnknownArray(payload.symbols)) {
      return null;
    }

    const symbol = payload.symbols.find(
      (candidate) => isRecord(candidate) && candidate.symbol === 'BTCUSDT',
    );

    if (!isValidSymbol(symbol)) {
      return null;
    }

    const priceFilter = symbol.filters.find(isPriceFilter);
    const lotSizeFilter = symbol.filters.find(isLotSizeFilter);
    const notionalFilter = symbol.filters.find(isNotionalFilter);

    if (!priceFilter || !lotSizeFilter || !notionalFilter) {
      return null;
    }

    return {
      provider: 'binance',
      symbol: 'BTC/USDT',
      status: symbol.status,
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      minPrice: priceFilter.minPrice,
      maxPrice: priceFilter.maxPrice,
      tickSize: priceFilter.tickSize,
      minQuantity: lotSizeFilter.minQty,
      maxQuantity: lotSizeFilter.maxQty,
      stepSize: lotSizeFilter.stepSize,
      minNotional: notionalFilter.minNotional,
      receivedAt: this.clock(),
    };
  }

  private buildUrl(): string {
    return `${this.baseUrl.replace(/\/$/, '')}/api/v3/exchangeInfo?symbol=BTCUSDT`;
  }
}

function isValidSymbol(value: unknown): value is Record<string, unknown> & {
  status: string;
  filters: unknown[];
} {
  return (
    isRecord(value) &&
    value.symbol === 'BTCUSDT' &&
    value.baseAsset === 'BTC' &&
    value.quoteAsset === 'USDT' &&
    typeof value.status === 'string' &&
    value.status.length > 0 &&
    Array.isArray(value.filters)
  );
}

function isPriceFilter(value: unknown): value is PriceFilter {
  return (
    isRecord(value) &&
    value.filterType === 'PRICE_FILTER' &&
    isDecimal(value.minPrice) &&
    isDecimal(value.maxPrice) &&
    isDecimal(value.tickSize)
  );
}

function isLotSizeFilter(value: unknown): value is LotSizeFilter {
  return (
    isRecord(value) &&
    value.filterType === 'LOT_SIZE' &&
    isDecimal(value.minQty) &&
    isDecimal(value.maxQty) &&
    isDecimal(value.stepSize)
  );
}

function isNotionalFilter(value: unknown): value is NotionalFilter {
  return (
    isRecord(value) &&
    (value.filterType === 'MIN_NOTIONAL' || value.filterType === 'NOTIONAL') &&
    isDecimal(value.minNotional)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isDecimal(value: unknown): value is string {
  return typeof value === 'string' && DECIMAL_PATTERN.test(value);
}
