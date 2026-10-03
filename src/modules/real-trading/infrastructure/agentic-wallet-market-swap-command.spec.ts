import { StoredRealExecutionSubmissionGate } from '../application/real-execution-submission-gate-store';
import { prepareAgenticWalletMarketSwapCommand } from './agentic-wallet-market-swap-command';

const NOW = new Date('2026-10-03T12:00:05.000Z');

describe('prepareAgenticWalletMarketSwapCommand', () => {
  it('builds the exact closed non-executable Agentic Wallet argument preview', () => {
    expect(prepareAgenticWalletMarketSwapCommand(gate(), NOW)).toEqual({
      scope: 'agentic_wallet_market_swap_command',
      status: 'command_preview_ready',
      blockers: [],
      command: {
        kind: 'agentic_wallet_market_order_swap_command_preview',
        gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        arguments: [
          'market-order',
          'swap',
          '--fromTokenQty',
          '5',
          '--fromToken',
          '0x55d398326f99059ff775485246999027b3197955',
          '--toToken',
          '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
          '--binanceChainId',
          '56',
          '--slippage',
          '0.1',
          '--mev',
          'true',
          '--gasLevel',
          'MEDIUM',
          '--json',
        ],
        executable: false,
        automaticRetryAllowed: false,
        providerSubmissionStarted: false,
        submissionAuthorized: false,
      },
      evaluatedAt: NOW,
    });
  });

  it('supports only the opposite exact approved direction as an alternative', () => {
    const result = prepareAgenticWalletMarketSwapCommand(
      gate({
        sourceTokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
        targetTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
      }),
      NOW,
    );

    expect(result.status).toBe('command_preview_ready');
  });

  it.each([
    { providerId: 'other_provider' },
    { chainId: '1' },
    { sourceTokenAddress: '0x1111111111111111111111111111111111111111' },
    { sourceQuantity: '5.0' },
    { maximumSlippagePercent: '0.10' },
    { mevProtection: false },
    { gasLevel: 'HIGH' },
    { status: 'submitted' },
    { payloadCommitmentDigest: 'invalid' },
    { atomicGateSatisfied: false },
    { confirmationConsumed: false },
    { providerSubmissionStarted: true },
    { submissionAuthorized: true },
  ])('rejects malformed or unsafe gate facts %#', (overrides) => {
    expect(
      prepareAgenticWalletMarketSwapCommand(
        gate(overrides as Partial<StoredRealExecutionSubmissionGate>),
        NOW,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_submission_gate'],
      command: null,
    });
  });

  it('rejects inconsistent atomic timestamps and expiry', () => {
    expect(
      prepareAgenticWalletMarketSwapCommand(
        gate({
          confirmationConsumedAt: new Date('2026-10-03T12:00:04.001Z'),
        }),
        NOW,
      ).blockers,
    ).toContain('invalid_submission_gate');
    expect(
      prepareAgenticWalletMarketSwapCommand(gate({ expiresAt: NOW }), NOW)
        .blockers,
    ).toContain('submission_gate_expired');
  });

  it('rejects future gates and invalid evaluation time', () => {
    expect(
      prepareAgenticWalletMarketSwapCommand(
        gate({ createdAt: new Date('2026-10-03T12:00:05.001Z') }),
        NOW,
      ).blockers,
    ).toContain('submission_gate_from_future');
    expect(
      prepareAgenticWalletMarketSwapCommand(gate(), new Date(Number.NaN))
        .blockers,
    ).toContain('invalid_evaluation_time');
  });
});

function gate(
  overrides: Partial<StoredRealExecutionSubmissionGate> = {},
): StoredRealExecutionSubmissionGate {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    confirmationId: '88888888-8888-4888-8888-888888888888',
    approvalId: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    submissionPlanId: '99999999-9999-4999-8999-999999999999',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'c'.repeat(64),
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    sourceTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
    targetTokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    sourceQuantity: '5',
    maximumSlippagePercent: '0.1',
    mevProtection: true,
    gasLevel: 'MEDIUM',
    status: 'prepared_not_submitted',
    emergencyStopRecheckedAt: new Date('2026-10-03T12:00:04.000Z'),
    confirmationConsumedAt: new Date('2026-10-03T12:00:04.000Z'),
    expiresAt: new Date('2026-10-03T12:00:07.000Z'),
    createdAt: new Date('2026-10-03T12:00:04.100Z'),
    atomicGateSatisfied: true,
    confirmationConsumed: true,
    providerSubmissionStarted: false,
    submissionAuthorized: false,
    ...overrides,
  };
}
