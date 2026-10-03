import { AgenticWalletMarketSwapStatusObservation } from './agentic-wallet-market-swap-status-response';
import { assessAgenticWalletMarketSwapStatusTransition } from './agentic-wallet-market-swap-status-transition';

const TRANSACTION_HASH = `0x${'ab'.repeat(32)}`;
const OTHER_TRANSACTION_HASH = `0x${'cd'.repeat(32)}`;

describe('assessAgenticWalletMarketSwapStatusTransition', () => {
  it('accepts the first pending observation for future persistence and lookup', () => {
    expect(
      assessAgenticWalletMarketSwapStatusTransition(null, observation()),
    ).toEqual({
      scope: 'agentic_wallet_market_swap_status_transition',
      status: 'initial_observation_accepted',
      blockers: [],
      acceptedObservation: observation(),
      persistenceRequired: true,
      statusLookupRequired: true,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
  });

  it.each([
    observation({
      providerStatus: 'FINISHED',
      transactionHash: TRANSACTION_HASH,
      terminal: true,
      executionSucceeded: true,
      statusLookupRequired: false,
    }),
    observation({
      providerStatus: 'FAILED',
      terminal: true,
      statusLookupRequired: false,
    }),
  ])(
    'accepts an initial terminal observation without completing reconciliation',
    (next) => {
      expect(
        assessAgenticWalletMarketSwapStatusTransition(null, next),
      ).toMatchObject({
        status: 'initial_observation_accepted',
        blockers: [],
        acceptedObservation: next,
        persistenceRequired: true,
        statusLookupRequired: false,
        financialReconciliationRequired: true,
        financialReconciliationComplete: false,
        submissionRetryAllowed: false,
      });
    },
  );

  it('recognizes an exact observation replay without requiring persistence', () => {
    const previous = observation();

    expect(
      assessAgenticWalletMarketSwapStatusTransition(previous, observation()),
    ).toMatchObject({
      status: 'observation_replayed',
      blockers: [],
      acceptedObservation: observation(),
      persistenceRequired: false,
      statusLookupRequired: true,
    });
  });

  it('advances a pending observation when provider update time moves forward', () => {
    const next = observation({
      updatedAt: new Date('2026-10-03T12:00:02.000Z'),
    });

    expect(
      assessAgenticWalletMarketSwapStatusTransition(observation(), next),
    ).toMatchObject({
      status: 'observation_advanced',
      blockers: [],
      acceptedObservation: next,
      persistenceRequired: true,
      statusLookupRequired: true,
    });
  });

  it.each([
    observation({
      providerStatus: 'FINISHED',
      transactionHash: TRANSACTION_HASH,
      updatedAt: new Date('2026-10-03T12:00:02.000Z'),
      terminal: true,
      executionSucceeded: true,
      statusLookupRequired: false,
    }),
    observation({
      providerStatus: 'FAILED',
      updatedAt: new Date('2026-10-03T12:00:02.000Z'),
      terminal: true,
      statusLookupRequired: false,
    }),
  ])(
    'allows a pending observation to advance to either terminal state',
    (next) => {
      expect(
        assessAgenticWalletMarketSwapStatusTransition(observation(), next),
      ).toMatchObject({
        status: 'observation_advanced',
        blockers: [],
        acceptedObservation: next,
        persistenceRequired: true,
        statusLookupRequired: false,
        financialReconciliationComplete: false,
      });
    },
  );

  it('allows a transaction hash to appear but never to change afterward', () => {
    const withHash = observation({ transactionHash: TRANSACTION_HASH });
    expect(
      assessAgenticWalletMarketSwapStatusTransition(observation(), withHash),
    ).toMatchObject({ status: 'observation_advanced', blockers: [] });

    const changed = assessAgenticWalletMarketSwapStatusTransition(
      withHash,
      observation({ transactionHash: OTHER_TRANSACTION_HASH }),
    );
    expect(changed.status).toBe('blocked');
    expect(changed.blockers).toContain('transaction_hash_changed');
  });

  it.each([
    { gateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    { providerOrderId: 'different-order' },
  ])('blocks identity divergence %#', (overrides) => {
    const result = assessAgenticWalletMarketSwapStatusTransition(
      observation(),
      observation(overrides),
    );

    expect(result.status).toBe('blocked');
    expect(result.blockers).toContain('observation_identity_mismatch');
    expect(result.acceptedObservation).toBeNull();
    expect(result.statusLookupRequired).toBe(true);
  });

  it('blocks a changed provider booking time', () => {
    const result = assessAgenticWalletMarketSwapStatusTransition(
      observation(),
      observation({ bookedAt: new Date('2026-10-03T12:00:00.500Z') }),
    );

    expect(result.blockers).toContain('booked_at_changed');
    expect(result.acceptedObservation).toBeNull();
  });

  it('blocks a provider update-time regression', () => {
    const result = assessAgenticWalletMarketSwapStatusTransition(
      observation({ updatedAt: new Date('2026-10-03T12:00:02.000Z') }),
      observation(),
    );

    expect(result.blockers).toContain('updated_at_regressed');
    expect(result.persistenceRequired).toBe(false);
    expect(result.statusLookupRequired).toBe(true);
  });

  it.each(['PENDING', 'FAILED'] as const)(
    'blocks changing a FINISHED terminal state to %s',
    (providerStatus) => {
      const previous = observation({
        providerStatus: 'FINISHED',
        transactionHash: TRANSACTION_HASH,
        terminal: true,
        executionSucceeded: true,
        statusLookupRequired: false,
      });
      const next =
        providerStatus === 'PENDING'
          ? observation({ updatedAt: new Date('2026-10-03T12:00:02.000Z') })
          : observation({
              providerStatus: 'FAILED',
              transactionHash: TRANSACTION_HASH,
              updatedAt: new Date('2026-10-03T12:00:02.000Z'),
              terminal: true,
              statusLookupRequired: false,
            });

      const result = assessAgenticWalletMarketSwapStatusTransition(
        previous,
        next,
      );
      expect(result.blockers).toContain('terminal_status_changed');
      expect(result.statusLookupRequired).toBe(false);
    },
  );

  it('accepts a same-terminal-status update with immutable hash', () => {
    const previous = observation({
      providerStatus: 'FINISHED',
      transactionHash: TRANSACTION_HASH,
      terminal: true,
      executionSucceeded: true,
      statusLookupRequired: false,
    });
    const next = observation({
      providerStatus: 'FINISHED',
      transactionHash: TRANSACTION_HASH,
      updatedAt: new Date('2026-10-03T12:00:02.000Z'),
      terminal: true,
      executionSucceeded: true,
      statusLookupRequired: false,
    });

    expect(
      assessAgenticWalletMarketSwapStatusTransition(previous, next),
    ).toMatchObject({
      status: 'observation_advanced',
      blockers: [],
      acceptedObservation: next,
      statusLookupRequired: false,
    });
  });

  it.each([
    { providerId: 'other_provider' },
    { providerStatus: 'COMPLETED' },
    { transactionHash: `0x${'AB'.repeat(32)}` },
    { terminal: true },
    { executionSucceeded: true },
    { statusLookupRequired: false },
    { financialReconciliationRequired: false },
    { financialReconciliationComplete: true },
    { actualReceivedQuantity: '1' },
    { submissionRetryAllowed: true },
  ])('blocks malformed next observation evidence %#', (overrides) => {
    const result = assessAgenticWalletMarketSwapStatusTransition(
      observation(),
      observation(
        overrides as Partial<AgenticWalletMarketSwapStatusObservation>,
      ),
    );

    expect(result.blockers).toContain('invalid_next_observation');
    expect(result.acceptedObservation).toBeNull();
    expect(result.persistenceRequired).toBe(false);
  });

  it('blocks malformed previous observation evidence', () => {
    const result = assessAgenticWalletMarketSwapStatusTransition(
      observation({ terminal: true as false }),
      observation({ updatedAt: new Date('2026-10-03T12:00:02.000Z') }),
    );

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_previous_observation'],
      acceptedObservation: null,
      persistenceRequired: false,
      statusLookupRequired: false,
    });
  });
});

function observation(
  overrides: Partial<AgenticWalletMarketSwapStatusObservation> = {},
): AgenticWalletMarketSwapStatusObservation {
  return {
    kind: 'agentic_wallet_market_swap_status_observation',
    providerId: 'agentic_wallet',
    gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    providerOrderId: '1234567890',
    providerStatus: 'PENDING',
    transactionHash: null,
    bookedAt: new Date('2026-10-03T12:00:00.000Z'),
    updatedAt: new Date('2026-10-03T12:00:01.000Z'),
    terminal: false,
    executionSucceeded: false,
    statusLookupRequired: true,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    actualReceivedQuantity: null,
    submissionRetryAllowed: false,
    ...overrides,
  };
}
