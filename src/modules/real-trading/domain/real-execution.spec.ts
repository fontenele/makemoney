import {
  RealExecutionCapabilitySnapshot,
  RealExecutionIntent,
  RealExecutionQuote,
  RealExecutionResult,
  validateRealExecutionCapabilitySnapshot,
  validateRealExecutionIntent,
  validateRealExecutionQuote,
  validateRealExecutionResult,
} from './real-execution';

describe('real execution contracts', () => {
  describe('intent', () => {
    it('accepts an exact provider-neutral market-swap intent', () => {
      expect(() => validateRealExecutionIntent(intent())).not.toThrow();
    });

    it.each([
      [{ id: 'not-a-uuid' }, 'intent id must be a canonical UUID'],
      [
        { idempotencyKey: 'contains space' },
        'idempotency key must be canonical',
      ],
      [{ chainId: 'bad chain' }, 'chain id must be canonical'],
      [{ sourceQuantity: '0' }, 'source quantity must be positive'],
      [
        { maxSlippageRate: '1.0001' },
        'maximum slippage rate must not exceed one',
      ],
    ])('rejects invalid intent field %#', (overrides, reason) => {
      expect(() =>
        validateRealExecutionIntent({ ...intent(), ...overrides }),
      ).toThrow(reason);
    });

    it('rejects equal exact token identities', () => {
      const value = intent();

      expect(() =>
        validateRealExecutionIntent({
          ...value,
          targetAsset: value.sourceAsset,
        }),
      ).toThrow('assets must be distinct');
    });

    it.each(['1e-3', '.01', '01', '-0.1', 'NaN'])(
      'rejects non-canonical slippage %s',
      (maxSlippageRate) => {
        expect(() =>
          validateRealExecutionIntent({ ...intent(), maxSlippageRate }),
        ).toThrow('maximum slippage rate must be non-negative');
      },
    );
  });

  describe('quote', () => {
    it('accepts a bounded non-executable quote bound to its complete intent', () => {
      expect(() => validateRealExecutionQuote(quote())).not.toThrow();
    });

    it('accepts explicit partial cost coverage and a nullable provider quote id', () => {
      expect(() =>
        validateRealExecutionQuote({
          ...quote(),
          providerQuoteId: null,
          costCoverage: 'partial',
          costs: [],
        }),
      ).not.toThrow();
    });

    it('rejects a minimum output above the expected output', () => {
      expect(() =>
        validateRealExecutionQuote({
          ...quote(),
          minimumTargetQuantity: '2.1',
        }),
      ).toThrow('minimum target quantity must not exceed expected quantity');
    });

    it('rejects a quote that predates the intent or does not expire later', () => {
      expect(() =>
        validateRealExecutionQuote({
          ...quote(),
          quotedAt: new Date('2026-09-30T11:59:59.999Z'),
        }),
      ).toThrow('quote must not precede its intent');
      expect(() =>
        validateRealExecutionQuote({
          ...quote(),
          expiresAt: new Date('2026-09-30T12:00:01.000Z'),
        }),
      ).toThrow('quote expiry must follow quote time');
    });

    it('rejects executable or unbounded quote representations', () => {
      expect(() =>
        validateRealExecutionQuote({ ...quote(), executable: true as false }),
      ).toThrow('quote must be non-executable');
      expect(() =>
        validateRealExecutionQuote({
          ...quote(),
          costs: Array.from({ length: 33 }, () => quote().costs[0]),
        }),
      ).toThrow('quote costs must be bounded');
    });
  });

  describe('result', () => {
    it.each(['pending', 'finished', 'failed'] as const)(
      'accepts a coherent %s result',
      (status) => {
        expect(() => validateRealExecutionResult(result(status))).not.toThrow();
      },
    );

    it('requires terminal execution facts only for a finished result', () => {
      expect(() =>
        validateRealExecutionResult({
          ...result('finished'),
          transactionHash: null,
        }),
      ).toThrow('requires a transaction hash');
      expect(() =>
        validateRealExecutionResult({
          ...result('pending'),
          actualTargetQuantity: '1',
        }),
      ).toThrow('must not claim a target quantity');
    });

    it('forbids automatic retry and observations before submission', () => {
      expect(() =>
        validateRealExecutionResult({
          ...result('pending'),
          automaticRetryAllowed: true as false,
        }),
      ).toThrow('must forbid automatic retry');
      expect(() =>
        validateRealExecutionResult({
          ...result('pending'),
          observedAt: new Date('2026-09-30T12:00:01.999Z'),
        }),
      ).toThrow('must not predate submission');
    });
  });

  describe('capability snapshot', () => {
    it('accepts bounded read and chain capabilities without executing them', () => {
      expect(() =>
        validateRealExecutionCapabilitySnapshot(capabilities()),
      ).not.toThrow();
    });

    it('requires unique chains and operations', () => {
      const value = capabilities();
      expect(() =>
        validateRealExecutionCapabilitySnapshot({
          ...value,
          chains: [...value.chains, value.chains[0]],
        }),
      ).toThrow('capability chains must be unique');
      expect(() =>
        validateRealExecutionCapabilitySnapshot({
          ...value,
          chains: [
            {
              chainId: '56',
              operations: ['market_swap_quote', 'market_swap_quote'],
            },
          ],
        }),
      ).toThrow('chain operations must be unique');
    });

    it('never represents submission support without quote support', () => {
      expect(() =>
        validateRealExecutionCapabilitySnapshot({
          ...capabilities(),
          chains: [{ chainId: '56', operations: ['market_swap_submit'] }],
        }),
      ).toThrow('submission requires quote capability');
    });
  });
});

function intent(): RealExecutionIntent {
  return {
    id: '0199a123-4567-7abc-8def-0123456789ab',
    idempotencyKey: 'intent:0199a123-4567-7abc-8def-0123456789ab',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: { tokenAddress: '0xsource', symbol: 'USDT' },
    targetAsset: { tokenAddress: '0xtarget', symbol: 'BTCB' },
    sourceQuantity: '10',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-09-30T12:00:00.000Z'),
  };
}

function quote(): RealExecutionQuote {
  return {
    id: '0199a123-4567-7abc-8def-0123456789ac',
    providerId: 'agentic_wallet',
    providerQuoteId: 'quote-123',
    intent: intent(),
    expectedTargetQuantity: '2',
    minimumTargetQuantity: '1.99',
    costs: [
      {
        kind: 'network_fee',
        asset: { tokenAddress: '0xgas', symbol: 'BNB' },
        quantity: '0.0001',
      },
    ],
    costCoverage: 'complete',
    quotedAt: new Date('2026-09-30T12:00:01.000Z'),
    expiresAt: new Date('2026-09-30T12:00:31.000Z'),
    executable: false,
  };
}

function result(status: RealExecutionResult['status']): RealExecutionResult {
  return {
    id: '0199a123-4567-7abc-8def-0123456789ad',
    providerId: 'agentic_wallet',
    quoteId: quote().id,
    intentId: intent().id,
    providerOrderId: 'order-123',
    transactionHash: status === 'finished' ? '0xtransaction' : null,
    status,
    actualTargetQuantity: status === 'finished' ? '1.995' : null,
    submittedAt: new Date('2026-09-30T12:00:02.000Z'),
    observedAt: new Date('2026-09-30T12:00:03.000Z'),
    automaticRetryAllowed: false,
  };
}

function capabilities(): RealExecutionCapabilitySnapshot {
  return {
    providerId: 'agentic_wallet',
    connected: false,
    chains: [
      {
        chainId: '56',
        operations: ['market_swap_quote', 'market_swap_submit'],
      },
      { chainId: 'CT_501', operations: ['market_swap_quote'] },
    ],
    reads: {
      securitySettings: true,
      quota: true,
      balances: true,
      gas: true,
    },
    observedAt: new Date('2026-09-30T12:00:00.000Z'),
  };
}
