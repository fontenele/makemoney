import {
  assessEstimatedNetProfit,
  EstimatedNetProfitInput,
} from './estimated-net-profit';
const input = (): EstimatedNetProfitInput => ({
  investmentUsdt: '100',
  expectedExitProceedsUsdt: '101',
  entryTradingFeeUsdt: '0.15',
  exitTradingFeeUsdt: '0.15',
  entryGasEstimateUsdt: '0.1',
  exitGasEstimateUsdt: '0.1',
  gasSafetyMultiplier: '1.5',
  observedAt: new Date('2026-10-30T12:00:00Z'),
  evaluatedAt: new Date('2026-10-30T12:00:01Z'),
});
describe('estimated net profitability', () => {
  it('deducts both gas legs, safety margin and trading fees using exact decimals', () => {
    expect(assessEstimatedNetProfit(input())).toMatchObject({
      status: 'positive_expected_net_profit',
      bufferedGasUsdt: '0.3',
      gasPercentageOfInvestment: '0.3',
      expectedNetProfitUsdt: '0.4',
      expectedNetReturnPercentage: '0.4',
      submissionAuthorized: false,
      riskApproved: false,
      guaranteedGasCeiling: false,
    });
  });
  it.each(['100.6', '100.5'])(
    'blocks break-even or losing expected proceeds %s',
    (proceeds) => {
      expect(
        assessEstimatedNetProfit({
          ...input(),
          expectedExitProceedsUsdt: proceeds,
        }),
      ).toMatchObject({
        status: 'blocked',
        reason: 'non_positive_expected_net_profit',
      });
    },
  );
  it.each(['0', '-1', 'NaN', '1e-3', ''])(
    'rejects missing, zero or malformed gas %s',
    (gas) => {
      expect(
        assessEstimatedNetProfit({ ...input(), exitGasEstimateUsdt: gas })
          .status,
      ).toBe('blocked');
    },
  );
  it.each(['0', '1', '10.1'])(
    'requires a bounded safety margin %s',
    (multiplier) => {
      expect(
        assessEstimatedNetProfit({
          ...input(),
          gasSafetyMultiplier: multiplier,
        }).status,
      ).toBe('blocked');
    },
  );
  it.each([-1, 5001, NaN])(
    'blocks future, stale or invalid evidence %s',
    (age) => {
      const value = input();
      value.evaluatedAt = new Date(value.observedAt.getTime() + age);
      expect(assessEstimatedNetProfit(value).status).toBe('blocked');
    },
  );
  it('rounds tiny gas upward before the profitability comparison', () => {
    expect(
      assessEstimatedNetProfit({
        ...input(),
        entryGasEstimateUsdt: '0.000000000000000001',
        exitGasEstimateUsdt: '0.000000000000000001',
        gasSafetyMultiplier: '1.1',
        expectedExitProceedsUsdt: '100.300000000000000003',
      }),
    ).toMatchObject({
      bufferedGasUsdt: '0.000000000000000003',
      expectedNetProfitUsdt: '0',
      status: 'blocked',
    });
  });
  it('rejects invalid investment instead of dividing by zero', () => {
    expect(
      assessEstimatedNetProfit({ ...input(), investmentUsdt: '0' }).status,
    ).toBe('blocked');
  });
});
