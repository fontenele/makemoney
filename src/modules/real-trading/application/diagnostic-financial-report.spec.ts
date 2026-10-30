import {
  diagnosticBundle,
  diagnosticPlan,
} from '../../../../test/fixtures/diagnostic-report';
import {
  buildDiagnosticFinancialReport,
  diagnosticReportFingerprint,
} from './diagnostic-financial-report';
describe('diagnostic financial receipt report', () => {
  it('reconciles token movements and all three native gas fees without inventing realized profit', () => {
    expect(
      buildDiagnosticFinancialReport(diagnosticPlan(), diagnosticBundle()),
    ).toMatchObject({
      sourceSpentUsdt: '1',
      receivedBtcb: '0.000012907690498746',
      gas: {
        swapBnb: '0.000062548661717332',
        approvalBnb: '0.000003243494391078',
        entryBnb: '0.00006579215610841',
        revocationBnb: '0.000002214193030116',
        totalBnb: '0.000068006349138526',
      },
      indicativeEntryGasUsdt: '0.046073589001158439',
      indicativeTotalGasUsdt: '0.047624166238218373',
      assetDeltas: {
        USDT: '-1',
        BTCB: '0.000012907690498746',
        BNB: '-0.000068006349138526',
      },
      approval: { grantExceededTradeInput: true, clearedAtObservation: true },
      sellGasMeasured: false,
      realizedTradingPnlAvailable: false,
      globalAccountingMutated: false,
      submissionAuthorized: false,
    });
  });
  it.each([
    'failed',
    'future_block',
    'wrong_sender',
    'wrong_chain',
    'wrong_precision',
    'duplicate_hash',
    'approval_gap',
    'wrong_router',
    'revocation_not_zero',
    'extra_token_flow',
    'partial_source_fill',
  ])('rejects unverified or divergent financial evidence %s', (kind) => {
    const bundle = diagnosticBundle();
    if (kind === 'failed') bundle.swap.succeeded = false;
    if (kind === 'future_block') bundle.swap.blockNumber = '111';
    if (kind === 'wrong_sender') bundle.swap.from = '0x' + 'c'.repeat(40);
    if (kind === 'wrong_chain') Object.assign(bundle, { chainId: '1' });
    if (kind === 'wrong_precision') bundle.usdtDecimals = 6;
    if (kind === 'duplicate_hash') bundle.revocation.hash = bundle.swap.hash;
    if (kind === 'approval_gap') bundle.swap.nonce = '3';
    if (kind === 'wrong_router') bundle.swap.to = '0x' + 'c'.repeat(40);
    if (kind === 'revocation_not_zero')
      bundle.revocation.input = bundle.approval.input;
    if (kind === 'extra_token_flow') bundle.approval.logs = bundle.swap.logs;
    if (kind === 'partial_source_fill')
      bundle.swap.logs = bundle.swap.logs.map((log, index) =>
        index === 0
          ? {
              ...log,
              data: '0x' + 500000000000000000n.toString(16).padStart(64, '0'),
            }
          : log,
      );
    expect(() =>
      buildDiagnosticFinancialReport(diagnosticPlan(), bundle),
    ).toThrow();
  });
  it('keeps later allowance observations explicit rather than claiming a permanent zero', () => {
    const bundle = diagnosticBundle();
    bundle.currentAllowanceRaw = '1';
    expect(
      buildDiagnosticFinancialReport(diagnosticPlan(), bundle).approval
        .clearedAtObservation,
    ).toBe(false);
  });
  it('fingerprints financial facts canonically, independent of key order and observation time', () => {
    const report = buildDiagnosticFinancialReport(
      diagnosticPlan(),
      diagnosticBundle(),
    );
    const reversed = Object.fromEntries(Object.entries(report).reverse());
    reversed.observedAt = '2026-10-30T17:00:00.000Z';
    expect(diagnosticReportFingerprint(reversed)).toBe(report.fingerprint);
    expect(
      diagnosticReportFingerprint({ ...report, sourceSpentUsdt: '2' }),
    ).not.toBe(report.fingerprint);
  });
});
