import {
  cleanupNow,
  cleanupPlan,
  cleanupReceipt,
  cleanupSubmitted,
} from '../../../../test/fixtures/approval-cleanup';
import {
  newApprovalCleanup,
  transitionApprovalCleanup,
  ApprovalCleanupEvent,
} from './approval-cleanup';
describe('Approval cleanup one-attempt lifecycle', () => {
  it('waits for the correlated terminal operation before consuming one attempt', () => {
    const record = newApprovalCleanup(cleanupPlan());
    expect(() =>
      transitionApprovalCleanup(record, { type: 'claim' }, cleanupNow),
    ).toThrow();
    expect(() =>
      transitionApprovalCleanup(
        record,
        {
          type: 'operation_terminal',
          operationId: record.plan.id,
          providerOrderId: '123',
        },
        cleanupNow,
      ),
    ).toThrow();
    const ready = transitionApprovalCleanup(
      record,
      {
        type: 'operation_terminal',
        operationId: record.plan.operationId,
        providerOrderId: '123',
      },
      cleanupNow,
    );
    const claimed = transitionApprovalCleanup(
      ready,
      { type: 'claim' },
      cleanupNow,
    );
    expect(() =>
      transitionApprovalCleanup(claimed, { type: 'claim' }, cleanupNow),
    ).toThrow();
    expect(
      transitionApprovalCleanup(claimed, { type: 'ambiguous' }, cleanupNow)
        .state,
    ).toBe('unknown');
    expect(record.state).toBe('awaiting_operation');
  });
  it('clears only a finalized exact revoke with current zero allowance and accounts gas exactly', () => {
    const result = transitionApprovalCleanup(
      cleanupSubmitted(),
      { type: 'receipt', evidence: cleanupReceipt() },
      cleanupNow,
    );
    expect(result.state).toBe('cleared');
    expect(result.measuredGasWei).toBe('2214193030116');
    expect(result.lastObservation).toMatchObject({
      observedAt: cleanupNow.toISOString(),
      allowanceRaw: '0',
      receiptSucceeded: true,
      blockNumber: '103',
    });
  });
  it.each(['unknown', 'failed', 'cleared'] as const)(
    'never retries %s',
    (state) => {
      const record = { ...cleanupSubmitted(), state };
      for (const event of [
        { type: 'claim' },
        { type: 'ambiguous' },
        { type: 'broadcast', transactionHash: cleanupReceipt().receipt.hash },
      ] as ApprovalCleanupEvent[])
        expect(() =>
          transitionApprovalCleanup(record, event, cleanupNow),
        ).toThrow();
    },
  );
  it.each(['reverted', 'nonzero'])(
    'keeps %s cleanup unresolved and records charged gas',
    (fault) => {
      const e = cleanupReceipt();
      if (fault === 'reverted') e.receipt.succeeded = false;
      else e.allowanceRaw = '1';
      expect(
        transitionApprovalCleanup(
          cleanupSubmitted(),
          { type: 'receipt', evidence: e },
          cleanupNow,
        ),
      ).toMatchObject({ state: 'failed', measuredGasWei: '2214193030116' });
    },
  );
  it.each([
    'chain',
    'sender',
    'token',
    'spender',
    'amount',
    'value',
    'hash',
    'block',
    'canonical',
    'stale',
    'future',
    'gas',
    'price',
  ])('rejects invalid %s evidence', (fault) => {
    const e = cleanupReceipt();
    if (fault === 'chain') (e as unknown as { chainId: string }).chainId = '1';
    if (fault === 'sender') e.receipt.from = '0x' + 'c'.repeat(40);
    if (fault === 'token') e.receipt.to = '0x' + 'c'.repeat(40);
    if (fault === 'spender')
      e.receipt.input = e.receipt.input.replace('b300', 'c300');
    if (fault === 'amount')
      e.receipt.input = e.receipt.input.slice(0, -1) + '1';
    if (fault === 'value') e.receipt.valueWei = '1';
    if (fault === 'hash') e.receipt.hash = '0x' + 'f'.repeat(64);
    if (fault === 'block') e.finalizedBlockNumber = '1';
    if (fault === 'canonical') e.canonicalBlockVerified = false;
    if (fault === 'stale') e.observedAt = new Date(cleanupNow.getTime() - 5001);
    if (fault === 'future') e.observedAt = new Date(cleanupNow.getTime() + 1);
    if (fault === 'gas') e.receipt.gasUsed = '1.5';
    if (fault === 'price') e.receipt.effectiveGasPriceWei = '1'.repeat(31);
    expect(() =>
      transitionApprovalCleanup(
        cleanupSubmitted(),
        { type: 'receipt', evidence: e },
        cleanupNow,
      ),
    ).toThrow();
  });
  it.each(['token', 'spender', 'chainId', 'walletHash', 'operationId'])(
    'rejects scope changes in %s',
    (key) => {
      const plan = cleanupPlan();
      (plan as unknown as Record<string, unknown>)[key] = 'invalid';
      expect(() => newApprovalCleanup(plan)).toThrow();
    },
  );
  it('rejects a tampered plan fingerprint', () => {
    const r = cleanupSubmitted();
    r.fingerprint = 'f'.repeat(64);
    expect(() =>
      transitionApprovalCleanup(
        r,
        {
          type: 'receipt',
          evidence: cleanupReceipt(),
        },
        cleanupNow,
      ),
    ).toThrow();
  });
});
