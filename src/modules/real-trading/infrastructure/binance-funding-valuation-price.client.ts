type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const REQUEST_TIMEOUT_MS = 10_000;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.(?:\d*[1-9]\d*))$/;
const REQUIRED_SYMBOLS = ['BNBUSDT', 'USDTBRL', 'BTCUSDT'] as const;

export interface BinanceFundingValuationPrices {
  readonly provider: 'binance';
  readonly bnbUsdtPrice: string;
  readonly btcUsdtPrice: string | null;
  readonly usdtBrlPrice: string;
  readonly observedAt: Date;
}

export class BinanceFundingValuationPriceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly httpClient: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async load(signal?: AbortSignal): Promise<BinanceFundingValuationPrices> {
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const response = await this.httpClient(this.buildUrl(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });
    if (!response.ok) {
      throw new Error(
        `Binance funding price request failed: ${response.status}`,
      );
    }

    const normalized = this.normalize(JSON.parse(await response.text()));
    if (normalized === null) {
      throw new Error('Binance funding price response is invalid');
    }
    return normalized;
  }

  normalize(payload: unknown): BinanceFundingValuationPrices | null {
    if (
      !Array.isArray(payload) ||
      payload.length < 2 ||
      payload.length > REQUIRED_SYMBOLS.length
    ) {
      return null;
    }
    const prices = new Map<string, string>();
    const seen = new Set<unknown>();
    for (const item of payload) {
      if (!isRecord(item) || !REQUIRED_SYMBOLS.includes(item.symbol as never)) {
        return null;
      }
      if (seen.has(item.symbol)) return null;
      seen.add(item.symbol);
      if (
        item.symbol === 'BTCUSDT' &&
        (typeof item.price !== 'string' ||
          !/^(?:0|[1-9]\d{0,29})(?:\.\d{1,18})?$/.test(item.price) ||
          !POSITIVE_DECIMAL_PATTERN.test(item.price))
      )
        continue;
      if (
        typeof item.price !== 'string' ||
        !POSITIVE_DECIMAL_PATTERN.test(item.price) ||
        prices.has(item.symbol as string)
      ) {
        return null;
      }
      prices.set(item.symbol as string, item.price);
    }
    const bnbUsdtPrice = prices.get('BNBUSDT');
    const usdtBrlPrice = prices.get('USDTBRL');
    if (!bnbUsdtPrice || !usdtBrlPrice) return null;

    return {
      provider: 'binance',
      bnbUsdtPrice,
      btcUsdtPrice: prices.get('BTCUSDT') ?? null,
      usdtBrlPrice,
      observedAt: this.clock(),
    };
  }

  private buildUrl(): string {
    const symbols = encodeURIComponent(JSON.stringify(REQUIRED_SYMBOLS));
    return `${this.baseUrl.replace(/\/$/, '')}/api/v3/ticker/price?symbols=${symbols}`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
