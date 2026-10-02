import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { RealExecutionFinalConfirmationCommand } from '../application/real-execution-final-confirmation-store';
import {
  RealExecutionFinalConfirmationApprovalNotFoundError,
  RealExecutionFinalConfirmationIdempotencyConflictError,
  RealExecutionFinalConfirmationIdentityConflictError,
  RealExecutionFinalConfirmationPlanError,
} from '../application/real-execution-final-confirmation-store';
import { PrismaRealExecutionFinalConfirmationStore } from './prisma-real-execution-final-confirmation.store';

const NOW = new Date('2026-10-02T15:00:05.000Z');
const CREATED_AT = new Date('2026-10-02T15:00:05.100Z');

describe('PrismaRealExecutionFinalConfirmationStore', () => {
  it('reloads the approval, reapplies M10.24, and persists confirmation', async () => {
    const harness = repositoryHarness();
    harness.create.mockImplementation(({ data }) =>
      Promise.resolve(confirmationRow(data)),
    );

    await expect(harness.store.confirm(command())).resolves.toEqual({
      confirmation: publicConfirmation(),
      replayed: false,
    });
    expect(harness.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(
      harness.tx.realExecutionRiskApproval.findUnique,
    ).toHaveBeenCalledWith({ where: { id: command().request.approvalId } });
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      id: command().request.id,
      approvalId: command().request.approvalId,
      emergencyStopChangeId: 'real-trading-stop-clear-1',
    });
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact confirmation after expiry without extending it', async () => {
    const harness = repositoryHarness();
    harness.create.mockImplementation(({ data }) =>
      Promise.resolve(confirmationRow(data)),
    );
    const first = await harness.store.confirm(command());
    const stored = harness.create.mock.calls[0][0].data;
    harness.tx.realExecutionFinalConfirmation.findUnique.mockResolvedValue(
      confirmationRow(stored),
    );

    await expect(
      new PrismaRealExecutionFinalConfirmationStore(
        harness.prisma,
        () => new Date('2026-10-02T15:01:00.000Z'),
      ).confirm(command()),
    ).resolves.toEqual({ confirmation: first.confirmation, replayed: true });
    expect(harness.create).toHaveBeenCalledTimes(1);
  });

  it('fails closed when replaying a legacy confirmation without a payload commitment', async () => {
    const harness = repositoryHarness();
    harness.create.mockImplementation(({ data }) =>
      Promise.resolve(confirmationRow(data)),
    );
    await harness.store.confirm(command());
    const stored = harness.create.mock.calls[0][0].data;
    harness.tx.realExecutionFinalConfirmation.findUnique.mockResolvedValue(
      confirmationRow({
        ...stored,
        payloadCommitmentVersion: null,
        payloadCommitmentDigest: null,
      }),
    );

    await expect(harness.store.confirm(command())).rejects.toThrow(
      'Persisted final confirmation has invalid payload commitment',
    );
  });

  it('rejects conflicting confirmation ids and protected identity reuse', async () => {
    const idHarness = repositoryHarness();
    idHarness.tx.realExecutionFinalConfirmation.findUnique.mockResolvedValue(
      confirmationRow({ requestFingerprint: '0'.repeat(64) }),
    );
    await expect(idHarness.store.confirm(command())).rejects.toBeInstanceOf(
      RealExecutionFinalConfirmationIdempotencyConflictError,
    );

    const identityHarness = repositoryHarness();
    identityHarness.tx.realExecutionFinalConfirmation.findFirst.mockResolvedValue(
      { id: 'existing' },
    );
    await expect(
      identityHarness.store.confirm(command()),
    ).rejects.toBeInstanceOf(
      RealExecutionFinalConfirmationIdentityConflictError,
    );
    expect(identityHarness.create).not.toHaveBeenCalled();
  });

  it('fails closed when the durable approval is absent', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionRiskApproval.findUnique.mockResolvedValue(null);

    await expect(harness.store.confirm(command())).rejects.toBeInstanceOf(
      RealExecutionFinalConfirmationApprovalNotFoundError,
    );
    expect(
      harness.tx.realExecutionFinalConfirmation.findFirst,
    ).not.toHaveBeenCalled();
  });

  it('fails closed when the durable approval has no payload commitment', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionRiskApproval.findUnique.mockResolvedValue(
      approvalRow({
        payloadCommitmentVersion: null,
        payloadCommitmentDigest: null,
      }),
    );

    await expect(harness.store.confirm(command())).rejects.toThrow(
      'Persisted real execution risk approval has invalid payload commitment',
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rechecks approval identity and expiry inside the transaction', async () => {
    const changed = repositoryHarness();
    changed.tx.realExecutionRiskApproval.findUnique.mockResolvedValue(
      approvalRow({ quoteId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    );
    await expectBlocked(changed.store, ['confirmation_quote_mismatch']);

    const expired = repositoryHarness();
    expired.tx.realExecutionRiskApproval.findUnique.mockResolvedValue(
      approvalRow({ expiresAt: NOW }),
    );
    await expectBlocked(expired.store, ['approval_expired']);
  });
});

async function expectBlocked(
  store: PrismaRealExecutionFinalConfirmationStore,
  blockers: string[],
): Promise<void> {
  let caught: unknown;
  try {
    await store.confirm(command());
  } catch (error: unknown) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RealExecutionFinalConfirmationPlanError);
  if (!(caught instanceof RealExecutionFinalConfirmationPlanError)) {
    throw caught;
  }
  expect(caught.blockers).toEqual(expect.arrayContaining(blockers));
}

function repositoryHarness() {
  const executeRaw = jest.fn<() => Promise<number>>().mockResolvedValue(1);
  const confirmationFindUnique = jest
    .fn<() => Promise<ConfirmationRow | null>>()
    .mockResolvedValue(null);
  const confirmationFindFirst = jest
    .fn<() => Promise<{ id: string } | null>>()
    .mockResolvedValue(null);
  const create =
    jest.fn<
      (args: { data: Record<string, unknown> }) => Promise<ConfirmationRow>
    >();
  const approvalFindUnique = jest
    .fn<() => Promise<ApprovalRow | null>>()
    .mockResolvedValue(approvalRow());
  const tx = {
    $executeRaw: executeRaw,
    realExecutionFinalConfirmation: {
      findUnique: confirmationFindUnique,
      findFirst: confirmationFindFirst,
      create,
    },
    realExecutionRiskApproval: { findUnique: approvalFindUnique },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    tx,
    prisma,
    create,
    prismaTransaction,
    store: new PrismaRealExecutionFinalConfirmationStore(prisma, () => NOW),
  };
}

function command(): RealExecutionFinalConfirmationCommand {
  return {
    request: {
      id: '88888888-8888-4888-8888-888888888888',
      approvalId: '77777777-7777-4777-8777-777777777777',
      reservationId: '33333333-3333-4333-8333-333333333333',
      armId: '55555555-5555-4555-8555-555555555555',
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: '11111111-1111-4111-8111-111111111111',
      quoteId: '22222222-2222-4222-8222-222222222222',
      emergencyStopChangeId: 'real-trading-stop-clear-1',
      acknowledgment:
        'risk_approval_and_final_quote_reviewed_for_immediate_submission',
      requestedAt: new Date('2026-10-02T15:00:04.000Z'),
      expiresAt: new Date('2026-10-02T15:00:09.000Z'),
    },
    policy: {
      requestMaxAgeMs: 5_000,
      maximumConfirmationLifetimeMs: 10_000,
    },
  };
}

function approvalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'c'.repeat(64),
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    requestFingerprint: 'a'.repeat(64),
    revalidatedAt: new Date('2026-10-02T15:00:02.000Z'),
    expiresAt: new Date('2026-10-02T15:00:10.000Z'),
    createdAt: new Date('2026-10-02T15:00:03.000Z'),
    ...overrides,
  };
}

function confirmationRow(overrides: Record<string, unknown> = {}) {
  return {
    ...command().request,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'c'.repeat(64),
    requestFingerprint: 'b'.repeat(64),
    createdAt: CREATED_AT,
    ...overrides,
  };
}

type ApprovalRow = ReturnType<typeof approvalRow>;
type ConfirmationRow = ReturnType<typeof confirmationRow>;

function publicConfirmation() {
  return {
    ...command().request,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'c'.repeat(64),
    createdAt: CREATED_AT,
    riskApproved: true,
    confirmationRecorded: true,
    emergencyStopRecheckedForSubmission: false,
    submissionAuthorized: false,
  };
}
