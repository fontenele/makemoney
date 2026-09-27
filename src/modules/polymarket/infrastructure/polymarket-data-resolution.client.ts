import {
  isPredictionMarketConditionId,
  PredictionMarketResolutionProvider,
  PredictionMarketResolutionRecord,
  PredictionMarketResolutionUnavailableError,
} from '../domain/prediction-market-resolution';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;

export class PolymarketDataResolutionClient implements PredictionMarketResolutionProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getResolution(
    conditionId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketResolutionRecord> {
    if (!isPredictionMarketConditionId(conditionId)) {
      throw new Error('Invalid Polymarket condition identity');
    }
    const canonicalConditionId = conditionId.toLowerCase();
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const url = new URL(
      '/v2/resolutions',
      `${this.baseUrl.replace(/\/$/, '')}/`,
    );
    url.searchParams.set('condition', canonicalConditionId);
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      throw new Error(
        `Polymarket resolution request failed: ${response.status}`,
      );
    }
    return this.normalize(
      canonicalConditionId,
      JSON.parse(await response.text()) as unknown,
    );
  }

  normalize(
    conditionId: string,
    payload: unknown,
  ): PredictionMarketResolutionRecord {
    if (!isRecord(payload) || !Array.isArray(payload.data)) {
      throw new Error('Invalid Polymarket resolution payload');
    }
    if (payload.data.length === 0) {
      throw new PredictionMarketResolutionUnavailableError(conditionId);
    }
    if (payload.data.length !== 1 || !isRecord(payload.data[0])) {
      throw new Error('Invalid Polymarket resolution payload');
    }
    const row = payload.data[0];
    if (
      typeof row.condition_id !== 'string' ||
      row.condition_id.toLowerCase() !== conditionId ||
      !validRequiredString(row.status, 100) ||
      typeof row.extended_review !== 'boolean' ||
      typeof row.was_disputed !== 'boolean' ||
      typeof row.was_arbitrated !== 'boolean' ||
      !validNullableTimestamp(row.resolved_at)
    ) {
      throw new Error('Invalid Polymarket resolution payload');
    }
    return {
      provider: 'polymarket',
      conditionId,
      status: row.status,
      extendedReview: row.extended_review,
      wasDisputed: row.was_disputed,
      wasArbitrated: row.was_arbitrated,
      resolvedAt: row.resolved_at,
      source: 'data-api-resolution',
      receivedAt: this.clock(),
      payouts: normalizePayouts(row.payouts),
    };
  }
}

function normalizePayouts(value: unknown): readonly string[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 256 ||
    value.some(
      (item) =>
        typeof item !== 'number' ||
        !Number.isFinite(item) ||
        item < 0 ||
        item > 1,
    )
  ) {
    return null;
  }
  return value.map(String);
}

function validRequiredString(value: unknown, maximum: number): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= maximum
  );
}

function validNullableTimestamp(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === 'string' && value.length > 0 && value.length <= 100)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
