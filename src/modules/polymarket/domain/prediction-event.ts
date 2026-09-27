export interface PredictionEventMarketIdentity {
  id: string;
  slug: string | null;
  question: string | null;
  conditionId: string | null;
  closed: boolean;
}

export interface PredictionEventDetails {
  provider: 'polymarket';
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  resolutionSource: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  closed: boolean;
  archived: boolean;
  restricted: boolean;
  markets: PredictionEventMarketIdentity[];
  receivedAt: Date;
}

export interface PredictionEvent {
  provider: 'polymarket';
  id: string;
  slug: string | null;
  title: string;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  closed: false;
  archived: boolean;
  restricted: boolean;
}

export interface PredictionEventPage {
  events: PredictionEvent[];
  nextCursor: string | null;
  receivedAt: Date;
}

export interface PredictionEventTag {
  id: string;
  label: string | null;
  slug: string | null;
}

export interface PredictionEventTags {
  provider: 'polymarket';
  eventId: string;
  tags: PredictionEventTag[];
  receivedAt: Date;
}

export interface ActivePredictionEventQuery {
  limit: number;
  afterCursor?: string;
  tagId?: string;
}

export const PREDICTION_EVENT_PROVIDER = Symbol('PREDICTION_EVENT_PROVIDER');

export interface PredictionEventProvider {
  listActive(
    query: ActivePredictionEventQuery,
    signal?: AbortSignal,
  ): Promise<PredictionEventPage>;
  getById(id: string, signal?: AbortSignal): Promise<PredictionEventDetails>;
  getTagsById(id: string, signal?: AbortSignal): Promise<PredictionEventTags>;
}

export class PredictionEventNotFoundError extends Error {
  constructor(id: string) {
    super(`Polymarket event ${id} was not found`);
    this.name = PredictionEventNotFoundError.name;
  }
}
