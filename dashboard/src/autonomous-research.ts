import Decimal from 'decimal.js';
import { dashboardApiPath } from './api';

export interface AutonomousResearch {
  status: 'research_only' | 'unavailable' | 'warming_up_or_stale';
  observedAt: string | null;
  evidence: {
    candleCount: number;
    closedTradeCount: number;
    latestAction: 'buy' | 'sell' | 'hold';
    grossMeanReturnRate: string | null;
    grossLowerQuartileReturnRate: string | null;
    endedAt: string | null;
  } | null;
}

export async function loadAutonomousResearch(
  request: typeof fetch = fetch,
): Promise<AutonomousResearch | null> {
  try {
    const response = await request(
      dashboardApiPath('/real-trading/autonomous-research'),
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (
      !isRecord(data) ||
      data.scope !== 'autonomous_strategy_research' ||
      !['research_only', 'unavailable', 'warming_up_or_stale'].includes(
        String(data.status),
      ) ||
      data.walletAccessPerformed !== false ||
      data.submissionAuthorized !== false ||
      !validDate(data.observedAt)
    )
      return null;
    const evidence = data.evidence;
    if (evidence !== null) {
      if (
        !isRecord(evidence) ||
        evidence.symbol !== 'BTC/USDT' ||
        evidence.expectedProfitVerified !== false ||
        evidence.btcbExecutionEdgeVerified !== false ||
        evidence.submissionAuthorized !== false ||
        !Number.isInteger(evidence.candleCount) ||
        Number(evidence.candleCount) < 0 ||
        Number(evidence.candleCount) > 1000 ||
        !Number.isInteger(evidence.closedTradeCount) ||
        Number(evidence.closedTradeCount) < 0 ||
        Number(evidence.closedTradeCount) > 500 ||
        !['buy', 'sell', 'hold'].includes(String(evidence.latestAction)) ||
        !validRate(evidence.grossMeanReturnRate) ||
        !validRate(evidence.grossLowerQuartileReturnRate) ||
        !validDate(evidence.endedAt)
      )
        return null;
    }
    return data as unknown as AutonomousResearch;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function validDate(value: unknown) {
  return (
    value === null ||
    (typeof value === 'string' &&
      value.length === 24 &&
      new Date(value).toISOString() === value)
  );
}
function validRate(value: unknown) {
  return (
    value === null ||
    (typeof value === 'string' &&
      /^-?(?:0|[1-9]\d{0,29})(?:\.\d{1,18})?$/.test(value))
  );
}
export function researchPercentage(rate: string | null) {
  return rate === null
    ? 'Unavailable'
    : new Decimal(rate).times(100).toFixed(4) + '%';
}
