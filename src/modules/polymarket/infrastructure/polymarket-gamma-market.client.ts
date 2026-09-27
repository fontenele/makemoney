import {
  ActivePredictionMarketQuery,
  PredictionMarket,
  PredictionMarketDetails,
  PredictionMarketNotFoundError,
  PredictionMarketPage,
  PredictionMarketProvider,
} from '../domain/prediction-market';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;
const TOKEN_ID = /^(?:0|[1-9]\d{0,77})$/;

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

  async getById(
    id: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketDetails> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/markets/${encodeURIComponent(id)}`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (response.status === 404) {
      throw new PredictionMarketNotFoundError(id);
    }
    if (!response.ok) {
      throw new Error(
        `Polymarket market detail request failed: ${response.status}`,
      );
    }
    const details = this.normalizeDetails(
      JSON.parse(await response.text()) as unknown,
    );
    if (details.id !== id) {
      throw new Error('Invalid Polymarket market detail identity');
    }
    return details;
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

  normalizeDetails(payload: unknown): PredictionMarketDetails {
    if (!isRecord(payload)) {
      throw new Error('Invalid Polymarket market detail payload');
    }
    const market = normalizeMarketIdentity(payload);
    const labels = parseEncodedArray(payload.outcomes, validOutcomeLabel);
    const tokenIds =
      payload.clobTokenIds === null
        ? [null, null]
        : parseEncodedArray(payload.clobTokenIds, validTokenId);

    return {
      ...market,
      outcomes: {
        yes: { label: labels[0], tokenId: tokenIds[0] },
        no: { label: labels[1], tokenId: tokenIds[1] },
      },
      receivedAt: this.clock(),
    };
  }
}

function normalizeMarket(value: unknown): PredictionMarket {
  if (!isRecord(value)) {
    throw new Error('Invalid Polymarket market payload');
  }

  const identity = normalizeMarketIdentity(value);

  return {
    ...identity,
    closed: false,
  };
}

function normalizeMarketIdentity(value: Record<string, unknown>) {
  if (
    !validRequiredString(value.id, 100) ||
    !validOptionalString(value.slug, 500) ||
    !validOptionalString(value.question, 2_000) ||
    !validConditionId(value.conditionId)
  ) {
    throw new Error('Invalid Polymarket market payload');
  }
  return {
    provider: 'polymarket' as const,
    id: value.id,
    slug: value.slug,
    question: value.question,
    conditionId: value.conditionId,
  };
}

function parseEncodedArray<T>(
  value: unknown,
  validItem: (item: unknown) => item is T,
): [T, T] {
  if (typeof value !== 'string') {
    throw new Error('Invalid Polymarket outcome identity payload');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new Error('Invalid Polymarket outcome identity payload');
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 2 ||
    !validItem(parsed[0]) ||
    !validItem(parsed[1])
  ) {
    throw new Error('Invalid Polymarket outcome identity payload');
  }
  return [parsed[0], parsed[1]];
}

function validOutcomeLabel(value: unknown): value is string {
  return validRequiredString(value, 100);
}

function validTokenId(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && TOKEN_ID.test(value));
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
