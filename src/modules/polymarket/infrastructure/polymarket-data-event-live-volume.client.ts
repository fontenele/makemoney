import Decimal from 'decimal.js';
import {
  PredictionEventLiveVolumeObservation,
  PredictionEventLiveVolumeProvider,
  PredictionEventLiveVolumeUnavailableError,
  PredictionEventMarketLiveVolume,
} from '../domain/prediction-event-live-volume';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const MAXIMUM_MARKETS = 1_000;
const EVENT_ID = /^[1-9]\d{0,99}$/;
const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export class PolymarketDataEventLiveVolumeClient implements PredictionEventLiveVolumeProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getLiveVolume(
    eventId: string,
    signal?: AbortSignal,
  ): Promise<PredictionEventLiveVolumeObservation> {
    if (!EVENT_ID.test(eventId)) {
      throw new Error('Invalid Polymarket event identity');
    }
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const url = new URL(
      '/v2/live-volume',
      `${this.baseUrl.replace(/\/$/, '')}/`,
    );
    url.searchParams.set('event_id', eventId);
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.status === 404) {
      throw new PredictionEventLiveVolumeUnavailableError(eventId);
    }
    if (!response.ok) {
      throw new Error(
        `Polymarket event live-volume request failed: ${response.status}`,
      );
    }
    return this.normalize(
      eventId,
      JSON.parse(await response.text()) as unknown,
    );
  }

  normalize(
    eventId: string,
    payload: unknown,
  ): PredictionEventLiveVolumeObservation {
    if (!isRecord(payload) || !isRecord(payload.data)) throw invalidPayload();
    const total = normalizeDecimal(payload.data.taker_volume_total);
    const conditions = payload.data.conditions;
    if (!Array.isArray(conditions) || conditions.length > MAXIMUM_MARKETS) {
      throw invalidPayload();
    }
    const identities = new Set<string>();
    const markets: PredictionEventMarketLiveVolume[] = conditions.map((row) => {
      if (!isRecord(row)) throw invalidPayload();
      const conditionId = normalizeConditionId(row.condition_id);
      const identity = conditionId ?? 'unidentified';
      if (identities.has(identity)) throw invalidPayload();
      identities.add(identity);
      return {
        conditionId,
        takerVolumeShares: normalizeDecimal(row.taker_volume),
      };
    });
    for (let index = 1; index < markets.length; index += 1) {
      if (
        new Decimal(markets[index - 1].takerVolumeShares).lt(
          markets[index].takerVolumeShares,
        )
      ) {
        throw invalidPayload();
      }
    }
    const calculatedTotal = markets.reduce(
      (sum, market) => sum.plus(market.takerVolumeShares),
      new Decimal(0),
    );
    if (!calculatedTotal.eq(total)) throw invalidPayload();
    return {
      provider: 'polymarket',
      eventId,
      takerVolumeTotalShares: total,
      markets,
      source: 'data-api-live-volume',
      receivedAt: this.clock(),
    };
  }
}

function normalizeConditionId(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !CONDITION_ID.test(value)) {
    throw invalidPayload();
  }
  return value.toLowerCase();
}

function normalizeDecimal(value: unknown): string {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'number' && (!Number.isFinite(value) || value < 0))
  ) {
    throw invalidPayload();
  }
  const text = String(value);
  if (!DECIMAL.test(text) || text.length > 100) throw invalidPayload();
  try {
    const decimal = new Decimal(text);
    if (!decimal.isFinite() || decimal.isNegative()) throw invalidPayload();
  } catch {
    throw invalidPayload();
  }
  return text;
}

function invalidPayload(): Error {
  return new Error('Invalid Polymarket event live-volume payload');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
