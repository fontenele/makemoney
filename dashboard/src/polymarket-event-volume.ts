import type { PolymarketEventLiveVolume } from './api';

export interface PolymarketEventVolumeRow {
  conditionId: string | null;
  marketId: string | null;
  label: string;
  takerVolumeShares: string;
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
      takerVolumeShares: volume.takerVolumeShares,
    };
  });
}
