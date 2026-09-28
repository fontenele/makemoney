import {
  PredictionDataFreshnessLaggingCursor,
  PredictionDataFreshnessMechanism,
  PredictionDataFreshnessObservation,
  PredictionDataFreshnessProvider,
} from '../domain/prediction-data-freshness';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const MAXIMUM_LAGGING_CURSORS = 1_000;
const MAXIMUM_SERVING_MECHANISMS = 100;

export class PolymarketDataFreshnessClient implements PredictionDataFreshnessProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getFreshness(
    signal?: AbortSignal,
  ): Promise<PredictionDataFreshnessObservation> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const url = new URL('/v2/status', `${this.baseUrl.replace(/\/$/, '')}/`);
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      throw new Error(
        `Polymarket data freshness request failed: ${response.status}`,
      );
    }
    return this.normalize(JSON.parse(await response.text()) as unknown);
  }

  normalize(payload: unknown): PredictionDataFreshnessObservation {
    if (!isRecord(payload) || !isRecord(payload.data)) {
      throw invalidPayload();
    }
    const data = payload.data;
    if (
      !validNonNegativeNumber(data.age_seconds) ||
      !validTimestamp(data.computed_at) ||
      !isRecord(data.ingestion) ||
      !isRecord(data.serving)
    ) {
      throw invalidPayload();
    }

    const ingestion = normalizeIngestion(data.ingestion);
    const serving = normalizeServing(data.serving);
    return {
      provider: 'polymarket',
      snapshotAgeSeconds: data.age_seconds,
      computedAt: data.computed_at,
      ingestion,
      serving,
      source: 'data-api-status',
      receivedAt: this.clock(),
    };
  }
}

function normalizeIngestion(
  value: Record<string, unknown>,
): PredictionDataFreshnessObservation['ingestion'] {
  if (
    !validPositiveInteger(value.chain_id) ||
    !validNonNegativeInteger(value.cursors) ||
    !Array.isArray(value.lagging) ||
    value.lagging.length > MAXIMUM_LAGGING_CURSORS ||
    !validNonNegativeInteger(value.max_synced_block) ||
    !validNonNegativeInteger(value.min_synced_block) ||
    value.min_synced_block > value.max_synced_block ||
    !isRecord(value.most_lagged) ||
    !validRequiredString(value.network)
  ) {
    throw invalidPayload();
  }
  const lagging = value.lagging.map(normalizeLaggingCursor);
  assertUnique(lagging.map((cursor) => cursor.source));
  if (value.cursors < lagging.length) {
    throw invalidPayload();
  }
  return {
    chainId: value.chain_id,
    cursorCount: value.cursors,
    lagging,
    maxSyncedBlock: value.max_synced_block,
    minSyncedBlock: value.min_synced_block,
    mostLagged: normalizeLaggingCursor(value.most_lagged),
    network: value.network,
  };
}

function normalizeServing(
  value: Record<string, unknown>,
): PredictionDataFreshnessObservation['serving'] {
  if (
    !Array.isArray(value.mechanisms) ||
    value.mechanisms.length === 0 ||
    value.mechanisms.length > MAXIMUM_SERVING_MECHANISMS ||
    !validNonNegativeNumber(value.lag_seconds) ||
    !validRequiredString(value.worst)
  ) {
    throw invalidPayload();
  }
  const mechanisms = value.mechanisms.map(normalizeMechanism);
  assertUnique(mechanisms.map((mechanism) => mechanism.name));
  if (!mechanisms.some((mechanism) => mechanism.name === value.worst)) {
    throw invalidPayload();
  }
  return {
    mechanisms,
    lagSeconds: value.lag_seconds,
    worst: value.worst,
  };
}

function normalizeLaggingCursor(
  value: unknown,
): PredictionDataFreshnessLaggingCursor {
  if (
    !isRecord(value) ||
    !validNonNegativeInteger(value.behind_max) ||
    !validNonNegativeInteger(value.block) ||
    !validRequiredString(value.source)
  ) {
    throw invalidPayload();
  }
  return {
    behindMax: value.behind_max,
    block: value.block,
    source: value.source,
  };
}

function normalizeMechanism(value: unknown): PredictionDataFreshnessMechanism {
  if (
    !isRecord(value) ||
    !validNonNegativeNumber(value.age_seconds) ||
    !validRequiredString(value.name) ||
    !validNonNegativeInteger(value.blocks_behind)
  ) {
    throw invalidPayload();
  }
  return {
    ageSeconds: value.age_seconds,
    name: value.name,
    blocksBehind: value.blocks_behind,
  };
}

function assertUnique(values: string[]): void {
  if (new Set(values).size !== values.length) {
    throw invalidPayload();
  }
}

function validPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function validNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function validNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validRequiredString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200;
}

function validTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 100 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidPayload(): Error {
  return new Error('Invalid Polymarket data freshness payload');
}
