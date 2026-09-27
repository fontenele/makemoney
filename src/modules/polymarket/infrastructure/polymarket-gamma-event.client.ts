import {
  ActivePredictionEventQuery,
  PredictionEvent,
  PredictionEventDetails,
  PredictionEventMarketIdentity,
  PredictionEventNotFoundError,
  PredictionEventPage,
  PredictionEventProvider,
  PredictionEventTag,
  PredictionEventTags,
} from '../domain/prediction-event';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const MAXIMUM_MARKETS = 1_000;
const MAXIMUM_TAGS = 100;
const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;

export class PolymarketGammaEventClient implements PredictionEventProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async listActive(
    query: ActivePredictionEventQuery,
    signal?: AbortSignal,
  ): Promise<PredictionEventPage> {
    const parameters = new URLSearchParams({
      closed: 'false',
      limit: query.limit.toString(),
    });
    if (query.tagId) {
      parameters.set('tag_id', query.tagId);
      parameters.set('include_tag', 'true');
    }
    if (query.afterCursor) {
      parameters.set('after_cursor', query.afterCursor);
    }
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/events/keyset?${parameters.toString()}`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (!response.ok) {
      throw new Error(
        `Polymarket event discovery request failed: ${response.status}`,
      );
    }
    return this.normalizePage(
      JSON.parse(await response.text()) as unknown,
      query.tagId,
    );
  }

  async getById(
    id: string,
    signal?: AbortSignal,
  ): Promise<PredictionEventDetails> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/events/${encodeURIComponent(id)}`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (response.status === 404) {
      throw new PredictionEventNotFoundError(id);
    }
    if (!response.ok) {
      throw new Error(`Polymarket event request failed: ${response.status}`);
    }
    const event = this.normalize(JSON.parse(await response.text()) as unknown);
    if (event.id !== id) {
      throw new Error('Invalid Polymarket event identity');
    }
    return event;
  }

  async getTagsById(
    id: string,
    signal?: AbortSignal,
  ): Promise<PredictionEventTags> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/events/${encodeURIComponent(id)}/tags`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (response.status === 404) {
      throw new PredictionEventNotFoundError(id);
    }
    if (!response.ok) {
      throw new Error(
        `Polymarket event tags request failed: ${response.status}`,
      );
    }
    return {
      provider: 'polymarket',
      eventId: id,
      tags: this.normalizeTags(JSON.parse(await response.text()) as unknown),
      receivedAt: this.clock(),
    };
  }

  normalize(payload: unknown): PredictionEventDetails {
    if (
      !isRecord(payload) ||
      !validRequiredString(payload.id, 100) ||
      !validOptionalString(payload.slug, 500) ||
      !validRequiredString(payload.title, 2_000) ||
      !validOptionalString(payload.description, 20_000) ||
      !validOptionalString(payload.resolutionSource, 4_096) ||
      !validOptionalTimestamp(payload.startDate) ||
      !validOptionalTimestamp(payload.endDate) ||
      typeof payload.active !== 'boolean' ||
      typeof payload.closed !== 'boolean' ||
      typeof payload.archived !== 'boolean' ||
      typeof payload.restricted !== 'boolean' ||
      !Array.isArray(payload.markets) ||
      payload.markets.length > MAXIMUM_MARKETS
    ) {
      throw new Error('Invalid Polymarket event payload');
    }
    return {
      provider: 'polymarket',
      id: payload.id,
      slug: payload.slug,
      title: payload.title,
      description: payload.description,
      resolutionSource: payload.resolutionSource,
      startDate: payload.startDate,
      endDate: payload.endDate,
      active: payload.active,
      closed: payload.closed,
      archived: payload.archived,
      restricted: payload.restricted,
      markets: payload.markets.map(normalizeMarket),
      receivedAt: this.clock(),
    };
  }

  normalizePage(payload: unknown, requiredTagId?: string): PredictionEventPage {
    if (
      !isRecord(payload) ||
      !Array.isArray(payload.events) ||
      !validOptionalCursor(payload.next_cursor)
    ) {
      throw new Error('Invalid Polymarket event page payload');
    }
    return {
      events: payload.events.map((event) =>
        normalizeEvent(event, requiredTagId),
      ),
      nextCursor: payload.next_cursor ?? null,
      receivedAt: this.clock(),
    };
  }

  normalizeTags(payload: unknown): PredictionEventTag[] {
    return normalizeTags(payload);
  }
}

function normalizeEvent(
  value: unknown,
  requiredTagId?: string,
): PredictionEvent {
  if (
    !isRecord(value) ||
    !validRequiredString(value.id, 100) ||
    !validOptionalString(value.slug, 500) ||
    !validRequiredString(value.title, 2_000) ||
    !validOptionalTimestamp(value.startDate) ||
    !validOptionalTimestamp(value.endDate) ||
    typeof value.active !== 'boolean' ||
    value.closed !== false ||
    typeof value.archived !== 'boolean' ||
    typeof value.restricted !== 'boolean'
  ) {
    throw new Error('Invalid Polymarket event payload');
  }
  if (requiredTagId !== undefined) {
    const tags = normalizeTags(value.tags);
    if (!tags.some((tag) => tag.id === requiredTagId)) {
      throw new Error('Invalid Polymarket tag-filtered event payload');
    }
  }
  return {
    provider: 'polymarket',
    id: value.id,
    slug: value.slug,
    title: value.title,
    startDate: value.startDate,
    endDate: value.endDate,
    active: value.active,
    closed: false,
    archived: value.archived,
    restricted: value.restricted,
  };
}

function normalizeMarket(value: unknown): PredictionEventMarketIdentity {
  if (
    !isRecord(value) ||
    !validRequiredString(value.id, 100) ||
    !validOptionalString(value.slug, 500) ||
    !validOptionalString(value.question, 2_000) ||
    !validConditionId(value.conditionId) ||
    typeof value.closed !== 'boolean'
  ) {
    throw new Error('Invalid Polymarket event market payload');
  }
  return {
    id: value.id,
    slug: value.slug,
    question: value.question,
    conditionId: value.conditionId,
    closed: value.closed,
  };
}

function normalizeTag(value: unknown): PredictionEventTag {
  if (
    !isRecord(value) ||
    !validRequiredString(value.id, 100) ||
    !validOptionalString(value.label, 500) ||
    !validOptionalString(value.slug, 500)
  ) {
    throw new Error('Invalid Polymarket event tag payload');
  }
  return {
    id: value.id,
    label: value.label,
    slug: value.slug,
  };
}

function normalizeTags(value: unknown): PredictionEventTag[] {
  if (!Array.isArray(value) || value.length > MAXIMUM_TAGS) {
    throw new Error('Invalid Polymarket event tags payload');
  }
  const tags = value.map(normalizeTag);
  if (new Set(tags.map((tag) => tag.id)).size !== tags.length) {
    throw new Error('Invalid Polymarket event tags payload');
  }
  return tags;
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

function validConditionId(value: unknown): value is string | null {
  return (
    value === null || (typeof value === 'string' && CONDITION_ID.test(value))
  );
}

function validOptionalCursor(
  value: unknown,
): value is string | null | undefined {
  return value === undefined || validOptionalString(value, 4_096);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
