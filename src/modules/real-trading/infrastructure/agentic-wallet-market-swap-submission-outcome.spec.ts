import { assessAgenticWalletMarketSwapSubmissionOutcome } from './agentic-wallet-market-swap-submission-outcome';

const ATTEMPT_ID = '00000000-0000-4000-8000-000000000151';
const GATE_ID = '00000000-0000-4000-8000-000000000034';

describe('Agentic Wallet market-swap submission outcome', () => {
  it('classifies a safe provider order identity as pending confirmation', () => {
    expect(
      assessAgenticWalletMarketSwapSubmissionOutcome(ATTEMPT_ID, GATE_ID, {
        success: true,
        data: { orderId: 'order-151' },
      }),
    ).toMatchObject({
      attemptId: ATTEMPT_ID,
      gateId: GATE_ID,
      status: 'submitted_pending_confirmation',
      providerOrderId: 'order-151',
      blockers: [],
      executionSucceeded: false,
      reconciliationRequired: true,
      automaticRetryAllowed: false,
    });
  });

  it.each([
    [undefined, 'invalid_response_envelope'],
    [{ success: false, data: null }, 'provider_reported_failure'],
    [{ success: true, data: {} }, 'invalid_provider_order_id'],
  ])('classifies ambiguous response %# as unknown', (response, blocker) => {
    expect(
      assessAgenticWalletMarketSwapSubmissionOutcome(
        ATTEMPT_ID,
        GATE_ID,
        response,
      ),
    ).toMatchObject({
      status: 'submission_outcome_unknown',
      providerOrderId: null,
      blockers: [blocker],
      automaticRetryAllowed: false,
    });
  });

  it('fingerprints object responses independently of property order', () => {
    const first = assessAgenticWalletMarketSwapSubmissionOutcome(
      ATTEMPT_ID,
      GATE_ID,
      { success: true, data: { orderId: 'order-151', ignored: 1 } },
    );
    const second = assessAgenticWalletMarketSwapSubmissionOutcome(
      ATTEMPT_ID,
      GATE_ID,
      { data: { ignored: 1, orderId: 'order-151' }, success: true },
    );
    expect(first.responseFingerprint).toBe(second.responseFingerprint);
  });
});
