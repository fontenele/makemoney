import Decimal from 'decimal.js';
import {
  PredictionGlobalOpenInterest,
  PredictionGlobalOpenInterestProvider,
  PredictionMarketConditionOpenInterest,
  PredictionMarketOpenInterestProvider,
  PredictionMarketOpenInterestUnavailableError,
} from '../domain/prediction-market-open-interest';
import { isPredictionMarketConditionId } from '../domain/prediction-market-resolution';

type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;
type Clock = () => Date;

const TIMEOUT_MS = 10_000;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

export class PolymarketDataOpenInterestClient
  implements
    PredictionMarketOpenInterestProvider,
    PredictionGlobalOpenInterestProvider
{
  constructor(
    private readonly baseUrl: string,
    private readonly http: HttpClient = fetch,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async getOpenInterest(
    conditionId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketConditionOpenInterest> {
    if (!isPredictionMarketConditionId(conditionId)) {
      throw new Error('Invalid Polymarket condition identity');
    }
    const canonicalConditionId = conditionId.toLowerCase();
    const url = new URL('/v2/oi', `${this.baseUrl.replace(/\/$/, '')}/`);
    url.searchParams.set('condition', canonicalConditionId);
    return this.normalize(canonicalConditionId, await this.load(url, signal));
  }

  async getGlobalOpenInterest(
    signal?: AbortSignal,
  ): Promise<PredictionGlobalOpenInterest> {
    const url = new URL('/v2/oi', `${this.baseUrl.replace(/\/$/, '')}/`);
    const payload = await this.load(url, signal);
    if (
      !isRecord(payload) ||
      !Array.isArray(payload.data) ||
      payload.data.length !== 1 ||
      !isRecord(payload.data[0]) ||
      payload.data[0].condition_id !== null
    ) {
      throw invalidPayload();
    }
    return {
      provider: 'polymarket',
      openInterestUsdc: normalizeDecimal(payload.data[0].value),
      source: 'data-api-open-interest',
      receivedAt: this.clock(),
      executable: false,
    };
  }

  normalize(
    conditionId: string,
    payload: unknown,
  ): PredictionMarketConditionOpenInterest {
    if (!isRecord(payload) || !Array.isArray(payload.data)) {
      throw invalidPayload();
    }
    if (payload.data.length === 0) {
      throw new PredictionMarketOpenInterestUnavailableError(conditionId);
    }
    if (payload.data.length !== 1 || !isRecord(payload.data[0])) {
      throw invalidPayload();
    }
    const row = payload.data[0];
    if (
      typeof row.condition_id !== 'string' ||
      row.condition_id.toLowerCase() !== conditionId
    ) {
      throw invalidPayload();
    }
    return {
      provider: 'polymarket',
      conditionId,
      openInterestUsdc: normalizeDecimal(row.value),
      source: 'data-api-open-interest',
      receivedAt: this.clock(),
    };
  }

  private async load(url: URL, signal?: AbortSignal): Promise<unknown> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const response = await this.http(url.toString(), {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      throw new Error(
        `Polymarket open-interest request failed: ${response.status}`,
      );
    }
    return JSON.parse(await response.text()) as unknown;
  }
}

function normalizeDecimal(value: unknown): string {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'number' && (!Number.isFinite(value) || value < 0))
  ) {
    throw invalidPayload();
  }
  const text = String(value);
  if (!DECIMAL.test(text) || text.length > 100) {
    throw invalidPayload();
  }
  try {
    const decimal = new Decimal(text);
    if (!decimal.isFinite() || decimal.isNegative()) throw invalidPayload();
  } catch {
    throw invalidPayload();
  }
  return text;
}

function invalidPayload(): Error {
  return new Error('Invalid Polymarket open-interest payload');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
