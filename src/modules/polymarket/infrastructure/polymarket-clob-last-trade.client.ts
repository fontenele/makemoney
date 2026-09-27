import {
  PredictionMarketLastTradeObservation,
  PredictionMarketLastTradeProvider,
  PredictionMarketLastTradeUnavailableError,
} from '../domain/prediction-market-last-trade';
import { isPredictionMarketTokenId } from '../domain/prediction-market-midpoint';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const PRICE = /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/;

export class PolymarketClobLastTradeClient implements PredictionMarketLastTradeProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getLastTrade(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketLastTradeObservation> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new Error('Invalid Polymarket token identity');
    }
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const url = new URL(
      '/last-trade-price',
      `${this.baseUrl.replace(/\/$/, '')}/`,
    );
    url.searchParams.set('token_id', tokenId);
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.status === 400 || response.status === 404) {
      throw new PredictionMarketLastTradeUnavailableError(tokenId);
    }
    if (!response.ok) {
      throw new Error(
        `Polymarket last-trade request failed: ${response.status}`,
      );
    }
    return this.normalize(
      tokenId,
      JSON.parse(await response.text()) as unknown,
    );
  }

  normalize(
    tokenId: string,
    payload: unknown,
  ): PredictionMarketLastTradeObservation {
    if (
      !isRecord(payload) ||
      typeof payload.price !== 'string' ||
      !PRICE.test(payload.price) ||
      typeof payload.side !== 'string'
    ) {
      throw new Error('Invalid Polymarket last-trade payload');
    }
    if (payload.price === '0.5' && payload.side === '') {
      throw new PredictionMarketLastTradeUnavailableError(tokenId);
    }
    if (payload.side !== 'BUY' && payload.side !== 'SELL') {
      throw new Error('Invalid Polymarket last-trade payload');
    }
    return {
      provider: 'polymarket',
      tokenId,
      price: payload.price,
      side: payload.side === 'BUY' ? 'buy' : 'sell',
      source: 'clob-last-trade',
      executable: false,
      providerTimestamp: null,
      receivedAt: this.clock(),
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
