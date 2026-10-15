import {
  AgenticWalletMarketSwapAccountingBalanceEvidence,
  AgenticWalletMarketSwapBalanceChange,
  assessAgenticWalletMarketSwapAccountingBalanceEvidence,
} from './agentic-wallet-market-swap-accounting-balance-evidence';
import { AgenticWalletMarketSwapFinancialReconciliationCompletion } from './agentic-wallet-market-swap-financial-reconciliation-completion';

const EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const FEE_TOKEN = '0x1111111111111111111111111111111111111111';

describe('assessAgenticWalletMarketSwapAccountingBalanceEvidence', () => {
  it('produces persistence-ready evidence from complete exact balance deltas', () => {
    const input = balanceEvidence();
    const assessment = assessAgenticWalletMarketSwapAccountingBalanceEvidence(
      completion(),
      input,
    );

    expect(assessment).toMatchObject({
      status: 'accounting_evidence_ready_for_persistence',
      blockers: [],
      persistenceRequired: true,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    });
    expect(assessment.evidence).toEqual({
      ...input,
      balanceChanges: [networkChange(), sourceChange(), targetChange()],
    });
  });

  it('defensively copies and deterministically orders balance evidence', () => {
    const input = balanceEvidence();
    const assessment = assessAgenticWalletMarketSwapAccountingBalanceEvidence(
      completion(),
      input,
    );

    expect(assessment.evidence).not.toBe(input);
    expect(assessment.evidence!.balanceChanges).not.toBe(input.balanceChanges);
    expect(assessment.evidence!.balanceChanges[0]).not.toBe(
      input.balanceChanges[2],
    );
    expect(assessment.evidence!.observedAt).not.toBe(input.observedAt);
  });

  it.each([
    { completionEvidenceId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' },
    { gateId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' },
    { transactionHash: `0x${'b'.repeat(64)}` },
  ])('blocks divergent durable identity %#', (override) => {
    expect(
      assessAgenticWalletMarketSwapAccountingBalanceEvidence(
        completion(),
        balanceEvidence(override),
      ).blockers,
    ).toContain('accounting_evidence_identity_mismatch');
  });

  it('blocks evidence observed before durable completion recording', () => {
    expect(
      assessAgenticWalletMarketSwapAccountingBalanceEvidence(
        completion(),
        balanceEvidence({
          observedAt: new Date('2026-10-03T12:00:07.999Z'),
        }),
      ).blockers,
    ).toContain('accounting_evidence_predates_completion');
  });

  it.each([
    {
      label: 'missing',
      changes: balanceChanges().filter(
        (entry) => entry.assetType !== 'token' || entry.assetAddress !== USDT,
      ),
    },
    {
      label: 'insufficient',
      changes: balanceChanges({
        source: sourceChange({
          beforeQuantity: '100',
          afterQuantity: '95.001',
          deltaQuantity: '4.999',
        }),
      }),
    },
    {
      label: 'wrong-direction',
      changes: balanceChanges({
        source: sourceChange({
          direction: 'credit',
          beforeQuantity: '94.995',
          afterQuantity: '100',
        }),
      }),
    },
  ])('blocks a $label source debit', ({ changes }) => {
    expect(
      assessAgenticWalletMarketSwapAccountingBalanceEvidence(
        completion(),
        balanceEvidence({ balanceChanges: changes }),
      ).blockers,
    ).toContain('source_balance_delta_missing_or_insufficient');
  });

  it('requires a source-token debit to cover the submitted quantity and source-denominated provider fee', () => {
    const assessment = assessAgenticWalletMarketSwapAccountingBalanceEvidence(
      completion(),
      balanceEvidence({
        balanceChanges: balanceChanges({
          source: sourceChange({
            beforeQuantity: '100',
            afterQuantity: '95',
            deltaQuantity: '5',
          }),
        }),
      }),
    );

    expect(assessment.blockers).toContain(
      'source_balance_delta_missing_or_insufficient',
    );
  });

  it.each([
    {
      changes: balanceChanges().filter(
        (entry) => entry.assetType !== 'token' || entry.assetAddress !== BTCB,
      ),
    },
    {
      changes: balanceChanges({
        target: targetChange({
          afterQuantity: '0.00007',
          deltaQuantity: '0.00007',
        }),
      }),
    },
    {
      changes: balanceChanges({
        target: targetChange({
          direction: 'debit',
          beforeQuantity: '0.000071',
          afterQuantity: '0',
        }),
      }),
    },
  ])('blocks missing or divergent target receipt %#', ({ changes }) => {
    expect(
      assessAgenticWalletMarketSwapAccountingBalanceEvidence(
        completion(),
        balanceEvidence({ balanceChanges: changes }),
      ).blockers,
    ).toContain('target_balance_delta_mismatch');
  });

  it.each([
    {
      changes: balanceChanges().filter((entry) => entry.assetType !== 'native'),
    },
    {
      changes: balanceChanges({
        network: networkChange({
          beforeQuantity: '1',
          afterQuantity: '0.9998',
          deltaQuantity: '0.0002',
        }),
      }),
    },
    {
      changes: balanceChanges({
        network: networkChange({
          direction: 'credit',
          beforeQuantity: '0.9997',
          afterQuantity: '1',
        }),
      }),
    },
  ])(
    'blocks missing or insufficient native network-fee debit %#',
    ({ changes }) => {
      expect(
        assessAgenticWalletMarketSwapAccountingBalanceEvidence(
          completion(),
          balanceEvidence({ balanceChanges: changes }),
        ).blockers,
      ).toContain('network_fee_balance_delta_missing_or_insufficient');
    },
  );

  it('requires a sufficient debit for a positive third-token provider fee', () => {
    const withThirdFee = completion({
      providerFeeComponents: [
        { assetAddress: USDT, quantity: '0.005' },
        { assetAddress: FEE_TOKEN, quantity: '0.2' },
      ],
    });
    expect(
      assessAgenticWalletMarketSwapAccountingBalanceEvidence(
        withThirdFee,
        balanceEvidence(),
      ).blockers,
    ).toContain('provider_fee_balance_delta_missing_or_insufficient');

    const covered = balanceEvidence({
      balanceChanges: [
        ...balanceChanges(),
        tokenDebit(FEE_TOKEN, '10', '9.8', '0.2'),
      ],
    });
    expect(
      assessAgenticWalletMarketSwapAccountingBalanceEvidence(
        withThirdFee,
        covered,
      ).status,
    ).toBe('accounting_evidence_ready_for_persistence');
  });

  it.each([
    { coverageComplete: false as true },
    { observedAt: new Date(Number.NaN) },
    { balanceChanges: [] },
    {
      balanceChanges: [...balanceChanges(), sourceChange()],
    },
    {
      balanceChanges: balanceChanges({
        source: sourceChange({ afterQuantity: '94.996' }),
      }),
    },
    {
      balanceChanges: balanceChanges({
        source: sourceChange({ deltaQuantity: '5.0050' }),
      }),
    },
  ])('blocks malformed or incomplete balance evidence %#', (override) => {
    expect(
      assessAgenticWalletMarketSwapAccountingBalanceEvidence(
        completion(),
        balanceEvidence(override),
      ).blockers,
    ).toContain('invalid_accounting_balance_evidence');
  });

  it.each([
    { accountingMutationComplete: true as false },
    { actualReceivedQuantity: '0' },
    {
      providerFeeComponents: [{ assetAddress: USDT, quantity: '-0.1' }],
    },
    { evidenceRecordedAt: new Date(Number.NaN) },
  ])('blocks an invalid completion snapshot %#', (override) => {
    const assessment = assessAgenticWalletMarketSwapAccountingBalanceEvidence(
      completion(override),
      balanceEvidence(),
    );

    expect(assessment.blockers).toContain(
      'invalid_financial_reconciliation_completion',
    );
    expect(assessment.financialReconciliationComplete).toBe(false);
    expect(assessment.accountingMutationRequired).toBe(false);
  });

  it('retains completed reconciliation while valid balance evidence is blocked', () => {
    const assessment = assessAgenticWalletMarketSwapAccountingBalanceEvidence(
      completion(),
      balanceEvidence({ balanceChanges: [] }),
    );

    expect(assessment).toMatchObject({
      status: 'blocked',
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    });
  });
});

function completion(
  overrides: Partial<AgenticWalletMarketSwapFinancialReconciliationCompletion> = {},
): AgenticWalletMarketSwapFinancialReconciliationCompletion {
  return {
    scope: 'agentic_wallet_market_swap_financial_reconciliation_completion',
    evidenceId: EVIDENCE_ID,
    providerId: 'agentic_wallet',
    chainId: '56',
    gateId: GATE_ID,
    providerOrderId: '1234567890',
    statusObservationId: OBSERVATION_ID,
    transactionHash: TRANSACTION_HASH,
    sourceTokenAddress: USDT,
    targetTokenAddress: BTCB,
    submittedSourceQuantity: '5',
    actualReceivedQuantity: '0.000071',
    providerFeeComponents: [{ assetAddress: USDT, quantity: '0.005' }],
    networkFeeAsset: 'BNB',
    networkFeeQuantity: '0.0003',
    evidenceObservedAt: new Date('2026-10-03T12:00:07.000Z'),
    evidenceRecordedAt: new Date('2026-10-03T12:00:08.000Z'),
    financialReconciliationRequired: true,
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
    ...overrides,
  };
}

function balanceEvidence(
  overrides: Partial<AgenticWalletMarketSwapAccountingBalanceEvidence> = {},
): AgenticWalletMarketSwapAccountingBalanceEvidence {
  return {
    scope: 'agentic_wallet_market_swap_accounting_balance_evidence',
    completionEvidenceId: EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    balanceChanges: balanceChanges(),
    coverageComplete: true,
    observedAt: new Date('2026-10-03T12:00:09.000Z'),
    ...overrides,
  };
}

function balanceChanges(
  overrides: {
    source?: AgenticWalletMarketSwapBalanceChange;
    target?: AgenticWalletMarketSwapBalanceChange;
    network?: AgenticWalletMarketSwapBalanceChange;
  } = {},
): AgenticWalletMarketSwapBalanceChange[] {
  return [
    overrides.source ?? sourceChange(),
    overrides.target ?? targetChange(),
    overrides.network ?? networkChange(),
  ];
}

function sourceChange(
  overrides: Partial<AgenticWalletMarketSwapBalanceChange> = {},
): AgenticWalletMarketSwapBalanceChange {
  return tokenDebit(USDT, '100', '94.995', '5.005', overrides);
}

function targetChange(
  overrides: Partial<AgenticWalletMarketSwapBalanceChange> = {},
): AgenticWalletMarketSwapBalanceChange {
  return {
    assetType: 'token',
    assetAddress: BTCB,
    direction: 'credit',
    beforeQuantity: '0',
    afterQuantity: '0.000071',
    deltaQuantity: '0.000071',
    ...overrides,
  } as AgenticWalletMarketSwapBalanceChange;
}

function networkChange(
  overrides: Partial<AgenticWalletMarketSwapBalanceChange> = {},
): AgenticWalletMarketSwapBalanceChange {
  return {
    assetType: 'native',
    assetSymbol: 'BNB',
    direction: 'debit',
    beforeQuantity: '1',
    afterQuantity: '0.9997',
    deltaQuantity: '0.0003',
    ...overrides,
  } as AgenticWalletMarketSwapBalanceChange;
}

function tokenDebit(
  assetAddress: string,
  beforeQuantity: string,
  afterQuantity: string,
  deltaQuantity: string,
  overrides: Partial<AgenticWalletMarketSwapBalanceChange> = {},
): AgenticWalletMarketSwapBalanceChange {
  return {
    assetType: 'token',
    assetAddress,
    direction: 'debit',
    beforeQuantity,
    afterQuantity,
    deltaQuantity,
    ...overrides,
  } as AgenticWalletMarketSwapBalanceChange;
}
