import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FundingConversionStatusContextIdentityError } from '../application/agentic-wallet-funding-conversion-status-context.store';
import { PrismaAgenticWalletFundingConversionStatusContextStore } from './prisma-agentic-wallet-funding-conversion-status-context.store';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';

describe('PrismaAgenticWalletFundingConversionStatusContextStore', () => {
  it('loads exact durable pending lookup context', async () => {
    const harness = createHarness(attempt());

    await expect(harness.store.getByAttemptId(ATTEMPT_ID)).resolves.toEqual({
      attemptId: ATTEMPT_ID,
      attemptState: 'submitted_pending_confirmation',
      statusLookupRequired: true,
      statusContext: {
        attemptId: ATTEMPT_ID,
        providerOrderId: 'order_123',
        sourceQuantityBnb: '0.008',
        maximumSlippagePercent: '0.5',
      },
    });
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { id: ATTEMPT_ID },
    });
  });

  it('returns absence and rejects malformed identity before persistence', async () => {
    const absent = createHarness(null);
    await expect(absent.store.getByAttemptId(ATTEMPT_ID)).resolves.toBeNull();

    await expect(
      absent.store.getByAttemptId('not-an-id'),
    ).rejects.toBeInstanceOf(FundingConversionStatusContextIdentityError);
    expect(absent.findUnique).toHaveBeenCalledTimes(1);
  });

  it.each([
    'provider_finished_pending_financial_reconciliation',
    'provider_failed',
    'submission_outcome_unknown',
  ])('projects terminal %s state without lookup authority', async (state) => {
    const harness = createHarness(
      attempt({
        state,
        providerOrderId:
          state === 'submission_outcome_unknown' ? null : 'order_123',
      }),
    );

    await expect(harness.store.getByAttemptId(ATTEMPT_ID)).resolves.toEqual({
      attemptId: ATTEMPT_ID,
      attemptState: state,
      statusLookupRequired: false,
      statusContext: null,
    });
  });

  it.each([
    ['state', { state: 'submission_claimed' }],
    ['order identity', { providerOrderId: '--unsafe' }],
    ['source quantity', { freshSourceQuantityBnb: '0.0080' }],
    ['slippage', { freshMaximumSlippagePercent: '0' }],
    ['retry authority', { automaticRetryAllowed: true }],
    ['completion', { completedAt: null }],
    ['chronology', { completedAt: new Date('2026-10-22T12:00:29.000Z') }],
  ])('fails closed on invalid persisted %s', async (_label, changed) => {
    const harness = createHarness(attempt(changed));

    await expect(harness.store.getByAttemptId(ATTEMPT_ID)).rejects.toThrow(
      'Persisted funding conversion status context is invalid',
    );
  });
});

function createHarness(row: ReturnType<typeof attempt> | null) {
  const findUnique = jest.fn(() => Promise.resolve(row));
  return {
    findUnique,
    store: new PrismaAgenticWalletFundingConversionStatusContextStore({
      agenticWalletFundingConversionSubmissionAttempt: { findUnique },
    } as unknown as PrismaService),
  };
}

function attempt(changed: Record<string, unknown> = {}) {
  return {
    id: ATTEMPT_ID,
    state: 'submitted_pending_confirmation',
    providerOrderId: 'order_123',
    freshSourceQuantityBnb: '0.008',
    freshMaximumSlippagePercent: '0.5',
    automaticRetryAllowed: false,
    startedAt: new Date('2026-10-22T12:00:30.000Z'),
    completedAt: new Date('2026-10-22T12:00:31.000Z'),
    ...changed,
  };
}
