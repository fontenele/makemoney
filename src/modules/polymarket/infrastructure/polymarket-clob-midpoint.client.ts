import {
  isPredictionMarketTokenId,
  PredictionMarketMidpointProvider,
  PredictionMarketMidpointUnavailableError,
  PredictionMarketOutcomeMidpoint,
} from '../domain/prediction-market-midpoint';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const MIDPOINT_PRICE = /^(?:0(?:\.\d+)?|1(?:\.0+)?)$/;

export class PolymarketClobMidpointClient implements PredictionMarketMidpointProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getMidpoint(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketOutcomeMidpoint> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new Error('Invalid Polymarket token identity');
    }
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const url = new URL('/midpoint', `${this.baseUrl.replace(/\/$/, '')}/`);
    url.searchParams.set('token_id', tokenId);
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.status === 400 || response.status === 404) {
      throw new PredictionMarketMidpointUnavailableError(tokenId);
    }
    if (!response.ok) {
      throw new Error(`Polymarket midpoint request failed: ${response.status}`);
    }
    return this.normalize(
      tokenId,
      JSON.parse(await response.text()) as unknown,
    );
  }

  normalize(
    tokenId: string,
    payload: unknown,
  ): PredictionMarketOutcomeMidpoint {
    if (
      !isRecord(payload) ||
      typeof payload.mid_price !== 'string' ||
      !MIDPOINT_PRICE.test(payload.mid_price)
    ) {
      throw new Error('Invalid Polymarket midpoint payload');
    }
    return {
      provider: 'polymarket',
      tokenId,
      price: payload.mid_price,
      source: 'clob-midpoint',
      executable: false,
      providerTimestamp: null,
      receivedAt: this.clock(),
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
