import Decimal from 'decimal.js';
import { isPredictionMarketTokenId } from '../domain/prediction-market-midpoint';
import {
  PredictionMarketBookLevel,
  PredictionMarketOrderBookProvider,
  PredictionMarketOrderBookUnavailableError,
  PredictionMarketTopOfBook,
} from '../domain/prediction-market-top-of-book';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const PRICE = /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/;
const POSITIVE_DECIMAL = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const TIMESTAMP = /^(?:0|[1-9]\d{0,19})$/;
const BookDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export class PolymarketClobOrderBookClient implements PredictionMarketOrderBookProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getTopOfBook(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketTopOfBook> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new Error('Invalid Polymarket token identity');
    }
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const url = new URL('/book', `${this.baseUrl.replace(/\/$/, '')}/`);
    url.searchParams.set('token_id', tokenId);
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.status === 400 || response.status === 404) {
      throw new PredictionMarketOrderBookUnavailableError(tokenId);
    }
    if (!response.ok) {
      throw new Error(
        `Polymarket order-book request failed: ${response.status}`,
      );
    }
    return this.normalize(
      tokenId,
      JSON.parse(await response.text()) as unknown,
    );
  }

  normalize(tokenId: string, payload: unknown): PredictionMarketTopOfBook {
    if (
      !isRecord(payload) ||
      payload.asset_id !== tokenId ||
      !validString(payload.market, 200) ||
      !validString(payload.hash, 500) ||
      typeof payload.timestamp !== 'string' ||
      !TIMESTAMP.test(payload.timestamp) ||
      !Array.isArray(payload.bids) ||
      !Array.isArray(payload.asks)
    ) {
      throw new Error('Invalid Polymarket order-book payload');
    }

    const bids = normalizeLevels(payload.bids, 'descending');
    const asks = normalizeLevels(payload.asks, 'ascending');
    const bid = bids[0] ?? null;
    const ask = asks[0] ?? null;
    if (
      bid !== null &&
      ask !== null &&
      new BookDecimal(bid.price).greaterThan(ask.price)
    ) {
      throw new Error('Invalid Polymarket crossed order book');
    }

    return {
      provider: 'polymarket',
      tokenId,
      conditionId: payload.market,
      snapshotHash: payload.hash,
      bid,
      ask,
      spread:
        bid === null || ask === null
          ? null
          : new BookDecimal(ask.price).minus(bid.price).toFixed(),
      source: 'clob-order-book',
      executable: false,
      providerTimestamp: payload.timestamp,
      receivedAt: this.clock(),
    };
  }
}

function normalizeLevels(
  values: unknown[],
  order: 'ascending' | 'descending',
): PredictionMarketBookLevel[] {
  const levels = values.map((value) => {
    if (
      !isRecord(value) ||
      typeof value.price !== 'string' ||
      value.price.length > 100 ||
      !PRICE.test(value.price) ||
      typeof value.size !== 'string' ||
      value.size.length > 100 ||
      !POSITIVE_DECIMAL.test(value.size)
    ) {
      throw new Error('Invalid Polymarket order-book level');
    }
    return { price: value.price, quantity: value.size };
  });
  for (let index = 1; index < levels.length; index += 1) {
    const previous = new BookDecimal(levels[index - 1].price);
    const current = new BookDecimal(levels[index].price);
    if (
      (order === 'ascending' && previous.greaterThan(current)) ||
      (order === 'descending' && previous.lessThan(current))
    ) {
      throw new Error('Invalid Polymarket order-book ordering');
    }
  }
  return levels;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validString(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= maximum
  );
}
