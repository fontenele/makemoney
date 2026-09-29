import { isPredictionMarketTokenId } from '../domain/prediction-market-midpoint';
import {
  isPredictionMarketTokenParentIdentity,
  PredictionMarketTokenParent,
  PredictionMarketTokenParentProvider,
  PredictionMarketTokenParentUnavailableError,
} from '../domain/prediction-market-token-parent';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;

export class PolymarketClobMarketByTokenClient implements PredictionMarketTokenParentProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getByToken(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketTokenParent> {
    if (!isPredictionMarketTokenId(tokenId)) {
      throw new Error('Invalid Polymarket token identity');
    }
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const url = new URL(
      `/markets-by-token/${tokenId}`,
      `${this.baseUrl.replace(/\/$/, '')}/`,
    );
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.status === 400 || response.status === 404) {
      throw new PredictionMarketTokenParentUnavailableError(tokenId);
    }
    if (!response.ok) {
      throw new Error(
        `Polymarket market-by-token request failed: ${response.status}`,
      );
    }
    return this.normalize(
      tokenId,
      JSON.parse(await response.text()) as unknown,
    );
  }

  normalize(tokenId: string, payload: unknown): PredictionMarketTokenParent {
    if (
      !isRecord(payload) ||
      typeof payload.condition_id !== 'string' ||
      typeof payload.primary_token_id !== 'string' ||
      typeof payload.secondary_token_id !== 'string' ||
      !isPredictionMarketTokenParentIdentity({
        conditionId: payload.condition_id,
        yesTokenId: payload.primary_token_id,
        noTokenId: payload.secondary_token_id,
      }) ||
      (tokenId !== payload.primary_token_id &&
        tokenId !== payload.secondary_token_id)
    ) {
      throw new Error('Invalid Polymarket market-by-token payload');
    }

    return {
      provider: 'polymarket',
      requestedTokenId: tokenId,
      requestedOutcome: tokenId === payload.primary_token_id ? 'yes' : 'no',
      conditionId: payload.condition_id,
      outcomes: {
        yes: { tokenId: payload.primary_token_id },
        no: { tokenId: payload.secondary_token_id },
      },
      source: 'clob-market-by-token',
      receivedAt: this.clock(),
      executable: false,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
