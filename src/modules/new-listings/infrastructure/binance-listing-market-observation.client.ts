import {
  ListingMarketObservation,
  ListingMarketObservationProvider,
  ListingMarketObservationRequest,
  validateListingMarketObservation,
} from '../domain/listing-market-observation';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;
const TIMEOUT_MS = 10_000;
const SYMBOL_PATTERN = /^[A-Z0-9]{1,30}$/;

export class BinanceListingMarketObservationClient implements ListingMarketObservationProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async load(
    request: ListingMarketObservationRequest,
    signal?: AbortSignal,
  ): Promise<ListingMarketObservation> {
    validateRequest(request);
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const url = new URL(
      `${this.baseUrl.replace(/\/$/, '')}/api/v3/ticker/24hr`,
    );
    url.searchParams.set('symbol', request.symbol);
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      throw new Error(
        `Binance 24-hour ticker request failed: ${response.status}`,
      );
    }
    return this.normalize(
      JSON.parse(await response.text()) as unknown,
      request,
    );
  }

  normalize(
    payload: unknown,
    request: ListingMarketObservationRequest,
  ): ListingMarketObservation {
    validateRequest(request);
    if (
      !isRecord(payload) ||
      payload.symbol !== request.symbol ||
      typeof payload.lastPrice !== 'string' ||
      typeof payload.volume !== 'string' ||
      typeof payload.quoteVolume !== 'string' ||
      !isSafeEpoch(payload.openTime) ||
      !isSafeEpoch(payload.closeTime) ||
      !isNonNegativeSafeInteger(payload.count)
    ) {
      throw new Error('Invalid Binance 24-hour ticker payload');
    }
    const observation: ListingMarketObservation = {
      provider: 'binance',
      symbol: request.symbol,
      lastPrice: payload.lastPrice,
      baseVolume: payload.volume,
      quoteVolume: payload.quoteVolume,
      tradeCount: payload.count,
      windowOpenTime: new Date(payload.openTime),
      windowCloseTime: new Date(payload.closeTime),
      receivedAt: this.clock(),
    };
    validateListingMarketObservation(observation);
    return observation;
  }
}

function validateRequest(request: ListingMarketObservationRequest): void {
  if (request.provider !== 'binance' || !SYMBOL_PATTERN.test(request.symbol)) {
    throw new Error('Invalid Binance listing market observation request');
  }
}

function isSafeEpoch(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
