import { dashboardApiPath } from './api';

export interface DiagnosticCostReport {
  observedAt: string;
  sourceSpentUsdt: string;
  receivedBtcb: string;
  gas: {
    swapBnb: string;
    approvalBnb: string;
    entryBnb: string;
    revocationBnb: string;
    totalBnb: string;
  };
  indicativeEntryGasUsdt: string;
  indicativeTotalGasUsdt: string;
  indicativeEntryGasPercentage: string;
  indicativeEntryCostUsdt: string;
  referenceBnbUsdt: string;
  approval: { clearedAtObservation: boolean; grantExceededTradeInput: boolean };
}
export interface DiagnosticCostStatus {
  status: 'available' | 'unavailable';
  report: DiagnosticCostReport | null;
}
const money = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^(?:0|[1-9]\d{0,29})(?:\.\d{1,18})?$/.test(value);
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
export async function loadDiagnosticFinancialReport(
  request: typeof fetch = fetch,
): Promise<DiagnosticCostStatus | null> {
  try {
    const response = await request(
      dashboardApiPath('/real-trading/gas-diagnostic-report'),
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (
      !record(data) ||
      data.scope !== 'diagnostic_financial_report' ||
      data.providerAccessPerformed !== false ||
      data.submissionAuthorized !== false
    )
      return null;
    if (data.status === 'unavailable')
      return data.report === null
        ? { status: 'unavailable', report: null }
        : null;
    const r = data.report;
    if (
      data.status !== 'available' ||
      !record(r) ||
      r.version !== 'diagnostic_financial_report_v1' ||
      r.chainId !== '56' ||
      r.sampleCount !== 1 ||
      r.conversionBasis !==
        'preparation_price_not_historical_execution_price' ||
      !record(r.gas) ||
      !record(r.approval) ||
      !record(r.transactions)
    )
      return null;
    if (
      [
        'sellGasMeasured',
        'futureGasCostGuaranteed',
        'realizedTradingPnlAvailable',
        'globalAccountingMutated',
        'unrelatedTransactionsIncluded',
        'submissionAuthorized',
      ].some((key) => r[key] !== false)
    )
      return null;
    if (
      typeof r.observedAt !== 'string' ||
      r.observedAt.length !== 24 ||
      new Date(r.observedAt).toISOString() !== r.observedAt ||
      typeof r.fingerprint !== 'string' ||
      !/^[a-f0-9]{64}$/.test(r.fingerprint)
    )
      return null;
    if (
      [
        'sourceSpentUsdt',
        'receivedBtcb',
        'indicativeEntryGasUsdt',
        'indicativeTotalGasUsdt',
        'indicativeEntryGasPercentage',
        'indicativeEntryCostUsdt',
        'referenceBnbUsdt',
      ].some((key) => !money(r[key])) ||
      r.sourceSpentUsdt !== '1'
    )
      return null;
    if (
      ['swapBnb', 'approvalBnb', 'entryBnb', 'revocationBnb', 'totalBnb'].some(
        (key) => !money((r.gas as Record<string, unknown>)[key]),
      )
    )
      return null;
    if (
      ['swap', 'approval', 'revocation'].some(
        (key) =>
          typeof (r.transactions as Record<string, unknown>)[key] !==
            'string' ||
          !/^0x[a-f0-9]{64}$/.test(
            String((r.transactions as Record<string, unknown>)[key]),
          ),
      )
    )
      return null;
    if (
      r.approval.observationBasis !==
        'latest_public_call_not_finalized_state' ||
      typeof r.approval.clearedAtObservation !== 'boolean' ||
      typeof r.approval.grantExceededTradeInput !== 'boolean'
    )
      return null;
    return {
      status: 'available',
      report: r as unknown as DiagnosticCostReport,
    };
  } catch {
    return null;
  }
}
