import {
  SpotSymbol,
  SpotSymbolCatalog,
  SpotSymbolCatalogProvider,
} from '../domain/spot-symbol-catalog';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;
const TIMEOUT_MS = 10_000;
const ASSET = /^[A-Z0-9]{1,20}$/;

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
    if (!response.ok) {
      throw new Error(
        `Binance exchange info request failed: ${response.status}`,
      );
    }
    return this.normalize(JSON.parse(await response.text()) as unknown);
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

function normalizeSymbol(value: unknown): SpotSymbol | undefined {
  if (!isRecord(value) || value.quoteAsset !== 'USDT') return undefined;
  if (
    typeof value.symbol !== 'string' ||
    typeof value.baseAsset !== 'string' ||
    typeof value.status !== 'string' ||
    typeof value.isSpotTradingAllowed !== 'boolean' ||
    !ASSET.test(value.symbol) ||
    !ASSET.test(value.baseAsset) ||
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
