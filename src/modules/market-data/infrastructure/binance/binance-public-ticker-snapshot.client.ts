import { MarketTicker } from '../../domain/market-ticker';
import { TickerSnapshotProvider } from '../../domain/ticker-snapshot-provider';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.(?:\d*[1-9]\d*))$/;
const REQUEST_TIMEOUT_MS = 10_000;

export class BinancePublicTickerSnapshotClient implements TickerSnapshotProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly httpClient: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async load(signal?: AbortSignal): Promise<MarketTicker | null> {
    const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const response = await this.httpClient(this.buildUrl(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
    });

    if (!response.ok) {
      throw new Error(
        `Binance ticker price request failed: ${response.status}`,
      );
    }

    return this.normalize(JSON.parse(await response.text()));
  }

  normalize(payload: unknown): MarketTicker | null {
    if (
      !isRecord(payload) ||
      payload.symbol !== 'BTCUSDT' ||
      typeof payload.price !== 'string' ||
      !POSITIVE_DECIMAL_PATTERN.test(payload.price)
    ) {
      return null;
    }

    const observedAt = this.clock();

    return {
      provider: 'binance',
      symbol: 'BTC/USDT',
      lastPrice: payload.price,
      eventTime: observedAt,
      receivedAt: observedAt,
    };
  }

  private buildUrl(): string {
    return `${this.baseUrl.replace(/\/$/, '')}/api/v3/ticker/price?symbol=BTCUSDT`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
