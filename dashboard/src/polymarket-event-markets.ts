import type { PolymarketEventDetails, PolymarketMarketSummary } from './api';

export interface PolymarketEventMarketRow {
  id: string;
  label: string;
  slug: string | null;
  question: string | null;
  conditionId: string | null;
  closed: boolean;
}

export interface PolymarketEventMarketPage {
  rows: PolymarketEventMarketRow[];
  page: number;
  pageCount: number;
  total: number;
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

export function buildPolymarketEventMarketPage(
  event: PolymarketEventDetails,
  requestedPage: number,
  pageSize = 8,
): PolymarketEventMarketPage {
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
    throw new Error('Polymarket event market page must be a positive integer');
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new Error(
      'Polymarket event market page size must be a positive integer',
    );
  }

  const total = event.markets.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const offset = (page - 1) * pageSize;

  return {
    rows: event.markets.slice(offset, offset + pageSize).map((market) => ({
      id: market.id,
      label: market.question ?? market.slug ?? `Market ${market.id}`,
      slug: market.slug,
      question: market.question,
      conditionId: market.conditionId,
      closed: market.closed,
    })),
    page,
    pageCount,
    total,
  };
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
