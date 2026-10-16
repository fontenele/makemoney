import { AgenticWalletCapabilityObservation } from './agentic-wallet-capability.adapter';
import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitializationRequest,
  isValidAgenticWalletAccountingBalanceInitialization,
  prepareAgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';

const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';

describe('Agentic Wallet accounting balance initialization', () => {
  it('prepares canonical local balances from a fresh authenticated observation', () => {
    const observation = validObservation();
    const request = validRequest();

    const result = prepareAgenticWalletAccountingBalanceInitialization(
      observation,
      request,
    );

    expect(result).toEqual({
      scope: 'agentic_wallet_accounting_balance_initialization_assessment',
      status: 'accounting_balance_initialization_ready',
      blockers: [],
      initialization: {
        scope: 'agentic_wallet_accounting_balance_initialization',
        initializationId: INITIALIZATION_ID,
        providerId: 'agentic_wallet',
        chainId: '56',
        acknowledgment: ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
        balances: [
          {
            assetType: 'native',
            assetSymbol: 'BNB',
            currentQuantity: '2',
          },
          {
            assetType: 'token',
            assetAddress: USDT,
            currentQuantity: '1000.5',
          },
          {
            assetType: 'token',
            assetAddress: BTCB,
            currentQuantity: '0.125',
          },
        ],
        balanceCoverageComplete: true,
        walletObservedAt: new Date('2026-10-16T12:00:00.000Z'),
        maximumObservationAgeMs: 30_000,
        preparedAt: new Date('2026-10-16T12:00:20.000Z'),
        accountingBalanceInitializationPrepared: true,
        accountingBalancesInitialized: false,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
      accountingBalanceInitializationPrepared: true,
      accountingBalancesInitialized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(
      isValidAgenticWalletAccountingBalanceInitialization(
        result.initialization,
      ),
    ).toBe(true);
    expect(result.initialization?.balances).not.toBe(observation.balances);
    expect(result.initialization?.preparedAt).not.toBe(request.preparedAt);
    expect(result.initialization?.walletObservedAt).not.toBe(
      observation.capabilities.observedAt,
    );
  });

  it('allows irrelevant balances without importing them', () => {
    const base = validObservation();
    const observation = {
      ...base,
      balances: [
        ...base.balances,
        {
          chainId: '56',
          tokenAddress: '0x1111111111111111111111111111111111111111',
          symbol: 'OTHER',
          quantity: '99',
        },
      ],
    };

    const result = prepareAgenticWalletAccountingBalanceInitialization(
      observation,
      validRequest(),
    );

    expect(result.status).toBe('accounting_balance_initialization_ready');
    expect(result.initialization?.balances).toHaveLength(3);
  });

  it.each([
    [
      'not connected',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        capabilities: { ...value.capabilities, connected: false },
      }),
      'wallet_not_connected',
    ],
    [
      'missing approved chain',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        capabilities: { ...value.capabilities, chains: [] },
      }),
      'approved_chain_unavailable',
    ],
    [
      'missing approved-chain address',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        addresses: [],
      }),
      'approved_chain_address_unavailable',
    ],
    [
      'balance read unavailable',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        capabilities: {
          ...value.capabilities,
          reads: { ...value.capabilities.reads, balances: false },
        },
      }),
      'wallet_balance_read_unavailable',
    ],
  ] as const)('blocks when the wallet is %s', (_name, mutate, blocker) => {
    const observation = mutate(validObservation());

    expectBlocked(observation, validRequest(), blocker);
  });

  it.each([
    [
      'USDT',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        balances: value.balances.filter((balance) => balance.symbol !== 'USDT'),
      }),
    ],
    [
      'BTCB',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        balances: value.balances.filter((balance) => balance.symbol !== 'BTCB'),
      }),
    ],
    [
      'BNB',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        balances: value.balances.filter((balance) => balance.symbol !== 'BNB'),
      }),
    ],
    [
      'unique BNB',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        balances: [
          ...value.balances,
          {
            chainId: '56',
            tokenAddress: 'native-bnb-duplicate',
            symbol: 'BNB',
            quantity: '1',
          },
        ],
      }),
    ],
  ] as const)('blocks incomplete %s coverage', (_name, mutate) => {
    const observation = mutate(validObservation());

    expectBlocked(
      observation,
      validRequest(),
      'required_accounting_balance_coverage_incomplete',
    );
  });

  it.each([
    [
      'USDT symbol',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        balances: value.balances.map((balance, index) =>
          index === 0 ? { ...balance, symbol: 'USD' } : balance,
        ),
      }),
    ],
    [
      'BTCB address case',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        balances: value.balances.map((balance, index) =>
          index === 1
            ? {
                ...balance,
                tokenAddress: BTCB.toUpperCase().replace('0X', '0x'),
              }
            : balance,
        ),
      }),
    ],
    [
      'BNB token identity',
      (value: AgenticWalletCapabilityObservation) => ({
        ...value,
        balances: value.balances.map((balance, index) =>
          index === 2
            ? {
                ...balance,
                tokenAddress: USDT.toUpperCase().replace('0X', '0x'),
              }
            : balance,
        ),
      }),
    ],
  ] as const)('blocks a mismatched %s', (_name, mutate) => {
    const observation = mutate(validObservation());

    expectBlocked(
      observation,
      validRequest(),
      'required_accounting_balance_identity_mismatch',
    );
  });

  it('requires the exact operator acknowledgment', () => {
    const request = {
      ...validRequest(),
      acknowledgment: 'wrong',
    } as AgenticWalletAccountingBalanceInitializationRequest;

    const result = prepareAgenticWalletAccountingBalanceInitialization(
      validObservation(),
      request,
    );

    expect(result.blockers).toEqual([
      'accounting_balance_initialization_acknowledgment_missing',
    ]);
    expect(result.initialization).toBeNull();
  });

  it.each([
    [
      'future',
      '2026-10-16T11:59:59.999Z',
      'wallet_balance_observation_from_future',
    ],
    ['stale', '2026-10-16T12:00:30.001Z', 'wallet_balance_observation_stale'],
  ] as const)(
    'blocks a %s wallet observation',
    (_name, preparedAt, blocker) => {
      const request = { ...validRequest(), preparedAt: new Date(preparedAt) };

      expectBlocked(validObservation(), request, blocker);
    },
  );

  it('allows an observation at the exact maximum-age boundary', () => {
    const request = {
      ...validRequest(),
      preparedAt: new Date('2026-10-16T12:00:30.000Z'),
    };

    expect(
      prepareAgenticWalletAccountingBalanceInitialization(
        validObservation(),
        request,
      ).status,
    ).toBe('accounting_balance_initialization_ready');
  });

  it.each([
    ['invalid observation', null, validRequest(), 'invalid_wallet_observation'],
    [
      'invalid initialization id',
      validObservation(),
      { ...validRequest(), initializationId: 'bad' },
      'invalid_accounting_balance_initialization_request',
    ],
    [
      'invalid maximum age',
      validObservation(),
      { ...validRequest(), maximumObservationAgeMs: 60_001 },
      'invalid_accounting_balance_initialization_request',
    ],
    [
      'invalid preparation date',
      validObservation(),
      { ...validRequest(), preparedAt: new Date('invalid') },
      'invalid_accounting_balance_initialization_request',
    ],
  ] as const)('rejects %s', (_name, observation, request, blocker) => {
    expectBlocked(
      observation as AgenticWalletCapabilityObservation,
      request,
      blocker,
    );
  });

  it('rejects malformed or mutated prepared initializations', () => {
    const initialization = prepareAgenticWalletAccountingBalanceInitialization(
      validObservation(),
      validRequest(),
    ).initialization;
    expect(initialization).not.toBeNull();

    expect(isValidAgenticWalletAccountingBalanceInitialization(null)).toBe(
      false,
    );
    expect(
      isValidAgenticWalletAccountingBalanceInitialization({
        ...initialization,
        initializationId: 1,
      }),
    ).toBe(false);
    expect(
      isValidAgenticWalletAccountingBalanceInitialization({
        ...initialization,
        balances: initialization?.balances.slice(1),
      }),
    ).toBe(false);
    expect(
      isValidAgenticWalletAccountingBalanceInitialization({
        ...initialization,
        submissionAuthorized: true,
      }),
    ).toBe(false);
  });
});

function expectBlocked(
  observation: AgenticWalletCapabilityObservation,
  request: AgenticWalletAccountingBalanceInitializationRequest,
  blocker: string,
): void {
  const result = prepareAgenticWalletAccountingBalanceInitialization(
    observation,
    request,
  );
  expect(result.status).toBe('blocked');
  expect(result.blockers).toContain(blocker);
  expect(result.initialization).toBeNull();
  expect(result.accountingBalanceInitializationPrepared).toBe(false);
  expect(result.accountingBalancesInitialized).toBe(false);
  expect(result.quoteAuthorized).toBe(false);
  expect(result.submissionAuthorized).toBe(false);
}

function validRequest(): AgenticWalletAccountingBalanceInitializationRequest {
  return {
    initializationId: INITIALIZATION_ID,
    acknowledgment: ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
    maximumObservationAgeMs: 30_000,
    preparedAt: new Date('2026-10-16T12:00:20.000Z'),
  };
}

function validObservation(): AgenticWalletCapabilityObservation {
  return {
    cliVersion: '1.10.0',
    requiredCliVersion: '1.10.0',
    capabilities: {
      providerId: 'agentic_wallet',
      connected: true,
      chains: [{ chainId: '56', operations: [] }],
      reads: {
        securitySettings: true,
        quota: true,
        balances: true,
        gas: true,
      },
      observedAt: new Date('2026-10-16T12:00:00.000Z'),
    },
    settings: null,
    quota: null,
    addresses: [{ chainId: '56', address: '0xwallet' }],
    balances: [
      {
        chainId: '56',
        tokenAddress: USDT,
        symbol: 'USDT',
        quantity: '1000.5000',
      },
      {
        chainId: '56',
        tokenAddress: BTCB,
        symbol: 'BTCB',
        quantity: '0.125000',
      },
      {
        chainId: '56',
        tokenAddress: 'native-bnb',
        symbol: 'BNB',
        quantity: '2.000',
      },
    ],
    gas: null,
  };
}
