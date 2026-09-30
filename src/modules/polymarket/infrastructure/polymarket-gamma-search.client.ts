import { PredictionEvent } from '../domain/prediction-event';
import {
  PredictionSearchProvider,
  PredictionSearchQuery,
  PredictionSearchResult,
} from '../domain/prediction-search';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;

export class PolymarketGammaSearchClient implements PredictionSearchProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async searchActiveEvents(
    query: PredictionSearchQuery,
    signal?: AbortSignal,
  ): Promise<PredictionSearchResult> {
    const parameters = new URLSearchParams({
      q: query.query,
      events_status: 'active',
      limit_per_type: query.limit.toString(),
      page: query.page.toString(),
    });
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/public-search?${parameters.toString()}`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (!response.ok) {
      throw new Error(`Polymarket search request failed: ${response.status}`);
    }
    return this.normalize(JSON.parse(await response.text()) as unknown, query);
  }

  normalize(
    payload: unknown,
    query: PredictionSearchQuery,
  ): PredictionSearchResult {
    if (!isRecord(payload)) {
      throw new Error('Invalid Polymarket search payload');
    }
    const rawEvents = payload.events === null ? [] : payload.events;
    if (
      !Array.isArray(rawEvents) ||
      rawEvents.length > query.limit ||
      !isRecord(payload.pagination) ||
      typeof payload.pagination.hasMore !== 'boolean' ||
      !isNonNegativeInteger(payload.pagination.totalResults)
    ) {
      throw new Error('Invalid Polymarket search payload');
    }
    const events = rawEvents.map(normalizeEvent);
    if (new Set(events.map((event) => event.id)).size !== events.length) {
      throw new Error('Invalid Polymarket search payload');
    }
    return {
      query: query.query,
      page: query.page,
      events,
      hasMore: payload.pagination.hasMore,
      totalResults: payload.pagination.totalResults,
      receivedAt: this.clock(),
    };
  }
}

function normalizeEvent(value: unknown): PredictionEvent {
  if (
    !isRecord(value) ||
    !validRequiredString(value.id, 100) ||
    !validOptionalString(value.slug, 500) ||
    !validRequiredString(value.title, 2_000) ||
    !validOptionalTimestamp(value.startDate) ||
    !validOptionalTimestamp(value.endDate) ||
    value.active !== true ||
    value.closed !== false ||
    typeof value.archived !== 'boolean' ||
    typeof value.restricted !== 'boolean'
  ) {
    throw new Error('Invalid Polymarket search event payload');
  }
  return {
    provider: 'polymarket',
    id: value.id,
    slug: value.slug,
    title: value.title,
    startDate: value.startDate,
    endDate: value.endDate,
    active: true,
    closed: false,
    archived: value.archived,
    restricted: value.restricted,
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

function validOptionalTimestamp(value: unknown): value is string | null {
  return (
    value === null ||
    (validRequiredString(value, 100) && Number.isFinite(Date.parse(value)))
  );
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
