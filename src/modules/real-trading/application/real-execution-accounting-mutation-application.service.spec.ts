import { jest } from '@jest/globals';
import { ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-application';
import { AgenticWalletMarketSwapAccountingMutationApplicationStore } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-application.store';
import {
  InvalidRealExecutionAccountingMutationApplicationRequestError,
  RealExecutionAccountingMutationApplicationService,
} from './real-execution-accounting-mutation-application.service';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('RealExecutionAccountingMutationApplicationService', () => {
  it.each([
    null,
    {},
    { ...request(), extra: true },
    { ...request(), balanceCoverageComplete: false },
    { ...request(), balancesObservedAt: '2026-10-26T18:00:15Z' },
  ])('rejects malformed input before durable access %#', async (input) => {
    const harness = serviceHarness();
    await expect(harness.service.apply(input)).rejects.toBeInstanceOf(
      InvalidRealExecutionAccountingMutationApplicationRequestError,
    );
    expect(harness.read).not.toHaveBeenCalled();
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it('stops before mutation when durable authorization is absent', async () => {
    const harness = serviceHarness();
    await expect(harness.service.apply(request())).rejects.toThrow(
      'Durable accounting mutation authorization was not found',
    );
    expect(harness.read).toHaveBeenCalledWith(GATE_ID);
    expect(harness.apply).not.toHaveBeenCalled();
  });
});

function serviceHarness() {
  const read = jest.fn<() => Promise<null>>().mockResolvedValue(null);
  const apply = jest.fn();
  return {
    read,
    apply,
    service: new RealExecutionAccountingMutationApplicationService(
      { getByGateId: read },
      {
        apply,
      } as unknown as AgenticWalletMarketSwapAccountingMutationApplicationStore,
      () => new Date('2026-10-26T18:00:16.000Z'),
    ),
  };
}

function request() {
  return {
    applicationId: '10101010-1010-4010-8010-101010101010',
    authorizationId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    mutationId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    planFingerprint: 'a'.repeat(64),
    gateId: GATE_ID,
    transactionHash: `0x${'b'.repeat(64)}`,
    acknowledgment: ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
    currentBalances: [
      {
        assetType: 'native',
        assetSymbol: 'BNB',
        currentQuantity: '0.00975323',
      },
    ],
    balanceCoverageComplete: true,
    balancesObservedAt: '2026-10-26T18:00:15.000Z',
  };
}
