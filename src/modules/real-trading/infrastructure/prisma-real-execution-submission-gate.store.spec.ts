import { createHash } from 'node:crypto';

import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { StoredRealExecutionFinalConfirmation } from '../application/real-execution-final-confirmation-store';
import { assessRealExecutionPayloadCommitment } from '../application/real-execution-payload-commitment';
import {
  RealExecutionSubmissionGateBlockedError,
  RealExecutionSubmissionGateCommand,
  RealExecutionSubmissionGateConfirmationNotFoundError,
  RealExecutionSubmissionGateIdempotencyConflictError,
  RealExecutionSubmissionGateIdentityConflictError,
} from '../application/real-execution-submission-gate-store';
import { PrismaRealExecutionSubmissionGateStore } from './prisma-real-execution-submission-gate.store';

const NOW = new Date('2026-10-03T12:00:04.000Z');
const CREATED_AT = new Date('2026-10-03T12:00:04.100Z');

describe('PrismaRealExecutionSubmissionGateStore', () => {
  it('atomically rechecks stop state, consumes confirmation, and persists an inert gate', async () => {
    const harness = repositoryHarness();
    harness.create.mockImplementation(({ data }) =>
      Promise.resolve(gateRow(data)),
    );

    await expect(harness.store.create(command())).resolves.toEqual({
      gate: publicGate(),
      replayed: false,
    });
    expect(harness.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(harness.tx.riskControlEvent.findFirst).toHaveBeenCalledWith({
      where: { control: 'emergency_stop' },
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    });
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      confirmationId: confirmation().id,
      submissionPlanId: command().submissionPlan.id,
      status: 'prepared_not_submitted',
      mevProtection: true,
      gasLevel: 'MEDIUM',
      emergencyStopRecheckedAt: NOW,
      confirmationConsumedAt: NOW,
    });
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact gate without re-reading mutable state', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionSubmissionGate.findUnique.mockResolvedValue(
      gateRow(),
    );

    await expect(harness.store.create(command())).resolves.toEqual({
      gate: publicGate(),
      replayed: true,
    });
    expect(
      harness.tx.realExecutionFinalConfirmation.findUnique,
    ).not.toHaveBeenCalled();
    expect(harness.tx.riskControlEvent.findFirst).not.toHaveBeenCalled();
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects changed idempotent replay and protected identity reuse', async () => {
    const changed = repositoryHarness();
    changed.tx.realExecutionSubmissionGate.findUnique.mockResolvedValue(
      gateRow({ requestFingerprint: '0'.repeat(64) }),
    );
    await expect(changed.store.create(command())).rejects.toBeInstanceOf(
      RealExecutionSubmissionGateIdempotencyConflictError,
    );

    const reused = repositoryHarness();
    reused.tx.realExecutionSubmissionGate.findFirst.mockResolvedValue({
      id: 'existing',
    });
    await expect(reused.store.create(command())).rejects.toBeInstanceOf(
      RealExecutionSubmissionGateIdentityConflictError,
    );
    expect(reused.create).not.toHaveBeenCalled();
  });

  it('fails closed when the durable confirmation is absent or malformed', async () => {
    const missing = repositoryHarness();
    missing.tx.realExecutionFinalConfirmation.findUnique.mockResolvedValue(
      null,
    );
    await expect(missing.store.create(command())).rejects.toBeInstanceOf(
      RealExecutionSubmissionGateConfirmationNotFoundError,
    );

    const malformed = repositoryHarness();
    malformed.tx.realExecutionFinalConfirmation.findUnique.mockResolvedValue(
      confirmationRow({ payloadCommitmentDigest: null }),
    );
    await expect(malformed.store.create(command())).rejects.toThrow(
      'Persisted final confirmation has invalid payload commitment',
    );
  });

  it('blocks an active, missing, or changed emergency stop inside the transaction', async () => {
    const active = repositoryHarness();
    active.tx.riskControlEvent.findFirst.mockResolvedValue(
      stopRow({ active: true }),
    );
    await expectBlocked(active.store, ['emergency_stop_active']);

    const missing = repositoryHarness();
    missing.tx.riskControlEvent.findFirst.mockResolvedValue(null);
    await expectBlocked(missing.store, [
      'emergency_stop_coverage_incomplete',
      'emergency_stop_not_persisted',
      'emergency_stop_active',
    ]);

    const changed = repositoryHarness();
    changed.tx.riskControlEvent.findFirst.mockResolvedValue(
      stopRow({ id: 'later-stop-change' }),
    );
    await expectBlocked(changed.store, ['emergency_stop_change_mismatch']);
  });

  it('blocks changed or incomplete provider payload facts', async () => {
    const changed = repositoryHarness();
    await expectBlocked(
      changed.store,
      ['payload_commitment_mismatch'],
      command({ quote: quote({ minimumTargetQuantity: '0.0000619' }) }),
    );

    const incomplete = repositoryHarness();
    await expectBlocked(
      incomplete.store,
      ['payload_commitment_blocked'],
      command({ quote: quote({ costCoverage: 'partial' }) }),
    );
  });

  it('rejects malformed gate ids and persisted gate invariants', async () => {
    const invalid = repositoryHarness();
    await expect(
      invalid.store.create(command({ id: 'invalid' })),
    ).rejects.toMatchObject({ blockers: ['invalid_gate_id'] });

    const malformed = repositoryHarness();
    malformed.tx.realExecutionSubmissionGate.findUnique.mockResolvedValue(
      gateRow({ status: 'submitted' }),
    );
    await expect(malformed.store.create(command())).rejects.toThrow(
      'Persisted real execution submission gate is invalid',
    );
  });
});

async function expectBlocked(
  store: PrismaRealExecutionSubmissionGateStore,
  blockers: string[],
  value = command(),
): Promise<void> {
  let caught: unknown;
  try {
    await store.create(value);
  } catch (error: unknown) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RealExecutionSubmissionGateBlockedError);
  if (!(caught instanceof RealExecutionSubmissionGateBlockedError)) {
    throw caught;
  }
  expect(caught.blockers).toEqual(expect.arrayContaining(blockers));
}

function repositoryHarness() {
  const create =
    jest.fn<(args: { data: Record<string, unknown> }) => Promise<GateRow>>();
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    realExecutionSubmissionGate: {
      findUnique: jest
        .fn<() => Promise<GateRow | null>>()
        .mockResolvedValue(null),
      findFirst: jest
        .fn<() => Promise<{ id: string } | null>>()
        .mockResolvedValue(null),
      create,
    },
    realExecutionFinalConfirmation: {
      findUnique: jest
        .fn<() => Promise<ConfirmationRow | null>>()
        .mockResolvedValue(confirmationRow()),
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
    tx,
    create,
    prismaTransaction,
    store: new PrismaRealExecutionSubmissionGateStore(prisma, () => NOW),
  };
}

function command(
  overrides: Partial<RealExecutionSubmissionGateCommand> = {},
): RealExecutionSubmissionGateCommand {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    submissionPlan: {
      id: '99999999-9999-4999-8999-999999999999',
      confirmationId: confirmation().id,
      approvalId: confirmation().approvalId,
      reservationId: confirmation().reservationId,
      armId: confirmation().armId,
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: intent().id,
      quoteId: quote().id,
      emergencyStopChangeId: confirmation().emergencyStopChangeId,
      requestedAt: new Date('2026-10-03T12:00:03.000Z'),
      expiresAt: new Date('2026-10-03T12:00:07.000Z'),
      initialSubmissionOnly: true,
      automaticRetryAllowed: false,
    },
    intent: intent(),
    quote: quote(),
    emergencyStopPolicy: { snapshotMaxAgeMs: 1_000 },
    ...overrides,
  };
}

function confirmation(): StoredRealExecutionFinalConfirmation {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    approvalId: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: intent().id,
    quoteId: quote().id,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: commitmentDigest(),
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    acknowledgment:
      'risk_approval_and_final_quote_reviewed_for_immediate_submission',
    requestedAt: new Date('2026-10-03T12:00:01.000Z'),
    createdAt: new Date('2026-10-03T12:00:02.000Z'),
    expiresAt: new Date('2026-10-03T12:00:08.000Z'),
    riskApproved: true,
    confirmationRecorded: true,
    emergencyStopRecheckedForSubmission: false,
    submissionAuthorized: false,
  };
}

function confirmationRow(overrides: Record<string, unknown> = {}) {
  const value = confirmation();
  return {
    id: value.id,
    approvalId: value.approvalId,
    reservationId: value.reservationId,
    armId: value.armId,
    providerId: value.providerId,
    chainId: value.chainId,
    intentId: value.intentId,
    quoteId: value.quoteId,
    payloadCommitmentVersion: value.payloadCommitmentVersion,
    payloadCommitmentDigest: value.payloadCommitmentDigest,
    emergencyStopChangeId: value.emergencyStopChangeId,
    acknowledgment: value.acknowledgment,
    requestFingerprint: 'a'.repeat(64),
    requestedAt: value.requestedAt,
    expiresAt: value.expiresAt,
    createdAt: value.createdAt,
    ...overrides,
  };
}

function stopRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'real-trading-stop-clear-1',
    control: 'emergency_stop',
    active: false,
    reason: 'clear',
    changedAt: new Date('2026-10-03T12:00:01.500Z'),
    ...overrides,
  };
}

function intent(): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'submission-gate-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: {
      tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
      symbol: 'USDT',
    },
    targetAsset: {
      tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
      symbol: 'BTCB',
    },
    sourceQuantity: '5',
    maxSlippageRate: '0.001',
    createdAt: new Date('2026-10-03T12:00:00.000Z'),
  };
}

function quote(
  overrides: Partial<RealExecutionQuote> = {},
): RealExecutionQuote {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    providerId: 'agentic_wallet',
    providerQuoteId: null,
    intent: intent(),
    expectedTargetQuantity: '0.000062',
    minimumTargetQuantity: '0.000061938',
    costs: [
      { kind: 'provider_fee', asset: intent().sourceAsset, quantity: '0.005' },
      { kind: 'network_fee', asset: intent().sourceAsset, quantity: '0.1' },
    ],
    costCoverage: 'complete',
    quotedAt: new Date('2026-10-03T12:00:00.500Z'),
    expiresAt: new Date('2026-10-03T12:00:08.000Z'),
    executable: false,
    ...overrides,
  };
}

function commitmentDigest(): string {
  const assessment = assessRealExecutionPayloadCommitment(
    intent(),
    quote(),
    NOW,
  );
  if (assessment.commitment === null)
    throw new Error('test commitment blocked');
  return assessment.commitment.digest;
}

function gateRow(overrides: Record<string, unknown> = {}) {
  const value = command();
  return {
    id: value.id,
    confirmationId: value.submissionPlan.confirmationId,
    approvalId: value.submissionPlan.approvalId,
    reservationId: value.submissionPlan.reservationId,
    armId: value.submissionPlan.armId,
    submissionPlanId: value.submissionPlan.id,
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: value.intent.id,
    quoteId: value.quote.id,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: commitmentDigest(),
    emergencyStopChangeId: value.submissionPlan.emergencyStopChangeId,
    sourceTokenAddress: value.intent.sourceAsset.tokenAddress,
    targetTokenAddress: value.intent.targetAsset.tokenAddress,
    sourceQuantity: '5',
    maximumSlippagePercent: '0.1',
    mevProtection: true,
    gasLevel: 'MEDIUM',
    status: 'prepared_not_submitted',
    requestFingerprint: fingerprintPlaceholder(),
    emergencyStopRecheckedAt: NOW,
    confirmationConsumedAt: NOW,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

type ConfirmationRow = ReturnType<typeof confirmationRow>;
type GateRow = ReturnType<typeof gateRow>;

function publicGate() {
  const { requestFingerprint: _requestFingerprint, ...row } = gateRow();
  void _requestFingerprint;
  return {
    ...row,
    atomicGateSatisfied: true,
    confirmationConsumed: true,
    providerSubmissionStarted: false,
    submissionAuthorized: false,
  };
}

function fingerprintPlaceholder(): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(command())))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}
