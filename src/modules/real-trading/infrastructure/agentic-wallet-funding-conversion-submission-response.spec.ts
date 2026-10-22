import { assessAgenticWalletFundingConversionSubmissionResponse } from './agentic-wallet-funding-conversion-submission-response';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';

describe('assessAgenticWalletFundingConversionSubmissionResponse', () => {
  it('treats an order id only as pending terminal confirmation', () => {
    expect(
      assessAgenticWalletFundingConversionSubmissionResponse(ATTEMPT_ID, {
        success: true,
        data: { orderId: 'order_123', status: 'FINISHED' },
      }),
    ).toMatchObject({
      attemptId: ATTEMPT_ID,
      status: 'submitted_pending_confirmation',
      providerOrderId: 'order_123',
      executionSucceeded: false,
      statusLookupRequired: true,
      automaticRetryAllowed: false,
    });
  });

  it.each([
    undefined,
    null,
    { success: false, data: { message: 'rejected' } },
    { success: true, data: {} },
    { success: true, data: { orderId: '--unsafe' } },
  ])(
    'classifies ambiguous response %# as unknown and non-retriable',
    (value) => {
      expect(
        assessAgenticWalletFundingConversionSubmissionResponse(
          ATTEMPT_ID,
          value,
        ),
      ).toMatchObject({
        status: 'submission_outcome_unknown',
        providerOrderId: null,
        executionSucceeded: false,
        statusLookupRequired: true,
        automaticRetryAllowed: false,
      });
    },
  );

  it('fingerprints equivalent object responses deterministically', () => {
    const left = assessAgenticWalletFundingConversionSubmissionResponse(
      ATTEMPT_ID,
      { success: true, data: { orderId: '123', extra: true } },
    );
    const right = assessAgenticWalletFundingConversionSubmissionResponse(
      ATTEMPT_ID,
      { data: { extra: true, orderId: '123' }, success: true },
    );

    expect(left.responseFingerprint).toBe(right.responseFingerprint);
    expect(left.responseFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });
});
