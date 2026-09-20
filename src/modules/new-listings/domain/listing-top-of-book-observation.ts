import { SpotSymbol } from './spot-symbol-catalog';
import Decimal from 'decimal.js';

const CANONICAL_SYMBOL_PATTERN = /^[A-Z0-9]{1,30}$/;
const NON_NEGATIVE_INTEGER_PATTERN = /^(?:0|[1-9]\d*)$/;
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;

export interface ListingTopOfBookObservation {
  provider: SpotSymbol['provider'];
  symbol: string;
  updateId: string;
  bidPrice: string;
  bidQuantity: string;
  askPrice: string;
  askQuantity: string;
  receivedAt: Date;
}

export interface ListingTopOfBookObservationRequest {
  provider: SpotSymbol['provider'];
  symbol: string;
}

export const LISTING_TOP_OF_BOOK_OBSERVATION_PROVIDER = Symbol(
  'LISTING_TOP_OF_BOOK_OBSERVATION_PROVIDER',
);

export interface ListingTopOfBookObservationProvider {
  load(
    request: ListingTopOfBookObservationRequest,
    signal?: AbortSignal,
  ): Promise<ListingTopOfBookObservation>;
}

export function validateListingTopOfBookObservation(
  observation: ListingTopOfBookObservation,
): void {
  if (observation.provider !== 'binance') {
    throw new Error('Listing top-of-book provider is unsupported');
  }
  if (!CANONICAL_SYMBOL_PATTERN.test(observation.symbol)) {
    throw new Error('Listing top-of-book symbol must be canonical');
  }
  if (!NON_NEGATIVE_INTEGER_PATTERN.test(observation.updateId)) {
    throw new Error(
      'Listing top-of-book update ID must be a non-negative integer',
    );
  }
  validatePositiveDecimal(observation.bidPrice, 'bid price');
  validatePositiveDecimal(observation.askPrice, 'ask price');
  validateNonNegativeDecimal(observation.bidQuantity, 'bid quantity');
  validateNonNegativeDecimal(observation.askQuantity, 'ask quantity');
  if (new Decimal(observation.askPrice).lessThan(observation.bidPrice)) {
    throw new Error('Listing top-of-book must not be crossed');
  }
  if (
    !(observation.receivedAt instanceof Date) ||
    !Number.isFinite(observation.receivedAt.getTime())
  ) {
    throw new Error('Listing top-of-book received time must be valid');
  }
}

function validatePositiveDecimal(value: string, field: string): void {
  if (!POSITIVE_DECIMAL_PATTERN.test(value)) {
    throw new Error(`Listing top-of-book ${field} must be positive`);
  }
}

function validateNonNegativeDecimal(value: string, field: string): void {
  if (!NON_NEGATIVE_DECIMAL_PATTERN.test(value)) {
    throw new Error(`Listing top-of-book ${field} must be non-negative`);
  }
}
