import {
  PredictionTag,
  PredictionTagDetails,
  PredictionTagNotFoundError,
  PredictionTagPage,
  PredictionTagProvider,
  PredictionTagQuery,
  PredictionRelatedTags,
} from '../domain/prediction-tag';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const MAXIMUM_TAGS = 100;
const MAXIMUM_OFFSET = 10_000;

export class PolymarketGammaTagClient implements PredictionTagProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async list(
    query: PredictionTagQuery,
    signal?: AbortSignal,
  ): Promise<PredictionTagPage> {
    const parameters = new URLSearchParams({
      limit: query.limit.toString(),
      offset: query.offset.toString(),
      order: 'id',
      ascending: 'true',
    });
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/tags?${parameters.toString()}`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (!response.ok) {
      throw new Error(
        `Polymarket tag catalog request failed: ${response.status}`,
      );
    }
    return this.normalize(JSON.parse(await response.text()) as unknown, query);
  }

  async getById(
    id: string,
    signal?: AbortSignal,
  ): Promise<PredictionTagDetails> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/tags/${encodeURIComponent(id)}`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (response.status === 404) {
      throw new PredictionTagNotFoundError(id);
    }
    if (!response.ok) {
      throw new Error(
        `Polymarket tag detail request failed: ${response.status}`,
      );
    }
    const tag = normalizeTag(JSON.parse(await response.text()) as unknown);
    if (tag.id !== id) {
      throw new Error('Invalid Polymarket tag detail identity');
    }
    return { provider: 'polymarket', ...tag, receivedAt: this.clock() };
  }

  async getRelatedById(
    id: string,
    signal?: AbortSignal,
  ): Promise<PredictionRelatedTags> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/tags/${encodeURIComponent(id)}/related-tags/tags`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (response.status === 404) {
      throw new PredictionTagNotFoundError(id);
    }
    if (!response.ok) {
      throw new Error(
        `Polymarket related-tag request failed: ${response.status}`,
      );
    }
    return this.normalizeRelated(
      id,
      JSON.parse(await response.text()) as unknown,
    );
  }

  normalize(payload: unknown, query: PredictionTagQuery): PredictionTagPage {
    if (
      !Array.isArray(payload) ||
      payload.length > query.limit ||
      payload.length > MAXIMUM_TAGS
    ) {
      throw new Error('Invalid Polymarket tag catalog payload');
    }
    const tags = payload.map(normalizeTag);
    if (new Set(tags.map((tag) => tag.id)).size !== tags.length) {
      throw new Error('Invalid Polymarket tag catalog payload');
    }
    const candidateOffset = query.offset + tags.length;
    return {
      provider: 'polymarket',
      tags,
      offset: query.offset,
      nextOffset:
        tags.length === query.limit && candidateOffset <= MAXIMUM_OFFSET
          ? candidateOffset
          : null,
      stablePagination: false,
      receivedAt: this.clock(),
    };
  }

  normalizeRelated(id: string, payload: unknown): PredictionRelatedTags {
    if (!Array.isArray(payload) || payload.length > MAXIMUM_TAGS) {
      throw new Error('Invalid Polymarket related-tag payload');
    }
    const tags = payload.map(normalizeTag);
    if (
      new Set(tags.map((tag) => tag.id)).size !== tags.length ||
      tags.some((tag) => tag.id === id)
    ) {
      throw new Error('Invalid Polymarket related-tag payload');
    }
    return {
      provider: 'polymarket',
      tagId: id,
      tags,
      receivedAt: this.clock(),
    };
  }
}

function normalizeTag(value: unknown): PredictionTag {
  if (
    !isRecord(value) ||
    !validRequiredString(value.id, 100) ||
    !validOptionalString(value.label, 500) ||
    !validOptionalString(value.slug, 500)
  ) {
    throw new Error('Invalid Polymarket tag payload');
  }
  return { id: value.id, label: value.label, slug: value.slug };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
