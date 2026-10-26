import { jest } from '@jest/globals';

import { AgenticWalletMarketSwapAccountingMutationAuthorizationStore } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-authorization.store';
import { ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-authorization';
import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-commitment';
import { AgenticWalletMarketSwapAccountingMutationPlan } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-plan';
import {
  InvalidRealExecutionAccountingMutationAuthorizationRequestError,
  RealExecutionAccountingMutationAuthorizationService,
} from './real-execution-accounting-mutation-authorization.service';

const AUTHORIZATION_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const MUTATION_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ACCOUNTING_EVIDENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const COMPLETION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const AUTHORIZED_AT = new Date('2026-10-26T18:00:13.000Z');

describe('RealExecutionAccountingMutationAuthorizationService', () => {
  it('records explicit authority for the exact durable commitment', async () => {
    const harness = serviceHarness();

    await expect(harness.service.authorize(request())).resolves.toMatchObject({
      scope: 'real_execution_accounting_mutation_authorization',
      status: 'accounting_mutation_authorization_recorded',
      replayed: false,
      providerCallStarted: false,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
      storedAuthorization: {
        authorization: { authorizationId: AUTHORIZATION_ID },
      },
    });
    expect(harness.read).toHaveBeenCalledWith(GATE_ID);
    expect(harness.record).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationId: AUTHORIZATION_ID,
        authorizedAt: AUTHORIZED_AT,
        accountingMutationAuthorized: true,
        accountingMutationComplete: false,
      }),
    );
  });

  it.each([
    null,
    {},
    { ...request(), extra: true },
    { ...request(), authorizationId: 'invalid' },
    { ...request(), planFingerprint: 'A'.repeat(64) },
    { ...request(), acknowledgment: 'reviewed' },
  ])('rejects malformed input before durable access %#', async (input) => {
    const harness = serviceHarness();

    await expect(harness.service.authorize(input)).rejects.toBeInstanceOf(
      InvalidRealExecutionAccountingMutationAuthorizationRequestError,
    );
    expect(harness.read).not.toHaveBeenCalled();
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('blocks request facts that differ from the durable commitment', async () => {
    const harness = serviceHarness();

    await expect(
      harness.service.authorize({
        ...request(),
        transactionHash: `0x${'b'.repeat(64)}`,
      }),
    ).rejects.toThrow(
      'Agentic Wallet accounting mutation authorization is blocked',
    );
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('stops when the durable commitment is absent', async () => {
    const harness = serviceHarness(null);

    await expect(harness.service.authorize(request())).rejects.toThrow(
      'Durable accounting mutation commitment was not found',
    );
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('preserves immutable replay without applying accounting', async () => {
    const harness = serviceHarness(undefined, true);

    await expect(harness.service.authorize(request())).resolves.toMatchObject({
      replayed: true,
      accountingMutationAuthorized: true,
      accountingMutationComplete: false,
    });
  });
});

function serviceHarness(
  stored: ReturnType<typeof storedCommitment> | null = storedCommitment(),
  replayed = false,
) {
  const read = jest
    .fn<() => Promise<typeof stored>>()
    .mockResolvedValue(stored);
  const record = jest.fn((authorization) =>
    Promise.resolve({
      stored: {
        authorization,
        recordedAt: new Date('2026-10-26T18:00:14.000Z'),
      },
      replayed,
    }),
  );
  return {
    read,
    record,
    service: new RealExecutionAccountingMutationAuthorizationService(
      {
        getByGateId: read,
      },
      {
        record,
      } as AgenticWalletMarketSwapAccountingMutationAuthorizationStore,
      () => AUTHORIZED_AT,
    ),
  };
}

function request() {
  return {
    authorizationId: AUTHORIZATION_ID,
    mutationId: MUTATION_ID,
    planFingerprint: storedCommitment().commitment.planFingerprint,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    acknowledgment: ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
  };
}

function storedCommitment() {
  const assessment = prepareAgenticWalletMarketSwapAccountingMutationCommitment(
    plan(),
    MUTATION_ID,
    new Date('2026-10-26T18:00:11.000Z'),
  );
  if (assessment.commitment === null)
    throw new Error('Test commitment is blocked');
  return {
    commitment: assessment.commitment,
    recordedAt: new Date('2026-10-26T18:00:12.000Z'),
  };
}

function plan(): AgenticWalletMarketSwapAccountingMutationPlan {
  return {
    scope: 'agentic_wallet_market_swap_accounting_mutation_plan',
    accountingEvidenceId: ACCOUNTING_EVIDENCE_ID,
    completionEvidenceId: COMPLETION_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    balanceTransitions: [
      {
        assetType: 'native',
        assetSymbol: 'BNB',
        direction: 'debit',
        beforeQuantity: '1',
        afterQuantity: '0.9997',
        deltaQuantity: '0.0003',
      },
      {
        assetType: 'token',
        assetAddress: '0x55d398326f99059ff775485246999027b3197955',
        direction: 'debit',
        beforeQuantity: '100',
        afterQuantity: '94.995',
        deltaQuantity: '5.005',
      },
      {
        assetType: 'token',
        assetAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
        direction: 'credit',
        beforeQuantity: '0',
        afterQuantity: '0.000071',
        deltaQuantity: '0.000071',
      },
    ],
    evidenceObservedAt: new Date('2026-10-26T18:00:09.000Z'),
    evidenceRecordedAt: new Date('2026-10-26T18:00:10.000Z'),
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationAuthorized: false,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}
