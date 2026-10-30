import {
  assessGasDiagnosticRisk,
  GasDiagnosticRiskInput,
} from './gas-diagnostic-risk';
const facts = (): GasDiagnosticRiskInput => ({
  sourceUsdt: '1',
  availableUsdt: '3',
  availableBnb: '0.005',
  bnbUsdt: '700',
  walletValueUsdt: '6.5',
  maximumOrderUsdt: '1',
  maximumDailySpendUsdt: '2',
  networkBudgetUsdt: '0.5',
  maximumBankrollUsdt: '12',
  maximumDailyLossUsdt: '10',
  quotaUsedUsd: '0',
  quotaRemainingUsd: '10',
  emergencyStop: false,
  restrictiveWallet: true,
});
describe('gas diagnostic Risk Engine policy', () => {
  it('charges all available BNB to a conservative loss envelope instead of pretending gas is zero', () => {
    expect(assessGasDiagnosticRisk(facts())).toEqual({
      decision: 'approved',
      blockers: [],
      maximumPotentialLossUsdt: '4.5',
    });
  });
  it.each([
    { networkBudgetUsdt: '0' },
    { networkBudgetUsdt: '1.1' },
    { sourceUsdt: '2' },
    { emergencyStop: true },
    { restrictiveWallet: false },
    { availableUsdt: '0.9' },
    { availableBnb: '0' },
    { walletValueUsdt: '13' },
    { quotaUsedUsd: '0.1' },
    { quotaRemainingUsd: '0' },
    { maximumDailyLossUsdt: '4' },
    { maximumOrderUsdt: '0.9' },
    { bnbUsdt: 'NaN' },
  ])('blocks unsafe diagnostic evidence %j', (override) => {
    expect(assessGasDiagnosticRisk({ ...facts(), ...override }).decision).toBe(
      'rejected',
    );
  });
});
