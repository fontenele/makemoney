import { SpotSymbol } from './spot-symbol-catalog';

const CANONICAL_SYMBOL_PATTERN = /^[A-Z0-9]{1,30}$/;
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;

export interface ListingMarketObservation {
  provider: SpotSymbol['provider'];
  symbol: string;
  lastPrice: string;
  baseVolume: string;
  quoteVolume: string;
  tradeCount: number;
  windowOpenTime: Date;
  windowCloseTime: Date;
  receivedAt: Date;
}

export interface ListingMarketObservationRequest {
  provider: SpotSymbol['provider'];
  symbol: string;
}

export const LISTING_MARKET_OBSERVATION_PROVIDER = Symbol(
  'LISTING_MARKET_OBSERVATION_PROVIDER',
);

export interface ListingMarketObservationProvider {
  load(
    request: ListingMarketObservationRequest,
    signal?: AbortSignal,
  ): Promise<ListingMarketObservation>;
}

export function validateListingMarketObservation(
  observation: ListingMarketObservation,
): void {
  if (observation.provider !== 'binance') {
    throw new Error('Listing market observation provider is unsupported');
  }
  if (!CANONICAL_SYMBOL_PATTERN.test(observation.symbol)) {
    throw new Error('Listing market observation symbol must be canonical');
  }
  if (!POSITIVE_DECIMAL_PATTERN.test(observation.lastPrice)) {
    throw new Error('Listing market observation last price must be positive');
  }
  validateNonNegativeDecimal(observation.baseVolume, 'base volume');
  validateNonNegativeDecimal(observation.quoteVolume, 'quote volume');
  if (
    !Number.isSafeInteger(observation.tradeCount) ||
    observation.tradeCount < 0
  ) {
    throw new Error(
      'Listing market observation trade count must be a non-negative safe integer',
    );
  }
  validateDate(observation.windowOpenTime, 'window open time');
  validateDate(observation.windowCloseTime, 'window close time');
  validateDate(observation.receivedAt, 'received time');
  if (
    observation.windowOpenTime.getTime() > observation.windowCloseTime.getTime()
  ) {
    throw new Error(
      'Listing market observation window open time must not follow its close time',
    );
  }
}

function validateNonNegativeDecimal(value: string, field: string): void {
  if (!NON_NEGATIVE_DECIMAL_PATTERN.test(value)) {
    throw new Error(`Listing market observation ${field} must be non-negative`);
  }
}

function validateDate(value: Date, field: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error(`Listing market observation ${field} must be valid`);
  }
}
