import { createHash } from 'node:crypto';

import { jest } from '@jest/globals';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  RealExecutionSubmissionAttemptBlockedError,
  RealExecutionSubmissionAttemptConflictError,
} from '../application/real-execution-submission-attempt.store';
import { PrismaRealExecutionSubmissionAttemptStore } from './prisma-real-execution-submission-attempt.store';

const NOW = new Date('2026-10-24T21:00:05.000Z');
const ATTEMPT_ID = '00000000-0000-4000-8000-000000000150';
const GATE_ID = '00000000-0000-4000-8000-000000000034';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const USDT = '0x55d398326f99059ff775485246999027b3197955';

describe('PrismaRealExecutionSubmissionAttemptStore', () => {
  it('claims one active gate under the shared emergency-stop lock', async () => {
    const harness = repositoryHarness();
    harness.create.mockImplementation(({ data }) =>
      Promise.resolve(attemptRow(data)),
    );

    const result = await harness.store.claim(claim());

    expect(result).toEqual({
      attempt: publicAttempt(),
      replayed: false,
      command: claimedCommand(),
    });
    expect(harness.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(harness.tx.riskControlEvent.findFirst).toHaveBeenCalledWith({
      where: { control: 'emergency_stop' },
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    });
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      id: ATTEMPT_ID,
      gateId: GATE_ID,
      providerId: 'agentic_wallet',
      chainId: '56',
      payloadCommitmentVersion: 'real_execution_intent_quote_v1',
      payloadCommitmentDigest: 'a'.repeat(64),
      emergencyStopChangeId: 'stop-clear-1',
      commandArgumentsFingerprint: commandFingerprint(),
      state: 'submission_claimed',
      automaticRetryAllowed: false,
      claimedAt: NOW,
    });
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact claim before reading mutable gate or stop state', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionSubmissionAttempt.findUnique.mockResolvedValueOnce(
      attemptRow(),
    );

    await expect(harness.store.claim(claim())).resolves.toEqual({
      attempt: publicAttempt(),
      replayed: true,
      command: null,
    });
    expect(
      harness.tx.realExecutionSubmissionGate.findUnique,
    ).not.toHaveBeenCalled();
    expect(harness.tx.riskControlEvent.findFirst).not.toHaveBeenCalled();
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects a changed gate replay and reuse of the attempt id', async () => {
    const changedGate = repositoryHarness();
    changedGate.tx.realExecutionSubmissionAttempt.findUnique.mockResolvedValueOnce(
      attemptRow({ id: '00000000-0000-4000-8000-000000000151' }),
    );
    await expect(changedGate.store.claim(claim())).rejects.toBeInstanceOf(
      RealExecutionSubmissionAttemptConflictError,
    );

    const reusedId = repositoryHarness();
    reusedId.tx.realExecutionSubmissionAttempt.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        attemptRow({ gateId: '00000000-0000-4000-8000-000000000035' }),
      );
    await expect(reusedId.store.claim(claim())).rejects.toBeInstanceOf(
      RealExecutionSubmissionAttemptConflictError,
    );
  });

  it('rejects malformed identities before persistence access', async () => {
    const harness = repositoryHarness();
    await expect(
      harness.store.claim({ id: 'invalid', gateId: 'also-invalid' }),
    ).rejects.toMatchObject({
      blockers: ['invalid_attempt_id', 'invalid_gate_id'],
    });
    expect(harness.prismaTransaction).not.toHaveBeenCalled();
  });

  it('blocks an absent, malformed, or expired gate', async () => {
    const missing = repositoryHarness();
    missing.tx.realExecutionSubmissionGate.findUnique.mockResolvedValue(null);
    await expectBlocked(missing, ['submission_gate_not_found']);

    const malformed = repositoryHarness();
    malformed.tx.realExecutionSubmissionGate.findUnique.mockResolvedValue(
      gateRow({ status: 'submitted' }),
    );
    await expectBlocked(malformed, ['submission_gate_invalid']);

    const expired = repositoryHarness();
    expired.tx.realExecutionSubmissionGate.findUnique.mockResolvedValue(
      gateRow({ expiresAt: new Date('2026-10-24T21:00:05.000Z') }),
    );
    await expectBlocked(expired, ['submission_gate_expired']);
  });

  it('blocks missing, active, or changed emergency-stop state', async () => {
    const missing = repositoryHarness();
    missing.tx.riskControlEvent.findFirst.mockResolvedValue(null);
    await expectBlocked(missing, [
      'emergency_stop_not_persisted',
      'emergency_stop_active',
    ]);

    const active = repositoryHarness();
    active.tx.riskControlEvent.findFirst.mockResolvedValue(
      stopRow({ active: true }),
    );
    await expectBlocked(active, ['emergency_stop_active']);

    const changed = repositoryHarness();
    changed.tx.riskControlEvent.findFirst.mockResolvedValue(
      stopRow({ id: 'stop-clear-2' }),
    );
    await expectBlocked(changed, ['emergency_stop_change_mismatch']);
  });

  it('blocks a gate that already has a provider submission receipt', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionSubmissionGate.findUnique.mockResolvedValue(
      gateRow({ submissionReceipt: { gateId: GATE_ID } }),
    );
    await expectBlocked(harness, ['submission_receipt_already_exists']);
  });

  it('fails closed for malformed persisted claims', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionSubmissionAttempt.findUnique.mockResolvedValueOnce(
      attemptRow({ automaticRetryAllowed: true }),
    );
    await expect(harness.store.claim(claim())).rejects.toThrow(
      'Persisted real execution submission attempt is invalid',
    );
  });
});

async function expectBlocked(
  harness: ReturnType<typeof repositoryHarness>,
  blockers: string[],
): Promise<void> {
  let caught: unknown;
  try {
    await harness.store.claim(claim());
  } catch (error: unknown) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RealExecutionSubmissionAttemptBlockedError);
  if (!(caught instanceof RealExecutionSubmissionAttemptBlockedError)) {
    throw caught;
  }
  expect(caught.blockers).toEqual(expect.arrayContaining(blockers));
  expect(harness.create).not.toHaveBeenCalled();
}

function repositoryHarness() {
  const create =
    jest.fn<(args: { data: Record<string, unknown> }) => Promise<AttemptRow>>();
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    realExecutionSubmissionAttempt: {
      findUnique: jest
        .fn<() => Promise<AttemptRow | null>>()
        .mockResolvedValue(null),
      create,
    },
    realExecutionSubmissionGate: {
      findUnique: jest
        .fn<() => Promise<GateRow | null>>()
        .mockResolvedValue(gateRow()),
    },
    riskControlEvent: {
      findFirst: jest
        .fn<() => Promise<ReturnType<typeof stopRow> | null>>()
        .mockResolvedValue(stopRow()),
    },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    create,
    tx,
    prismaTransaction,
    store: new PrismaRealExecutionSubmissionAttemptStore(prisma, () => NOW),
  };
}

function claim() {
  return { id: ATTEMPT_ID, gateId: GATE_ID };
}

type GateRow = ReturnType<typeof gateRow>;

function gateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: GATE_ID,
    confirmationId: '00000000-0000-4000-8000-000000000025',
    approvalId: '00000000-0000-4000-8000-000000000023',
    reservationId: '00000000-0000-4000-8000-000000000018',
    armId: '00000000-0000-4000-8000-000000000020',
    submissionPlanId: '00000000-0000-4000-8000-000000000027',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '00000000-0000-4000-8000-000000000002',
    quoteId: '00000000-0000-4000-8000-000000000011',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'a'.repeat(64),
    emergencyStopChangeId: 'stop-clear-1',
    sourceTokenAddress: USDT,
    targetTokenAddress: BTCB,
    sourceQuantity: '10',
    maximumSlippagePercent: '0.5',
    mevProtection: true,
    gasLevel: 'MEDIUM',
    status: 'prepared_not_submitted',
    requestFingerprint: 'b'.repeat(64),
    emergencyStopRecheckedAt: new Date('2026-10-24T21:00:00.000Z'),
    confirmationConsumedAt: new Date('2026-10-24T21:00:00.000Z'),
    expiresAt: new Date('2026-10-24T21:00:10.000Z'),
    createdAt: new Date('2026-10-24T21:00:00.000Z'),
    submissionReceipt: null as { gateId: string } | null,
    ...overrides,
  };
}

function stopRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stop-clear-1',
    control: 'emergency_stop',
    active: false,
    reason: 'clear',
    changedAt: new Date('2026-10-24T20:59:59.000Z'),
    ...overrides,
  };
}

type AttemptRow = ReturnType<typeof attemptRow>;

function attemptRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ATTEMPT_ID,
    gateId: GATE_ID,
    requestFingerprint: requestFingerprint(),
    providerId: 'agentic_wallet',
    chainId: '56',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'a'.repeat(64),
    emergencyStopChangeId: 'stop-clear-1',
    commandArgumentsFingerprint: commandFingerprint(),
    state: 'submission_claimed',
    automaticRetryAllowed: false,
    claimedAt: NOW,
    ...overrides,
  };
}

function publicAttempt() {
  return {
    ...attemptRow(),
    providerId: 'agentic_wallet',
    chainId: '56',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    state: 'submission_claimed',
    automaticRetryAllowed: false,
    providerSubmissionStarted: false,
    submissionAuthorized: false,
    claimedAt: new Date(NOW),
  };
}

function requestFingerprint(): string {
  return digest(JSON.stringify({ gateId: GATE_ID, id: ATTEMPT_ID }));
}

function commandFingerprint(): string {
  return digest(
    JSON.stringify([
      'market-order',
      'swap',
      '--fromTokenQty',
      '10',
      '--fromToken',
      USDT,
      '--toToken',
      BTCB,
      '--binanceChainId',
      '56',
      '--slippage',
      '0.5',
      '--mev',
      'true',
      '--gasLevel',
      'MEDIUM',
      '--json',
    ]),
  );
}

function claimedCommand() {
  return {
    kind: 'agentic_wallet_claimed_market_swap',
    attemptId: ATTEMPT_ID,
    gateId: GATE_ID,
    arguments: [
      'market-order',
      'swap',
      '--fromTokenQty',
      '10',
      '--fromToken',
      USDT,
      '--toToken',
      BTCB,
      '--binanceChainId',
      '56',
      '--slippage',
      '0.5',
      '--mev',
      'true',
      '--gasLevel',
      'MEDIUM',
      '--json',
    ],
    commandArgumentsFingerprint: commandFingerprint(),
    automaticRetryAllowed: false,
  };
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
