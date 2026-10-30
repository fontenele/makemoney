import {
  auditDiagnosticLedgerGap,
  DiagnosticLedgerGapInput,
} from './diagnostic-ledger-gap';
import { buildDiagnosticFinancialReport } from './diagnostic-financial-report';
import {
  diagnosticPlan,
  diagnosticBundle,
} from '../../../../test/fixtures/diagnostic-report';
const at = new Date('2026-10-30T18:00:00.000Z');
function input(): DiagnosticLedgerGapInput {
  return {
    initializationId: '00000000-0000-4000-8000-000000000801',
    ledgerBaselineUnchanged: true,
    expectedWalletHash: diagnosticPlan().walletHash,
    observedWalletHash: diagnosticPlan().walletHash,
    ledgerBalances: {
      BNB: '0.00573473587298894',
      USDT: '2.955301453716908917',
      BTCB: '0',
    },
    observedBalances: {
      BNB: '0.005659555780666717',
      USDT: '1.955301453716908917',
      BTCB: '0.000012907690498746',
    },
    observedAt: new Date(at),
    evaluatedAt: new Date(at),
    diagnostic: buildDiagnosticFinancialReport(
      diagnosticPlan(),
      diagnosticBundle(),
    ),
  };
}
describe('Read-only diagnostic ledger gap', () => {
  it('isolates the exact additional BNB outflow without assigning intent or mutating accounting', () => {
    const result = auditDiagnosticLedgerGap(input());
    expect(result).toMatchObject({
      status: 'unattributed_change',
      accountingMutated: false,
      fullHistoryReconciled: false,
      realizedPnlAvailable: false,
      submissionAuthorized: false,
    });
    expect(result.assets).toEqual([
      expect.objectContaining({
        asset: 'BNB',
        unexplainedDelta: '-0.000007173743183697',
      }),
      expect.objectContaining({ asset: 'USDT', unexplainedDelta: '0' }),
      expect.objectContaining({ asset: 'BTCB', unexplainedDelta: '0' }),
    ]);
  });
  it('does not equate a quantity match with complete history or realized profit', () => {
    const p = input();
    p.observedBalances.BNB = '0.005666729523850414';
    expect(auditDiagnosticLedgerGap(p)).toMatchObject({
      status: 'quantities_match',
      fullHistoryReconciled: false,
      realizedPnlAvailable: false,
    });
  });
  it.each([
    'wallet',
    'mutatedLedger',
    'stale',
    'future',
    'tamperedReport',
    'missingAsset',
    'floatingMoney',
    'negativeBalance',
  ])('rejects %s evidence', (fault) => {
    const p = input();
    if (fault === 'wallet') p.observedWalletHash = 'f'.repeat(64);
    if (fault === 'mutatedLedger') p.ledgerBaselineUnchanged = false;
    if (fault === 'stale') p.observedAt = new Date(at.getTime() - 60001);
    if (fault === 'future') p.observedAt = new Date(at.getTime() + 1);
    if (fault === 'tamperedReport') p.diagnostic.assetDeltas.BNB = '0';
    if (fault === 'missingAsset')
      delete (p.observedBalances as Partial<typeof p.observedBalances>).BTCB;
    if (fault === 'floatingMoney')
      (p.observedBalances as unknown as Record<string, unknown>).BNB = 0.01;
    if (fault === 'negativeBalance') p.observedBalances.BNB = '-1';
    expect(() => auditDiagnosticLedgerGap(p)).toThrow();
  });
});
