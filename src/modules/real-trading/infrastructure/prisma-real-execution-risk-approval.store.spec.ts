import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  RealExecutionRiskApprovalArtifactNotFoundError,
  RealExecutionRiskApprovalBlockedError,
  RealExecutionRiskApprovalCommand,
  RealExecutionRiskApprovalIdempotencyConflictError,
  RealExecutionRiskApprovalIdentityConflictError,
} from '../application/real-execution-risk-approval-store';
import { PrismaRealExecutionRiskApprovalStore } from './prisma-real-execution-risk-approval.store';

const NOW = new Date('2026-10-02T14:00:05.000Z');
const CREATED_AT = new Date('2026-10-02T14:00:05.100Z');
const USDT = {
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
};
const BTCB = {
  tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  symbol: 'BTCB',
};

describe('PrismaRealExecutionRiskApprovalStore', () => {
  it('atomically reloads facts, revalidates, and persists one approval', async () => {
    const harness = repositoryHarness();
    harness.create.mockImplementation(({ data }) =>
      Promise.resolve(approvalRow(data)),
    );

    await expect(harness.store.approve(command())).resolves.toEqual({
      approval: publicApproval(),
      replayed: false,
    });
    expect(harness.tx.$executeRaw).toHaveBeenCalledTimes(2);
    expect(harness.tx.realExecutionReservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 101 }),
    );
    expect(harness.tx.riskControlEvent.findFirst).toHaveBeenCalledWith({
      where: { control: 'emergency_stop' },
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    });
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      id: command().request.id,
      reservationId: command().request.reservationId,
      armId: command().request.armId,
      emergencyStopChangeId: 'real-trading-stop-clear-1',
    });
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact approval after expiry without extending it', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionRiskApproval.findUnique.mockResolvedValue(
      approvalRow({ requestFingerprint: fingerprintPlaceholder() }),
    );
    // Obtain the actual deterministic fingerprint from a first creation.
    harness.tx.realExecutionRiskApproval.findUnique.mockResolvedValueOnce(null);
    harness.create.mockImplementation(({ data }) =>
      Promise.resolve(approvalRow(data)),
    );
    const first = await harness.store.approve(command());
    const stored = harness.create.mock.calls[0][0].data;
    harness.tx.realExecutionRiskApproval.findUnique.mockResolvedValue(
      approvalRow(stored),
    );

    await expect(
      new PrismaRealExecutionRiskApprovalStore(
        harness.prisma,
        () => new Date('2026-10-02T14:01:00.000Z'),
      ).approve(command()),
    ).resolves.toEqual({ approval: first.approval, replayed: true });
    expect(harness.create).toHaveBeenCalledTimes(1);
  });

  it('rejects conflicting approval ids and protected identity reuse', async () => {
    const idHarness = repositoryHarness();
    idHarness.tx.realExecutionRiskApproval.findUnique.mockResolvedValue(
      approvalRow({ requestFingerprint: '0'.repeat(64) }),
    );
    await expect(idHarness.store.approve(command())).rejects.toBeInstanceOf(
      RealExecutionRiskApprovalIdempotencyConflictError,
    );

    const identityHarness = repositoryHarness();
    identityHarness.tx.realExecutionRiskApproval.findFirst.mockResolvedValue({
      id: 'existing',
    });
    await expect(
      identityHarness.store.approve(command()),
    ).rejects.toBeInstanceOf(RealExecutionRiskApprovalIdentityConflictError);
    expect(identityHarness.create).not.toHaveBeenCalled();
  });

  it('fails closed when a durable prerequisite is absent', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionArm.findUnique.mockResolvedValue(null);

    await expect(harness.store.approve(command())).rejects.toBeInstanceOf(
      RealExecutionRiskApprovalArtifactNotFoundError,
    );
    expect(
      harness.tx.realExecutionRiskApproval.findFirst,
    ).not.toHaveBeenCalled();
  });

  it('fails closed without a persisted inactive emergency-stop event', async () => {
    const missing = repositoryHarness();
    missing.tx.riskControlEvent.findFirst.mockResolvedValue(null);
    await expectBlocked(missing.store, ['emergency_stop_blocked']);

    const active = repositoryHarness();
    active.tx.riskControlEvent.findFirst.mockResolvedValue(
      emergencyStopRow({ active: true }),
    );
    await expectBlocked(active.store, ['emergency_stop_blocked']);
  });

  it('rechecks current reservation economics inside the transaction', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionReservation.findUnique.mockResolvedValue(
      reservationRow({ budgetChargeUsdt: '5.106' }),
    );
    harness.tx.realExecutionReservation.findMany.mockResolvedValue([
      reservationRow({ budgetChargeUsdt: '5.106' }),
    ]);

    await expectBlocked(harness.store, ['reservation_facts_changed']);
    expect(harness.create).not.toHaveBeenCalled();
  });
});

async function expectBlocked(
  store: PrismaRealExecutionRiskApprovalStore,
  blockers: string[],
): Promise<void> {
  let caught: unknown;
  try {
    await store.approve(command());
  } catch (error: unknown) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RealExecutionRiskApprovalBlockedError);
  if (!(caught instanceof RealExecutionRiskApprovalBlockedError)) throw caught;
  expect(caught.blockers).toEqual(expect.arrayContaining(blockers));
}

function repositoryHarness() {
  const executeRaw = jest.fn<() => Promise<number>>().mockResolvedValue(1);
  const approvalFindUnique = jest
    .fn<() => Promise<ApprovalRow | null>>()
    .mockResolvedValue(null);
  const approvalFindFirst = jest
    .fn<() => Promise<{ id: string } | null>>()
    .mockResolvedValue(null);
  const create =
    jest.fn<
      (args: { data: Record<string, unknown> }) => Promise<ApprovalRow>
    >();
  const reservationFindUnique = jest
    .fn<() => Promise<ReservationRow | null>>()
    .mockResolvedValue(reservationRow());
  const reservationFindMany = jest
    .fn<() => Promise<ReservationRow[]>>()
    .mockResolvedValue([reservationRow()]);
  const armFindUnique = jest
    .fn<() => Promise<ArmRow | null>>()
    .mockResolvedValue(armRow());
  const emergencyFindFirst = jest
    .fn<() => Promise<EmergencyStopRow | null>>()
    .mockResolvedValue(emergencyStopRow());
  const tx = {
    $executeRaw: executeRaw,
    realExecutionRiskApproval: {
      findUnique: approvalFindUnique,
      findFirst: approvalFindFirst,
      create,
    },
    realExecutionReservation: {
      findUnique: reservationFindUnique,
      findMany: reservationFindMany,
    },
    realExecutionArm: { findUnique: armFindUnique },
    riskControlEvent: { findFirst: emergencyFindFirst },
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
    store: new PrismaRealExecutionRiskApprovalStore(prisma, () => NOW),
  };
}

function command(): RealExecutionRiskApprovalCommand {
  const intent = {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'risk-approval-1',
    kind: 'market_swap' as const,
    chainId: '56',
    sourceAsset: USDT,
    targetAsset: BTCB,
    sourceQuantity: '5',
    maxSlippageRate: '0.001',
    createdAt: new Date('2026-10-02T13:59:59.000Z'),
  };
  return {
    request: {
      id: '77777777-7777-4777-8777-777777777777',
      reservationId: '33333333-3333-4333-8333-333333333333',
      armId: '55555555-5555-4555-8555-555555555555',
    },
    intent,
    quote: {
      id: '22222222-2222-4222-8222-222222222222',
      providerId: 'agentic_wallet',
      providerQuoteId: null,
      intent,
      expectedTargetQuantity: '0.000062',
      minimumTargetQuantity: '0.000061938',
      costs: [
        { kind: 'provider_fee', asset: USDT, quantity: '0.005' },
        { kind: 'network_fee', asset: USDT, quantity: '0.1' },
      ],
      costCoverage: 'complete',
      quotedAt: new Date('2026-10-02T14:00:01.000Z'),
      expiresAt: new Date('2026-10-02T14:00:08.000Z'),
      executable: false,
    },
    limits: {
      maximumOrderNotionalUsdt: '8',
      maximumDailySpendUsdt: '20',
      maximumBankrollUsdt: '25',
      maximumProviderFeeRate: '0.01',
      maximumNetworkFeeUsdt: '0.5',
      maximumSlippageRate: '0.005',
    },
    budgetSnapshot: {
      providerId: 'agentic_wallet',
      chainId: '56',
      utcDay: '2026-10-02',
      settledSpendUsdt: '2',
      reservedSpendUsdt: '5.105',
      spendCoverage: 'complete',
      bankrollValueUsdt: '12',
      bankrollCoverage: 'complete',
      observedAt: new Date('2026-10-02T14:00:04.000Z'),
    },
    resourceSnapshot: {
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: intent.id,
      quoteId: '22222222-2222-4222-8222-222222222222',
      sourceTokenAddress: USDT.tokenAddress,
      sourceSymbol: 'USDT',
      sourceAvailableQuantity: '6',
      sourceBalanceCoverage: 'complete',
      nativeGasSymbol: 'BNB',
      nativeGasAvailableQuantity: '0.001',
      nativeGasRequiredQuantity: '0.0002',
      nativeGasCoverage: 'complete',
      observedAt: new Date('2026-10-02T14:00:04.000Z'),
    },
    quotaSnapshot: {
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: intent.id,
      quoteId: '22222222-2222-4222-8222-222222222222',
      utcDay: '2026-10-02',
      dailyLimitUsd: '1000',
      usedUsd: '100',
      remainingUsd: '900',
      quotaCoverage: 'complete',
      requiredUsd: '5.2',
      requirementValuationBasis: 'explicit_external_usd_value',
      requirementCoverage: 'complete',
      quotaObservedAt: new Date('2026-10-02T14:00:04.000Z'),
      requirementValuedAt: new Date('2026-10-02T14:00:04.000Z'),
    },
    policy: {
      budgetSnapshotMaxAgeMs: 5_000,
      resourceSnapshotMaxAgeMs: 5_000,
      quotaSnapshotMaxAgeMs: 5_000,
      requirementValuationMaxAgeMs: 5_000,
      reservationSnapshotMaxAgeMs: 5_000,
      emergencyStopSnapshotMaxAgeMs: 5_000,
    },
  };
}

function reservationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    idempotencyKey: 'risk-approval-1',
    requestFingerprint: 'a'.repeat(64),
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'c'.repeat(64),
    utcDay: new Date('2026-10-02T00:00:00.000Z'),
    budgetChargeUsdt: '5.105',
    sourceTokenAddress: USDT.tokenAddress,
    sourceSymbol: 'USDT',
    sourceQuantity: '5.005',
    nativeGasSymbol: 'BNB',
    nativeGasQuantity: '0.0002',
    providerQuotaUsd: '5.2',
    expiresAt: new Date('2026-10-02T14:00:08.000Z'),
    createdAt: new Date('2026-10-02T14:00:02.000Z'),
    ...overrides,
  };
}

function armRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    reservationId: '33333333-3333-4333-8333-333333333333',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    acknowledgment: 'reservation_and_quote_reviewed',
    requestFingerprint: 'b'.repeat(64),
    requestedAt: new Date('2026-10-02T14:00:03.000Z'),
    expiresAt: new Date('2026-10-02T14:00:07.000Z'),
    createdAt: new Date('2026-10-02T14:00:04.000Z'),
    ...overrides,
  };
}

function emergencyStopRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'real-trading-stop-clear-1',
    control: 'emergency_stop',
    active: false,
    reason: 'operator cleared before arming',
    changedAt: new Date('2026-10-02T13:59:00.000Z'),
    ...overrides,
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
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    requestFingerprint: fingerprintPlaceholder(),
    revalidatedAt: NOW,
    expiresAt: new Date('2026-10-02T14:00:07.000Z'),
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function fingerprintPlaceholder(): string {
  return 'c'.repeat(64);
}

type ReservationRow = ReturnType<typeof reservationRow>;
type ArmRow = ReturnType<typeof armRow>;
type EmergencyStopRow = ReturnType<typeof emergencyStopRow>;
type ApprovalRow = ReturnType<typeof approvalRow>;

function publicApproval() {
  const { request } = command();
  return {
    id: request.id,
    reservationId: request.reservationId,
    armId: request.armId,
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    revalidatedAt: NOW,
    expiresAt: new Date('2026-10-02T14:00:07.000Z'),
    createdAt: CREATED_AT,
    riskApproved: true,
    confirmationRecorded: false,
    submissionAuthorized: false,
  };
}
