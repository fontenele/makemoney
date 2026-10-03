import 'dotenv/config';

import { PrismaService } from '../src/infrastructure/database/prisma.service';
import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../src/modules/real-trading/domain/real-execution';
import { assessRealExecutionPayloadCommitment } from '../src/modules/real-trading/application/real-execution-payload-commitment';
import {
  RealExecutionSubmissionGateBlockedError,
  RealExecutionSubmissionGateCommand,
} from '../src/modules/real-trading/application/real-execution-submission-gate-store';
import { AgenticWalletMarketSwapSubmissionReceiptConflictError } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-submission-receipt.store';
import { AgenticWalletMarketSwapSubmissionReceipt } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-submission-response';
import { AgenticWalletMarketSwapStatusObservationBlockedError } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-status-observation.store';
import { AgenticWalletMarketSwapStatusObservation } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-status-response';
import { PrismaAgenticWalletMarketSwapSubmissionReceiptStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-submission-receipt.store';
import { PrismaAgenticWalletMarketSwapStatusObservationStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-status-observation.store';
import { PrismaRealExecutionSubmissionGateStore } from '../src/modules/real-trading/infrastructure/prisma-real-execution-submission-gate.store';

const NOW = new Date('2026-10-03T12:00:04.000Z');

describe('Real execution submission gate persistence (e2e)', () => {
  let prisma: PrismaService;
  let store: PrismaRealExecutionSubmissionGateStore;
  let receiptStore: PrismaAgenticWalletMarketSwapSubmissionReceiptStore;
  let statusStore: PrismaAgenticWalletMarketSwapStatusObservationStore;

  beforeAll(async () => {
    prisma = new PrismaService(process.env.DATABASE_URL!);
    await prisma.onModuleInit();
    store = new PrismaRealExecutionSubmissionGateStore(prisma, () => NOW);
    receiptStore = new PrismaAgenticWalletMarketSwapSubmissionReceiptStore(
      prisma,
      () => new Date('2026-10-03T12:00:05.000Z'),
    );
    statusStore = new PrismaAgenticWalletMarketSwapStatusObservationStore(
      prisma,
      () => new Date('2026-10-03T12:00:06.000Z'),
    );
  });

  beforeEach(async () => {
    await cleanup();
    await seedPrerequisites();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.onModuleDestroy();
  });

  it('persists one inert atomic gate and replays it unchanged', async () => {
    const first = await store.create(command(10));
    const replay = await new PrismaRealExecutionSubmissionGateStore(
      prisma,
      () => new Date('2026-10-03T12:01:00.000Z'),
    ).create(command(10));

    expect(first).toMatchObject({
      replayed: false,
      gate: {
        id: uuid(10),
        status: 'prepared_not_submitted',
        payloadCommitmentDigest: commitmentDigest(),
        emergencyStopRecheckedAt: NOW,
        confirmationConsumedAt: NOW,
        expiresAt: new Date('2026-10-03T12:00:07.000Z'),
        atomicGateSatisfied: true,
        confirmationConsumed: true,
        providerSubmissionStarted: false,
        submissionAuthorized: false,
      },
    });
    expect(replay).toEqual({ gate: first.gate, replayed: true });
    await expect(prisma.realExecutionSubmissionGate.count()).resolves.toBe(1);
  });

  it('allows only one concurrent gate to consume a confirmation', async () => {
    const results = await Promise.allSettled([
      store.create(command(10)),
      store.create(command(11)),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    await expect(prisma.realExecutionSubmissionGate.count()).resolves.toBe(1);
  });

  it('blocks when the latest serialized emergency-stop state is active', async () => {
    await prisma.riskControlEvent.create({
      data: {
        id: 'real-trading-stop-active-2',
        control: 'emergency_stop',
        active: true,
        reason: 'test stop',
        changedAt: new Date('2026-10-03T12:00:03.000Z'),
      },
    });

    await expect(store.create(command(10))).rejects.toBeInstanceOf(
      RealExecutionSubmissionGateBlockedError,
    );
    await expect(prisma.realExecutionSubmissionGate.count()).resolves.toBe(0);
  });

  it('persists and exactly replays one gate-bound submission receipt', async () => {
    await store.create(command(10));

    const first = await receiptStore.record(submissionReceipt(10));
    const replay = await receiptStore.record(submissionReceipt(10));

    expect(first).toEqual({
      stored: {
        receipt: submissionReceipt(10),
        recordedAt: new Date('2026-10-03T12:00:05.000Z'),
      },
      replayed: false,
    });
    expect(replay).toEqual({ stored: first.stored, replayed: true });
    await expect(prisma.realExecutionSubmissionReceipt.count()).resolves.toBe(
      1,
    );
  });

  it('rejects changed order identity reuse for the same durable gate', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));

    await expect(
      receiptStore.record(
        submissionReceipt(10, { providerOrderId: 'different-order' }),
      ),
    ).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapSubmissionReceiptConflictError,
    );
    await expect(prisma.realExecutionSubmissionReceipt.count()).resolves.toBe(
      1,
    );
  });

  it('enforces the closed receipt state in PostgreSQL', async () => {
    await store.create(command(10));

    await expect(
      prisma.realExecutionSubmissionReceipt.create({
        data: {
          gateId: uuid(10),
          providerId: 'agentic_wallet',
          providerOrderId: '1234567890',
          lifecycleStatus: 'pending_confirmation',
          providerSubmissionAcknowledged: true,
          terminal: true,
          executionSucceeded: false,
          statusLookupRequired: true,
          automaticRetryAllowed: false,
          recordedAt: new Date('2026-10-03T12:00:05.000Z'),
        },
      }),
    ).rejects.toThrow();
    await expect(prisma.realExecutionSubmissionReceipt.count()).resolves.toBe(
      0,
    );
  });

  it('appends monotonic status history and exactly replays its latest fact', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));

    const first = await statusStore.record(statusObservation(10));
    const replay = await statusStore.record(statusObservation(10));
    const finished = statusObservation(10, {
      providerStatus: 'FINISHED',
      transactionHash: `0x${'a'.repeat(64)}`,
      updatedAt: new Date('2026-10-03T12:00:07.000Z'),
      terminal: true,
      executionSucceeded: true,
      statusLookupRequired: false,
    });
    const terminal = await statusStore.record(finished);

    expect(replay).toEqual({ stored: first.stored, replayed: true });
    expect(terminal).toMatchObject({
      stored: { observation: finished },
      replayed: false,
    });
    await expect(prisma.realExecutionStatusObservation.count()).resolves.toBe(
      2,
    );
  });

  it('rejects status regression without changing durable history', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));
    await statusStore.record(
      statusObservation(10, {
        providerStatus: 'FAILED',
        updatedAt: new Date('2026-10-03T12:00:07.000Z'),
        terminal: true,
        statusLookupRequired: false,
      }),
    );

    await expect(
      statusStore.record(statusObservation(10)),
    ).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapStatusObservationBlockedError,
    );
    await expect(prisma.realExecutionStatusObservation.count()).resolves.toBe(
      1,
    );
  });

  it('enforces closed status facts and exact receipt identity in PostgreSQL', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));

    await expect(
      prisma.realExecutionStatusObservation.create({
        data: {
          id: uuid(20),
          gateId: uuid(10),
          providerId: 'agentic_wallet',
          providerOrderId: 'different-order',
          providerStatus: 'PENDING',
          transactionHash: null,
          bookedAt: new Date('2026-10-03T12:00:05.000Z'),
          providerUpdatedAt: new Date('2026-10-03T12:00:06.000Z'),
          recordedAt: new Date('2026-10-03T12:00:06.000Z'),
        },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.realExecutionStatusObservation.create({
        data: {
          id: uuid(21),
          gateId: uuid(10),
          providerId: 'agentic_wallet',
          providerOrderId: '1234567890',
          providerStatus: 'FINISHED',
          transactionHash: null,
          bookedAt: new Date('2026-10-03T12:00:05.000Z'),
          providerUpdatedAt: new Date('2026-10-03T12:00:06.000Z'),
          recordedAt: new Date('2026-10-03T12:00:06.000Z'),
        },
      }),
    ).rejects.toThrow();
    await expect(prisma.realExecutionStatusObservation.count()).resolves.toBe(
      0,
    );
  });

  async function cleanup(): Promise<void> {
    await prisma.realExecutionStatusObservation.deleteMany();
    await prisma.realExecutionSubmissionReceipt.deleteMany();
    await prisma.realExecutionSubmissionGate.deleteMany();
    await prisma.realExecutionFinalConfirmation.deleteMany();
    await prisma.realExecutionRiskApproval.deleteMany();
    await prisma.realExecutionArm.deleteMany();
    await prisma.realExecutionReservation.deleteMany();
    await prisma.riskControlEvent.deleteMany({
      where: { control: 'emergency_stop' },
    });
  }

  async function seedPrerequisites(): Promise<void> {
    const digest = commitmentDigest();
    await prisma.realExecutionReservation.create({
      data: {
        id: '33333333-3333-4333-8333-333333333333',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: intent().id,
        quoteId: quote().id,
        idempotencyKey: 'submission-gate-e2e-1',
        requestFingerprint: 'a'.repeat(64),
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: digest,
        utcDay: new Date('2026-10-03T00:00:00.000Z'),
        budgetChargeUsdt: '5.105',
        sourceTokenAddress: intent().sourceAsset.tokenAddress,
        sourceSymbol: 'USDT',
        sourceQuantity: '5.005',
        nativeGasSymbol: 'BNB',
        nativeGasQuantity: '0.0002',
        providerQuotaUsd: '5.2',
        expiresAt: new Date('2026-10-03T12:00:12.000Z'),
        createdAt: new Date('2026-10-03T12:00:00.500Z'),
      },
    });
    await prisma.realExecutionArm.create({
      data: {
        id: '55555555-5555-4555-8555-555555555555',
        reservationId: '33333333-3333-4333-8333-333333333333',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: intent().id,
        quoteId: quote().id,
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: digest,
        acknowledgment: 'reservation_and_quote_reviewed',
        requestFingerprint: 'b'.repeat(64),
        requestedAt: new Date('2026-10-03T12:00:00.750Z'),
        expiresAt: new Date('2026-10-03T12:00:11.000Z'),
        createdAt: new Date('2026-10-03T12:00:01.000Z'),
      },
    });
    await prisma.realExecutionRiskApproval.create({
      data: {
        id: '77777777-7777-4777-8777-777777777777',
        reservationId: '33333333-3333-4333-8333-333333333333',
        armId: '55555555-5555-4555-8555-555555555555',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: intent().id,
        quoteId: quote().id,
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: digest,
        emergencyStopChangeId: 'real-trading-stop-clear-1',
        requestFingerprint: 'c'.repeat(64),
        revalidatedAt: new Date('2026-10-03T12:00:01.250Z'),
        expiresAt: new Date('2026-10-03T12:00:10.000Z'),
        createdAt: new Date('2026-10-03T12:00:01.500Z'),
      },
    });
    await prisma.realExecutionFinalConfirmation.create({
      data: {
        id: '88888888-8888-4888-8888-888888888888',
        approvalId: '77777777-7777-4777-8777-777777777777',
        reservationId: '33333333-3333-4333-8333-333333333333',
        armId: '55555555-5555-4555-8555-555555555555',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: intent().id,
        quoteId: quote().id,
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: digest,
        emergencyStopChangeId: 'real-trading-stop-clear-1',
        acknowledgment:
          'risk_approval_and_final_quote_reviewed_for_immediate_submission',
        requestFingerprint: 'd'.repeat(64),
        requestedAt: new Date('2026-10-03T12:00:01.750Z'),
        expiresAt: new Date('2026-10-03T12:00:08.000Z'),
        createdAt: new Date('2026-10-03T12:00:02.000Z'),
      },
    });
    await prisma.riskControlEvent.create({
      data: {
        id: 'real-trading-stop-clear-1',
        control: 'emergency_stop',
        active: false,
        reason: 'test clear',
        changedAt: new Date('2026-10-03T12:00:01.000Z'),
      },
    });
  }
});

function submissionReceipt(
  gateSeed: number,
  overrides: Partial<AgenticWalletMarketSwapSubmissionReceipt> = {},
): AgenticWalletMarketSwapSubmissionReceipt {
  return {
    kind: 'agentic_wallet_market_swap_submission_receipt',
    providerId: 'agentic_wallet',
    gateId: uuid(gateSeed),
    providerOrderId: '1234567890',
    lifecycleStatus: 'pending_confirmation',
    providerSubmissionAcknowledged: true,
    terminal: false,
    executionSucceeded: false,
    statusLookupRequired: true,
    automaticRetryAllowed: false,
    ...overrides,
  };
}

function statusObservation(
  gateSeed: number,
  overrides: Partial<AgenticWalletMarketSwapStatusObservation> = {},
): AgenticWalletMarketSwapStatusObservation {
  return {
    kind: 'agentic_wallet_market_swap_status_observation',
    providerId: 'agentic_wallet',
    gateId: uuid(gateSeed),
    providerOrderId: '1234567890',
    providerStatus: 'PENDING',
    transactionHash: null,
    bookedAt: new Date('2026-10-03T12:00:05.000Z'),
    updatedAt: new Date('2026-10-03T12:00:05.500Z'),
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

function command(seed: number): RealExecutionSubmissionGateCommand {
  return {
    id: uuid(seed),
    submissionPlan: {
      id: '99999999-9999-4999-8999-999999999999',
      confirmationId: '88888888-8888-4888-8888-888888888888',
      approvalId: '77777777-7777-4777-8777-777777777777',
      reservationId: '33333333-3333-4333-8333-333333333333',
      armId: '55555555-5555-4555-8555-555555555555',
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: intent().id,
      quoteId: quote().id,
      emergencyStopChangeId: 'real-trading-stop-clear-1',
      requestedAt: new Date('2026-10-03T12:00:03.000Z'),
      expiresAt: new Date('2026-10-03T12:00:07.000Z'),
      initialSubmissionOnly: true,
      automaticRetryAllowed: false,
    },
    intent: intent(),
    quote: quote(),
    emergencyStopPolicy: { snapshotMaxAgeMs: 1_000 },
  };
}

function intent(): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'submission-gate-e2e-1',
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

function quote(): RealExecutionQuote {
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
    quotedAt: new Date('2026-10-03T12:00:00.250Z'),
    expiresAt: new Date('2026-10-03T12:00:08.000Z'),
    executable: false,
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

function uuid(value: number): string {
  return `${value.toString(16).padStart(8, '0')}-0000-4000-8000-${value
    .toString(16)
    .padStart(12, '0')}`;
}
