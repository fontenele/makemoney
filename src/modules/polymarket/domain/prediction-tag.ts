export interface PredictionTag {
  id: string;
  label: string | null;
  slug: string | null;
}

export interface PredictionTagPage {
  provider: 'polymarket';
  tags: PredictionTag[];
  offset: number;
  nextOffset: number | null;
  stablePagination: false;
  receivedAt: Date;
}

export interface PredictionTagDetails extends PredictionTag {
  provider: 'polymarket';
  receivedAt: Date;
}

export interface PredictionRelatedTags {
  provider: 'polymarket';
  tagId: string;
  tags: PredictionTag[];
  receivedAt: Date;
}

export interface PredictionTagQuery {
  limit: number;
  offset: number;
}

export const PREDICTION_TAG_PROVIDER = Symbol('PREDICTION_TAG_PROVIDER');

export interface PredictionTagProvider {
  list(
    query: PredictionTagQuery,
    signal?: AbortSignal,
  ): Promise<PredictionTagPage>;
  getById(id: string, signal?: AbortSignal): Promise<PredictionTagDetails>;
  getRelatedById(
    id: string,
    signal?: AbortSignal,
  ): Promise<PredictionRelatedTags>;
}

export class PredictionTagNotFoundError extends Error {
  constructor(id: string) {
    super(`Polymarket tag ${id} was not found`);
    this.name = PredictionTagNotFoundError.name;
  }
}
