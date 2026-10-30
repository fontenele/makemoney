import { DiagnosticLedgerGapInput } from './diagnostic-ledger-gap';
import {
  RecognizedAgentIdEvidence,
  reconcileRecognizedAgentId,
} from './recognized-agent-id-expense';
import { buildDiagnosticFinancialReport } from './diagnostic-financial-report';
import {
  diagnosticBundle,
  diagnosticPlan,
} from '../../../../test/fixtures/diagnostic-report';
const now = new Date('2026-10-30T18:00:00.000Z');
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
    observedAt: new Date(now),
    evaluatedAt: new Date(now),
    diagnostic: buildDiagnosticFinancialReport(
      diagnosticPlan(),
      diagnosticBundle(),
    ),
  };
}
function evidence(): RecognizedAgentIdEvidence {
  const r = diagnosticBundle().revocation;
  const word = (n: number) => n.toString(16).padStart(64, '0');
  r.hash = '0x' + '9'.repeat(64);
  r.to = '0x60b9262456de011f7d15a54cdd8c48baaa8b022f';
  r.gasUsed = '105379';
  r.effectiveGasPriceWei = '68075643';
  r.input =
    '0x8580974c' +
    word(96) +
    word(0) +
    word(160) +
    word(8) +
    Buffer.from('makemake').toString('hex').padEnd(64, '0') +
    word(0);
  r.logs = [
    {
      address: r.to,
      topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
        '0x' + '0'.repeat(64),
        '0x' + r.from.slice(2).padStart(64, '0'),
        '0x' + word(1),
      ],
      data: '0x',
    },
  ];
  return {
    chainId: '56',
    receipt: r,
    canonicalBlockVerified: true,
    finalizedBlockNumber: '110',
    operatorConfirmedBinanceRegistration: true,
    registeredName: 'makemake.ai',
  };
}
describe('Recognized Agent ID expense reconciliation', () => {
  it('explains the entire remaining BNB gap with exact gas, keeping identity separate from trading', () => {
    const result = reconcileRecognizedAgentId(input(), evidence());
    expect(result).toMatchObject({
      status: 'scoped_quantities_match',
      registeredName: 'makemake.ai',
      expenseCategory: 'wallet_identity_registration',
      identityGasBnb: '0.000007173743183697',
      totalKnownGasBnb: '0.000075180092322223',
      nftMarketValue: null,
      accountingMutated: false,
      fullHistoryReconciled: false,
      realizedTradingPnlAvailable: false,
      submissionAuthorized: false,
    });
    expect(
      result.assets.every((row) => row.remainingUnexplainedDelta === '0'),
    ).toBe(true);
  });
  it('keeps a real residual difference instead of forcing agreement', () => {
    const p = input();
    p.observedBalances.BNB = '0.005';
    expect(reconcileRecognizedAgentId(p, evidence()).status).toBe(
      'residual_change',
    );
  });
  it.each([
    'confirmation',
    'name',
    'contract',
    'wallet',
    'nativeValue',
    'mint',
    'recipient',
    'failed',
    'finality',
    'canonical',
    'duplicate',
    'calldata',
    'gas',
  ])('rejects invalid %s evidence', (fault) => {
    const e = evidence();
    const p = input();
    if (fault === 'confirmation')
      e.operatorConfirmedBinanceRegistration = false;
    if (fault === 'name') e.registeredName = 'different.ai';
    if (fault === 'contract') e.receipt.to = '0x' + 'c'.repeat(40);
    if (fault === 'wallet') e.receipt.from = '0x' + 'c'.repeat(40);
    if (fault === 'nativeValue') e.receipt.valueWei = '1';
    if (fault === 'mint') e.receipt.logs = [];
    if (fault === 'recipient')
      e.receipt.logs = [
        {
          ...e.receipt.logs[0],
          topics: [
            e.receipt.logs[0].topics[0],
            e.receipt.logs[0].topics[1],
            '0x' + 'c'.repeat(64),
            e.receipt.logs[0].topics[3],
          ],
        },
      ];
    if (fault === 'failed') e.receipt.succeeded = false;
    if (fault === 'finality') e.finalizedBlockNumber = '1';
    if (fault === 'canonical') e.canonicalBlockVerified = false;
    if (fault === 'duplicate') e.receipt.hash = p.diagnostic.transactions.swap;
    if (fault === 'calldata') e.receipt.input = '0x8580974c' + 'f'.repeat(192);
    if (fault === 'gas') e.receipt.gasUsed = '1.5';
    expect(() => reconcileRecognizedAgentId(p, e)).toThrow();
  });
});
