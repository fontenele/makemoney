import type { PolymarketMarketDetails } from './api';

export interface PolymarketMarketIdentityRow {
  key: 'condition' | 'yes' | 'no';
  label: string;
  value: string | null;
}

export function buildPolymarketMarketIdentityRows(
  market: PolymarketMarketDetails,
): PolymarketMarketIdentityRow[] {
  return [
    {
      key: 'condition',
      label: 'Condition ID',
      value: market.conditionId,
    },
    {
      key: 'yes',
      label: `${market.outcomes.yes.label} token`,
      value: market.outcomes.yes.tokenId,
    },
    {
      key: 'no',
      label: `${market.outcomes.no.label} token`,
      value: market.outcomes.no.tokenId,
    },
  ];
}
