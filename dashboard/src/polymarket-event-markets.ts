import type { PolymarketEventDetails, PolymarketMarketSummary } from './api';

export interface PolymarketEventMarketRow {
  id: string;
  label: string;
  slug: string | null;
  question: string | null;
  conditionId: string | null;
  closed: boolean;
}

export function buildPolymarketEventMarketRows(
  event: PolymarketEventDetails,
  limit = 8,
): PolymarketEventMarketRow[] {
  return event.markets.slice(0, limit).map((market) => ({
    id: market.id,
    label: market.question ?? market.slug ?? `Market ${market.id}`,
    slug: market.slug,
    question: market.question,
    conditionId: market.conditionId,
    closed: market.closed,
  }));
}

export function eventMarketRowToSummary(
  market: PolymarketEventMarketRow,
): PolymarketMarketSummary | null {
  if (market.closed) return null;
  return {
    provider: 'polymarket',
    id: market.id,
    slug: market.slug,
    question: market.question,
    conditionId: market.conditionId,
    closed: false,
  };
}
