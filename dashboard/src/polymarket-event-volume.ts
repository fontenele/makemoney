import type { PolymarketEventLiveVolume, PolymarketMarketSummary } from './api';

export interface PolymarketEventVolumeRow {
  conditionId: string | null;
  marketId: string | null;
  label: string;
  slug: string | null;
  question: string | null;
  closed: boolean | null;
  takerVolumeShares: string;
}

export interface PolymarketEventVolumePage {
  rows: PolymarketEventVolumeRow[];
  page: number;
  pageCount: number;
  total: number;
}

export function buildPolymarketEventVolumeRows(
  observation: PolymarketEventLiveVolume,
  limit = 8,
): PolymarketEventVolumeRow[] {
  const marketsByCondition = new Map(
    observation.event.markets.flatMap((market) =>
      market.conditionId === null
        ? []
        : [[market.conditionId.toLowerCase(), market] as const],
    ),
  );

  return observation.markets.slice(0, limit).map((volume) => {
    const market =
      volume.conditionId === null
        ? undefined
        : marketsByCondition.get(volume.conditionId.toLowerCase());
    return {
      conditionId: volume.conditionId,
      marketId: market?.id ?? null,
      label:
        market?.question ??
        market?.slug ??
        (market ? `Market ${market.id}` : 'Unidentified provider row'),
      slug: market?.slug ?? null,
      question: market?.question ?? null,
      closed: market?.closed ?? null,
      takerVolumeShares: volume.takerVolumeShares,
    };
  });
}

export function buildPolymarketEventVolumePage(
  observation: PolymarketEventLiveVolume,
  requestedPage: number,
  pageSize = 8,
): PolymarketEventVolumePage {
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
    throw new Error('Polymarket event volume page must be a positive integer');
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new Error(
      'Polymarket event volume page size must be a positive integer',
    );
  }

  const total = observation.markets.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const offset = (page - 1) * pageSize;
  const marketsByCondition = new Map(
    observation.event.markets.flatMap((market) =>
      market.conditionId === null
        ? []
        : [[market.conditionId.toLowerCase(), market] as const],
    ),
  );

  return {
    rows: observation.markets.slice(offset, offset + pageSize).map((volume) => {
      const market =
        volume.conditionId === null
          ? undefined
          : marketsByCondition.get(volume.conditionId.toLowerCase());
      return {
        conditionId: volume.conditionId,
        marketId: market?.id ?? null,
        label:
          market?.question ??
          market?.slug ??
          (market ? `Market ${market.id}` : 'Unidentified provider row'),
        slug: market?.slug ?? null,
        question: market?.question ?? null,
        closed: market?.closed ?? null,
        takerVolumeShares: volume.takerVolumeShares,
      };
    }),
    page,
    pageCount,
    total,
  };
}

export function eventVolumeRowToSummary(
  row: PolymarketEventVolumeRow,
): PolymarketMarketSummary | null {
  if (row.marketId === null || row.closed !== false) return null;
  return {
    provider: 'polymarket',
    id: row.marketId,
    slug: row.slug,
    question: row.question,
    conditionId: row.conditionId,
    closed: false,
  };
}
