import {
  ActivePredictionMarketQuery,
  PredictionMarket,
  PredictionMarketPage,
  PredictionMarketProvider,
} from '../domain/prediction-market';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;

export class PolymarketGammaMarketClient implements PredictionMarketProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async listActive(
    query: ActivePredictionMarketQuery,
    signal?: AbortSignal,
  ): Promise<PredictionMarketPage> {
    const parameters = new URLSearchParams({
      closed: 'false',
      limit: query.limit.toString(),
    });
    if (query.afterCursor) {
      parameters.set('after_cursor', query.afterCursor);
    }

    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/markets/keyset?${parameters.toString()}`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (!response.ok) {
      throw new Error(
        `Polymarket market discovery request failed: ${response.status}`,
      );
    }
    return this.normalize(JSON.parse(await response.text()) as unknown);
  }

  normalize(payload: unknown): PredictionMarketPage {
    if (
      !isRecord(payload) ||
      !Array.isArray(payload.markets) ||
      !validCursor(payload.next_cursor)
    ) {
      throw new Error('Invalid Polymarket market page payload');
    }

    return {
      markets: payload.markets.map(normalizeMarket),
      nextCursor: payload.next_cursor,
      receivedAt: this.clock(),
    };
  }
}

function normalizeMarket(value: unknown): PredictionMarket {
  if (
    !isRecord(value) ||
    !validRequiredString(value.id, 100) ||
    !validOptionalString(value.slug, 500) ||
    !validOptionalString(value.question, 2_000) ||
    !validConditionId(value.conditionId)
  ) {
    throw new Error('Invalid Polymarket market payload');
  }

  return {
    provider: 'polymarket',
    id: value.id,
    slug: value.slug,
    question: value.question,
    conditionId: value.conditionId,
    closed: false,
  };
}

function validRequiredString(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= maximum
  );
}

function validOptionalString(
  value: unknown,
  maximum: number,
): value is string | null {
  return value === null || validRequiredString(value, maximum);
}

function validConditionId(value: unknown): value is string | null {
  return (
    value === null || (typeof value === 'string' && CONDITION_ID.test(value))
  );
}

function validCursor(value: unknown): value is string | null {
  return value === null || validRequiredString(value, 4_096);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
