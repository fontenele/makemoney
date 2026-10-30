import {
  APPROVAL_LIFECYCLE_GAS_COMPONENTS,
  ApprovalLifecycleProfitInput,
  assessApprovalLifecycleProfit,
} from './approval-lifecycle-profit';
const now = new Date('2026-10-30T18:00:00.000Z');
function input(): ApprovalLifecycleProfitInput {
  return {
    investmentUsdt: '1',
    expectedExitProceedsUsdt: '1.3',
    entryTradingFeeUsdt: '0.01',
    exitTradingFeeUsdt: '0.01',
    gasSafetyMultiplier: '1.5',
    tradingFeeEvidenceComplete: true,
    evaluatedAt: new Date(now),
    gas: Object.fromEntries(
      APPROVAL_LIFECYCLE_GAS_COMPONENTS.map((name) => [
        name,
        {
          amountUsdt: '0.01',
          observedAt: new Date(now),
          evidenceBasis: 'fresh_estimate',
        },
      ]),
    ) as ApprovalLifecycleProfitInput['gas'],
  };
}
describe('Complete approval lifecycle profitability', () => {
  it('includes all six gas components and margin with exact net profit', () => {
    expect(assessApprovalLifecycleProfit(input())).toMatchObject({
      status: 'positive_expected_net_profit',
      unbufferedLifecycleGasUsdt: '0.06',
      bufferedGasUsdt: '0.09',
      entryGasEstimateUsdt: '0.03',
      exitGasEstimateUsdt: '0.03',
      expectedNetProfitUsdt: '0.19',
      submissionAuthorized: false,
      riskApproved: false,
      historicalGasGuarantee: false,
    });
  });
  it('blocks the apparently profitable trade after adding both revocations', () => {
    const p = input();
    p.expectedExitProceedsUsdt = '1.1';
    expect(assessApprovalLifecycleProfit(p)).toMatchObject({
      status: 'blocked',
      expectedNetProfitUsdt: '-0.01',
      reason: 'non_positive_expected_net_profit',
    });
  });
  it.each(APPROVAL_LIFECYCLE_GAS_COMPONENTS)(
    'blocks a missing or zero %s estimate',
    (name) => {
      const p = input();
      delete (p.gas as Partial<typeof p.gas>)[name];
      expect(assessApprovalLifecycleProfit(p).status).toBe('blocked');
      const q = input();
      q.gas[name].amountUsdt = '0';
      expect(assessApprovalLifecycleProfit(q).status).toBe('blocked');
    },
  );
  it.each(APPROVAL_LIFECYCLE_GAS_COMPONENTS)(
    'rejects stale and historical %s substitutions',
    (name) => {
      const p = input();
      p.gas[name].observedAt = new Date(now.getTime() - 5001);
      expect(assessApprovalLifecycleProfit(p).status).toBe('blocked');
      const q = input();
      (q.gas[name] as { evidenceBasis: string }).evidenceBasis =
        'measured_historical_receipt';
      expect(assessApprovalLifecycleProfit(q).status).toBe('blocked');
    },
  );
  it('does not infer zero trading fees from absent evidence', () => {
    const p = input();
    p.tradingFeeEvidenceComplete = false;
    p.entryTradingFeeUsdt = '0';
    p.exitTradingFeeUsdt = '0';
    expect(assessApprovalLifecycleProfit(p)).toMatchObject({
      reason: 'complete_trading_fee_evidence_required',
    });
  });
  it('preserves a one-wei-scale cost through all components and upward rounding', () => {
    const p = input();
    for (const name of APPROVAL_LIFECYCLE_GAS_COMPONENTS)
      p.gas[name].amountUsdt = '0.000000000000000001';
    p.gasSafetyMultiplier = '1.01';
    expect(assessApprovalLifecycleProfit(p)).toMatchObject({
      unbufferedLifecycleGasUsdt: '0.000000000000000006',
      bufferedGasUsdt: '0.000000000000000007',
    });
  });
});
