import {
  PredictionSeries,
  PredictionSeriesDetails,
  PredictionSeriesNotFoundError,
  PredictionSeriesPage,
  PredictionSeriesProvider,
  PredictionSeriesQuery,
} from '../domain/prediction-series';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const MAXIMUM_SERIES = 100;
const MAXIMUM_OFFSET = 10_000;

export class PolymarketGammaSeriesClient implements PredictionSeriesProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async listActive(
    query: PredictionSeriesQuery,
    signal?: AbortSignal,
  ): Promise<PredictionSeriesPage> {
    const parameters = new URLSearchParams({
      limit: query.limit.toString(),
      offset: query.offset.toString(),
      order: 'id',
      ascending: 'true',
      closed: 'false',
      exclude_events: 'true',
    });
    if (query.recurrence) {
      parameters.set('recurrence', query.recurrence);
    }
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/series?${parameters.toString()}`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (!response.ok) {
      throw new Error(
        `Polymarket series discovery request failed: ${response.status}`,
      );
    }
    return this.normalizePage(
      JSON.parse(await response.text()) as unknown,
      query,
    );
  }

  async getById(
    id: string,
    signal?: AbortSignal,
  ): Promise<PredictionSeriesDetails> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(
      `${this.baseUrl.replace(/\/$/, '')}/series/${encodeURIComponent(id)}`,
      {
        headers: { accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (response.status === 404) {
      throw new PredictionSeriesNotFoundError(id);
    }
    if (!response.ok) {
      throw new Error(
        `Polymarket series detail request failed: ${response.status}`,
      );
    }
    return {
      provider: 'polymarket',
      ...this.normalize(JSON.parse(await response.text()) as unknown, id),
      receivedAt: this.clock(),
    };
  }

  normalizePage(
    payload: unknown,
    query: PredictionSeriesQuery,
  ): PredictionSeriesPage {
    if (
      !Array.isArray(payload) ||
      payload.length > query.limit ||
      payload.length > MAXIMUM_SERIES
    ) {
      throw new Error('Invalid Polymarket series discovery payload');
    }
    const series = payload.map((value) => this.normalize(value));
    if (
      new Set(series.map((item) => item.id)).size !== series.length ||
      series.some(
        (item) =>
          item.closed ||
          (query.recurrence !== undefined &&
            item.recurrence !== query.recurrence),
      )
    ) {
      throw new Error('Invalid Polymarket series discovery payload');
    }
    const candidateOffset = query.offset + series.length;
    return {
      provider: 'polymarket',
      series,
      offset: query.offset,
      nextOffset:
        series.length === query.limit && candidateOffset <= MAXIMUM_OFFSET
          ? candidateOffset
          : null,
      stablePagination: false,
      receivedAt: this.clock(),
    };
  }

  normalize(payload: unknown, requiredId?: string): PredictionSeries {
    if (
      !isRecord(payload) ||
      !validRequiredString(payload.id, 100) ||
      (requiredId !== undefined && payload.id !== requiredId) ||
      !validOptionalString(payload.slug, 500) ||
      !validOptionalString(payload.title, 1_000) ||
      !validOptionalString(payload.recurrence, 100) ||
      typeof payload.closed !== 'boolean'
    ) {
      throw new Error('Invalid Polymarket series detail payload');
    }
    return {
      id: payload.id,
      slug: payload.slug,
      title: payload.title,
      recurrence: payload.recurrence,
      closed: payload.closed,
    };
  }
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
