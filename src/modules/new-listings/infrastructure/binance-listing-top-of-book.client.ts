import {
  ListingTopOfBookObservation,
  ListingTopOfBookObservationProvider,
  ListingTopOfBookObservationRequest,
  validateListingTopOfBookObservation,
} from '../domain/listing-top-of-book-observation';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;
const TIMEOUT_MS = 10_000;
const SYMBOL_PATTERN = /^[A-Z0-9]{1,30}$/;

export class BinanceListingTopOfBookClient implements ListingTopOfBookObservationProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async load(
    request: ListingTopOfBookObservationRequest,
    signal?: AbortSignal,
  ): Promise<ListingTopOfBookObservation> {
    validateRequest(request);
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const url = new URL(`${this.baseUrl.replace(/\/$/, '')}/api/v3/depth`);
    url.searchParams.set('symbol', request.symbol);
    url.searchParams.set('limit', '5');
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      throw new Error(
        `Binance depth snapshot request failed: ${response.status}`,
      );
    }
    return this.normalize(
      JSON.parse(await response.text()) as unknown,
      request,
    );
  }

  normalize(
    payload: unknown,
    request: ListingTopOfBookObservationRequest,
  ): ListingTopOfBookObservation {
    validateRequest(request);
    if (
      !isRecord(payload) ||
      !isNonNegativeSafeInteger(payload.lastUpdateId) ||
      !isPriceLevelArray(payload.bids) ||
      !isPriceLevelArray(payload.asks) ||
      payload.bids.length === 0 ||
      payload.asks.length === 0
    ) {
      throw new Error('Invalid Binance depth snapshot payload');
    }
    const bid = payload.bids[0];
    const ask = payload.asks[0];
    const observation: ListingTopOfBookObservation = {
      provider: 'binance',
      symbol: request.symbol,
      updateId: String(payload.lastUpdateId),
      bidPrice: bid[0],
      bidQuantity: bid[1],
      askPrice: ask[0],
      askQuantity: ask[1],
      receivedAt: this.clock(),
    };
    validateListingTopOfBookObservation(observation);
    return observation;
  }
}

function validateRequest(request: ListingTopOfBookObservationRequest): void {
  if (request.provider !== 'binance' || !SYMBOL_PATTERN.test(request.symbol)) {
    throw new Error('Invalid Binance listing top-of-book request');
  }
}

function isPriceLevelArray(value: unknown): value is [string, string][] {
  return (
    Array.isArray(value) &&
    value.every(
      (level) =>
        Array.isArray(level) &&
        level.length === 2 &&
        typeof level[0] === 'string' &&
        typeof level[1] === 'string',
    )
  );
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
