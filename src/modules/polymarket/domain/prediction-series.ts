export interface PredictionSeries {
  id: string;
  slug: string | null;
  title: string | null;
  recurrence: string | null;
  closed: boolean;
}

export interface PredictionSeriesDetails extends PredictionSeries {
  provider: 'polymarket';
  receivedAt: Date;
}

export interface PredictionSeriesPage {
  provider: 'polymarket';
  series: PredictionSeries[];
  offset: number;
  nextOffset: number | null;
  stablePagination: false;
  receivedAt: Date;
}

export interface PredictionSeriesEvent {
  id: string;
  slug: string | null;
  title: string;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  closed: boolean;
  archived: boolean;
  restricted: boolean;
}

export interface PredictionSeriesEvents {
  provider: 'polymarket';
  seriesId: string;
  events: PredictionSeriesEvent[];
  receivedAt: Date;
}

export interface PredictionSeriesQuery {
  limit: number;
  offset: number;
  recurrence?: string;
}

export const PREDICTION_SERIES_PROVIDER = Symbol('PREDICTION_SERIES_PROVIDER');

export interface PredictionSeriesProvider {
  listActive(
    query: PredictionSeriesQuery,
    signal?: AbortSignal,
  ): Promise<PredictionSeriesPage>;
  getById(id: string, signal?: AbortSignal): Promise<PredictionSeriesDetails>;
  getEventsById(
    id: string,
    signal?: AbortSignal,
  ): Promise<PredictionSeriesEvents>;
}

export class PredictionSeriesNotFoundError extends Error {
  constructor(id: string) {
    super(`Polymarket series ${id} was not found`);
    this.name = PredictionSeriesNotFoundError.name;
  }
}
