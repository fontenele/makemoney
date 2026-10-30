import Decimal from 'decimal.js';
import {
  DiagnosticFinancialReport,
  diagnosticReportFingerprint,
} from './diagnostic-financial-report';
const D = Decimal.clone({ precision: 100, toExpNeg: -100, toExpPos: 100 });
const ASSETS = ['BNB', 'USDT', 'BTCB'] as const;
type Balances = Record<(typeof ASSETS)[number], string>;
export interface DiagnosticLedgerGapInput {
  initializationId: string;
  ledgerBaselineUnchanged: boolean;
  expectedWalletHash: string;
  observedWalletHash: string;
  ledgerBalances: Balances;
  observedBalances: Balances;
  observedAt: Date;
  evaluatedAt: Date;
  diagnostic: DiagnosticFinancialReport;
}
/** Audit only. A matching remainder is not complete wallet-history reconciliation. */
export function auditDiagnosticLedgerGap(input: DiagnosticLedgerGapInput) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      input.initializationId,
    ) ||
    input.ledgerBaselineUnchanged !== true ||
    !/^[a-f0-9]{64}$/.test(input.expectedWalletHash) ||
    input.expectedWalletHash !== input.observedWalletHash ||
    !(input.observedAt instanceof Date) ||
    !(input.evaluatedAt instanceof Date) ||
    !Number.isFinite(input.observedAt.getTime()) ||
    !Number.isFinite(input.evaluatedAt.getTime()) ||
    input.observedAt > input.evaluatedAt ||
    input.evaluatedAt.getTime() - input.observedAt.getTime() > 60000 ||
    input.diagnostic.fingerprint !==
      diagnosticReportFingerprint(input.diagnostic) ||
    input.diagnostic.submissionAuthorized !== false ||
    input.diagnostic.globalAccountingMutated !== false
  )
    throw new Error('Invalid or uncorrelated ledger-gap evidence');
  for (const balances of [input.ledgerBalances, input.observedBalances])
    if (
      !balances ||
      Object.keys(balances).sort().join(',') !== [...ASSETS].sort().join(',') ||
      ASSETS.some(
        (asset) =>
          typeof balances[asset] !== 'string' ||
          !/^(?:0|[1-9]\d{0,29})(?:\.\d{1,18})?$/.test(balances[asset]),
      )
    )
      throw new Error('Complete exact three-asset balances required');
  const assets = ASSETS.map((asset) => {
    const delta = input.diagnostic.assetDeltas[asset];
    if (
      typeof delta !== 'string' ||
      !/^-?(?:0|[1-9]\d{0,29})(?:\.\d{1,18})?$/.test(delta)
    )
      throw new Error('Invalid diagnostic delta');
    const expected = new D(input.ledgerBalances[asset]).plus(delta);
    if (expected.lt(0))
      throw new Error('Diagnostic delta exceeds ledger baseline');
    return {
      asset,
      ledgerQuantity: input.ledgerBalances[asset],
      diagnosticDelta: delta,
      expectedAfterDiagnostic: expected.toFixed(),
      observedQuantity: input.observedBalances[asset],
      unexplainedDelta: new D(input.observedBalances[asset])
        .minus(expected)
        .toFixed(),
    };
  });
  return {
    scope: 'diagnostic_ledger_gap_audit' as const,
    status: assets.some((asset) => asset.unexplainedDelta !== '0')
      ? ('unattributed_change' as const)
      : ('quantities_match' as const),
    initializationId: input.initializationId,
    diagnosticFingerprint: input.diagnostic.fingerprint,
    assets,
    observedAt: input.observedAt.toISOString(),
    coverage: 'diagnostic_receipts_only_not_complete_wallet_history' as const,
    fullHistoryReconciled: false as const,
    realizedPnlAvailable: false as const,
    accountingMutated: false as const,
    submissionAuthorized: false as const,
  };
}
