import type { PolymarketEventDetails } from './api';

export interface PolymarketEventMarketRow {
  id: string;
  label: string;
  closed: boolean;
}

export function buildPolymarketEventMarketRows(
  event: PolymarketEventDetails,
  limit = 8,
): PolymarketEventMarketRow[] {
  return event.markets.slice(0, limit).map((market) => ({
    id: market.id,
    label: market.question ?? market.slug ?? `Market ${market.id}`,
    closed: market.closed,
  }));
}
