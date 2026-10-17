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
import { AgenticWalletMarketSwapFinancialReconciliationEvidence } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-financial-reconciliation-evidence';
import { AgenticWalletMarketSwapAccountingBalanceEvidence } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-accounting-balance-evidence';
import {
  ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
  authorizeAgenticWalletMarketSwapAccountingMutation,
} from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-accounting-mutation-authorization';
import {
  ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
  prepareAgenticWalletMarketSwapAccountingMutationApplication,
} from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-accounting-mutation-application';
import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-accounting-mutation-commitment';
import { assessAgenticWalletMarketSwapAccountingMutationPlan } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-accounting-mutation-plan';
import { decideAgenticWalletMarketSwapStatusLookup } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-status-lookup-decision';
import { AgenticWalletMarketSwapStatusObservation } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-status-response';
import { AgenticWalletMarketSwapStatusReconciliationAttempt } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-status-reconciliation-attempt';
import { AgenticWalletMarketSwapStatusReconciliationCycle } from '../src/modules/real-trading/infrastructure/agentic-wallet-market-swap-status-reconciliation-cycle';
import { PrismaAgenticWalletMarketSwapSubmissionReceiptStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-submission-receipt.store';
import { PrismaAgenticWalletMarketSwapReconciliationStateStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-reconciliation-state.store';
import { PrismaAgenticWalletMarketSwapStatusObservationStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-status-observation.store';
import { PrismaAgenticWalletMarketSwapStatusReconciliationContextStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-status-reconciliation-context.store';
import { PrismaAgenticWalletMarketSwapStatusReconciliationCandidateStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-status-reconciliation-candidate.store';
import { PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-financial-reconciliation-evidence.store';
import { PrismaAgenticWalletMarketSwapFinancialReconciliationCompletionStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-financial-reconciliation-completion.store';
import { PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-accounting-balance-evidence.store';
import { PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-accounting-balance-evidence-read.store';
import { PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-accounting-mutation-commitment.store';
import { PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-accounting-mutation-authorization.store';
import { PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-accounting-mutation-authorization-read.store';
import { PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-accounting-mutation-application.store';
import { PrismaAgenticWalletMarketSwapAccountingMutationApplicationReadStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-market-swap-accounting-mutation-application-read.store';
import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
} from '../src/modules/real-trading/infrastructure/agentic-wallet-accounting-balance-initialization';
import { PrismaAgenticWalletAccountingBalanceInitializationStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-accounting-balance-initialization.store';
import { PrismaAgenticWalletAccountingBalanceInitializationReadStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-accounting-balance-initialization-read.store';
import { PrismaAgenticWalletAccountingLedgerSnapshotReadStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-accounting-ledger-snapshot.store';
import { AgenticWalletAccountingLedgerReconciliationService } from '../src/modules/real-trading/infrastructure/agentic-wallet-accounting-ledger-reconciliation.service';
import { AgenticWalletAccountingLedgerReconciliationAttempt } from '../src/modules/real-trading/infrastructure/agentic-wallet-accounting-ledger-reconciliation-attempt';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from '../src/modules/real-trading/infrastructure/agentic-wallet-accounting-ledger-reconciliation-commitment';
import { AgenticWalletCapabilityObservation } from '../src/modules/real-trading/infrastructure/agentic-wallet-capability.adapter';
import { PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore } from '../src/modules/real-trading/infrastructure/prisma-agentic-wallet-accounting-ledger-reconciliation-commitment.store';
import { PrismaRealExecutionSubmissionGateStore } from '../src/modules/real-trading/infrastructure/prisma-real-execution-submission-gate.store';

const NOW = new Date('2026-10-03T12:00:04.000Z');
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('Real execution submission gate persistence (e2e)', () => {
  let prisma: PrismaService;
  let store: PrismaRealExecutionSubmissionGateStore;
  let receiptStore: PrismaAgenticWalletMarketSwapSubmissionReceiptStore;
  let statusStore: PrismaAgenticWalletMarketSwapStatusObservationStore;
  let reconciliationStore: PrismaAgenticWalletMarketSwapReconciliationStateStore;
  let reconciliationContextStore: PrismaAgenticWalletMarketSwapStatusReconciliationContextStore;
  let reconciliationCandidateStore: PrismaAgenticWalletMarketSwapStatusReconciliationCandidateStore;
  let financialEvidenceStore: PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore;
  let financialCompletionStore: PrismaAgenticWalletMarketSwapFinancialReconciliationCompletionStore;
  let accountingBalanceEvidenceStore: PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore;
  let accountingBalanceEvidenceReadStore: PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore;
  let accountingMutationCommitmentStore: PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore;
  let accountingMutationAuthorizationStore: PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore;
  let accountingMutationAuthorizationReadStore: PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore;
  let accountingMutationApplicationStore: PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore;
  let accountingMutationApplicationReadStore: PrismaAgenticWalletMarketSwapAccountingMutationApplicationReadStore;
  let accountingBalanceInitializationStore: PrismaAgenticWalletAccountingBalanceInitializationStore;
  let accountingBalanceInitializationReadStore: PrismaAgenticWalletAccountingBalanceInitializationReadStore;
  let accountingLedgerSnapshotReadStore: PrismaAgenticWalletAccountingLedgerSnapshotReadStore;
  let accountingLedgerReconciliationService: AgenticWalletAccountingLedgerReconciliationService;
  let accountingLedgerReconciliationCommitmentStore: PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore;

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
    reconciliationStore =
      new PrismaAgenticWalletMarketSwapReconciliationStateStore(prisma);
    reconciliationContextStore =
      new PrismaAgenticWalletMarketSwapStatusReconciliationContextStore(prisma);
    reconciliationCandidateStore =
      new PrismaAgenticWalletMarketSwapStatusReconciliationCandidateStore(
        prisma,
      );
    financialEvidenceStore =
      new PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore(
        prisma,
        () => new Date('2026-10-03T12:00:08.000Z'),
        () => uuid(23),
      );
    financialCompletionStore =
      new PrismaAgenticWalletMarketSwapFinancialReconciliationCompletionStore(
        prisma,
      );
    accountingBalanceEvidenceStore =
      new PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore(
        prisma,
        () => new Date('2026-10-03T12:00:10.000Z'),
        () => uuid(24),
      );
    accountingBalanceEvidenceReadStore =
      new PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore(
        prisma,
      );
    accountingMutationCommitmentStore =
      new PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore(
        prisma,
        () => new Date('2026-10-03T12:00:12.000Z'),
      );
    accountingMutationAuthorizationStore =
      new PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore(
        prisma,
        () => new Date('2026-10-03T12:00:14.000Z'),
      );
    accountingMutationAuthorizationReadStore =
      new PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore(
        prisma,
      );
    accountingMutationApplicationStore =
      new PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore(
        prisma,
        () => new Date('2026-10-03T12:00:17.000Z'),
      );
    accountingMutationApplicationReadStore =
      new PrismaAgenticWalletMarketSwapAccountingMutationApplicationReadStore(
        prisma,
      );
    accountingBalanceInitializationStore =
      new PrismaAgenticWalletAccountingBalanceInitializationStore(
        prisma,
        () => new Date('2026-10-03T12:00:03.000Z'),
      );
    accountingBalanceInitializationReadStore =
      new PrismaAgenticWalletAccountingBalanceInitializationReadStore(prisma);
    accountingLedgerSnapshotReadStore =
      new PrismaAgenticWalletAccountingLedgerSnapshotReadStore(prisma);
    accountingLedgerReconciliationService =
      new AgenticWalletAccountingLedgerReconciliationService(
        accountingLedgerSnapshotReadStore,
      );
    accountingLedgerReconciliationCommitmentStore =
      new PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore(
        prisma,
        () => new Date('2026-10-03T12:00:05.000Z'),
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

  it('atomically initializes trusted accounting balances once and replays the receipt', async () => {
    const initialization = accountingBalanceInitialization();

    const first =
      await accountingBalanceInitializationStore.initialize(initialization);
    const replay =
      await accountingBalanceInitializationStore.initialize(initialization);

    expect(first).toMatchObject({
      replayed: false,
      initialized: {
        initialization: { initializationId: uuid(29) },
        initializedAt: new Date('2026-10-03T12:00:03.000Z'),
        accountingBalancesInitialized: true,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
    });
    expect(replay).toEqual({ initialized: first.initialized, replayed: true });
    await expect(
      accountingBalanceInitializationReadStore.getByInitializationId(uuid(29)),
    ).resolves.toEqual(first.initialized);
    await expect(
      accountingLedgerSnapshotReadStore.getByInitializationId(
        uuid(29),
        new Date('2026-10-03T12:00:04.000Z'),
      ),
    ).resolves.toMatchObject({
      initializationId: uuid(29),
      currentBalances: [
        { assetType: 'native', currentQuantity: '2' },
        { assetType: 'token', assetAddress: USDT, currentQuantity: '1000.5' },
        { assetType: 'token', assetAddress: BTCB, currentQuantity: '0.125' },
      ],
      ledgerCoverageComplete: true,
      accountingBalancesInitialized: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    await expect(
      accountingLedgerReconciliationService.reconcile(
        uuid(29),
        accountingBalanceObservation(),
        {
          maximumObservationAgeMs: 5_000,
          evaluatedAt: new Date('2026-10-03T12:00:04.000Z'),
        },
      ),
    ).resolves.toMatchObject({
      status: 'accounting_ledger_reconciled',
      blockers: [],
      reconciliation: {
        initializationId: uuid(29),
        ledgerBalancesReconciled: true,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
    });
    const attemptTimes = [
      new Date('2026-10-03T12:00:03.500Z'),
      new Date('2026-10-03T12:00:04.000Z'),
    ];
    const reconciliationAttempt =
      new AgenticWalletAccountingLedgerReconciliationAttempt(
        {
          load: (_chainId, observedAt) =>
            Promise.resolve({
              ...accountingBalanceObservation(),
              capabilities: {
                ...accountingBalanceObservation().capabilities,
                observedAt: new Date(observedAt),
              },
            }),
        },
        accountingLedgerReconciliationService,
        () => new Date(attemptTimes.shift()!),
      );
    await expect(
      reconciliationAttempt.run(uuid(29), 5_000),
    ).resolves.toMatchObject({
      status: 'accounting_ledger_reconciled',
      blockers: [],
      reconciliation: { ledgerBalancesReconciled: true },
    });
    await expect(
      prisma.realExecutionAccountingBalance.findMany({
        orderBy: { assetIdentity: 'asc' },
      }),
    ).resolves.toMatchObject([
      { assetIdentity: 'native:BNB', quantity: '2' },
      {
        assetIdentity: 'token:0x55d398326f99059ff775485246999027b3197955',
        quantity: '1000.5',
      },
      {
        assetIdentity: 'token:0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
        quantity: '0.125',
      },
    ]);
    await expect(
      prisma.realExecutionAccountingBalanceInitialization.count(),
    ).resolves.toBe(1);
  });

  it('immutably records one durable accounting ledger reconciliation commitment', async () => {
    await accountingBalanceInitializationStore.initialize(
      accountingBalanceInitialization(),
    );
    const assessment = await accountingLedgerReconciliationService.reconcile(
      uuid(29),
      accountingBalanceObservation(),
      {
        maximumObservationAgeMs: 5_000,
        evaluatedAt: new Date('2026-10-03T12:00:04.000Z'),
      },
    );
    if (assessment === null || assessment.reconciliation === null)
      throw new Error('Test reconciliation was blocked');
    const prepared =
      prepareAgenticWalletAccountingLedgerReconciliationCommitment(
        assessment.reconciliation,
        uuid(30),
        new Date('2026-10-03T12:00:04.500Z'),
      ).commitment;
    if (prepared === null) throw new Error('Test commitment was blocked');

    const first =
      await accountingLedgerReconciliationCommitmentStore.record(prepared);
    const replay =
      await accountingLedgerReconciliationCommitmentStore.record(prepared);

    expect(first).toMatchObject({
      replayed: false,
      stored: {
        commitment: {
          reconciliationId: uuid(30),
          reconciliationFingerprint: prepared.reconciliationFingerprint,
          ledgerBalancesReconciled: true,
          quoteAuthorized: false,
          submissionAuthorized: false,
        },
        recordedAt: new Date('2026-10-03T12:00:05.000Z'),
      },
    });
    expect(replay).toEqual({ stored: first.stored, replayed: true });
    await expect(
      prisma.realExecutionAccountingLedgerReconciliation.count(),
    ).resolves.toBe(1);
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

  it('returns no reconciliation state without a durable receipt', async () => {
    await expect(reconciliationStore.getByGateId(uuid(10))).resolves.toBeNull();
  });

  it('projects durable receipt and latest status without claiming financial completion', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));

    const awaiting = await reconciliationStore.getByGateId(uuid(10));
    expect(awaiting).toMatchObject({
      phase: 'awaiting_status_observation',
      providerStatus: null,
      statusLookupRequired: true,
      financialReconciliationComplete: false,
      actualReceivedQuantity: null,
      submissionRetryAllowed: false,
    });
    if (awaiting === null) throw new Error('expected reconciliation state');
    expect(decideAgenticWalletMarketSwapStatusLookup(awaiting)).toMatchObject({
      status: 'status_command_preview_ready',
      statusLookupRequired: true,
      providerCallStarted: false,
    });

    await statusStore.record(statusObservation(10));
    await expect(
      reconciliationStore.getByGateId(uuid(10)),
    ).resolves.toMatchObject({
      phase: 'provider_pending',
      providerStatus: 'PENDING',
      statusLookupRequired: true,
      executionSucceeded: false,
    });

    const transactionHash = `0x${'a'.repeat(64)}`;
    await statusStore.record(
      statusObservation(10, {
        providerStatus: 'FINISHED',
        transactionHash,
        updatedAt: new Date('2026-10-03T12:00:07.000Z'),
        terminal: true,
        executionSucceeded: true,
        statusLookupRequired: false,
      }),
    );
    const finished = await reconciliationStore.getByGateId(uuid(10));
    expect(finished).toMatchObject({
      phase: 'provider_finished_financial_reconciliation_required',
      providerStatus: 'FINISHED',
      transactionHash,
      statusLookupRequired: false,
      executionSucceeded: true,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      actualReceivedQuantity: null,
      submissionRetryAllowed: false,
    });
    if (finished === null) throw new Error('expected reconciliation state');
    expect(decideAgenticWalletMarketSwapStatusLookup(finished)).toMatchObject({
      status: 'status_lookup_not_required',
      command: null,
      statusLookupRequired: false,
      providerCallStarted: false,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
  });

  it('loads the exact durable status reconciliation context in one read model', async () => {
    await store.create(command(10));
    await expect(
      reconciliationContextStore.getByGateId(uuid(10)),
    ).resolves.toBeNull();

    const storedReceipt = await receiptStore.record(submissionReceipt(10));
    await statusStore.record(statusObservation(10));

    await expect(
      reconciliationContextStore.getByGateId(uuid(10)),
    ).resolves.toMatchObject({
      gate: {
        id: uuid(10),
        providerId: 'agentic_wallet',
        providerSubmissionStarted: false,
        submissionAuthorized: false,
      },
      submissionReceipt: storedReceipt.stored,
      reconciliationState: {
        gateId: uuid(10),
        providerOrderId: '1234567890',
        phase: 'provider_pending',
        providerStatus: 'PENDING',
        statusLookupRequired: true,
        financialReconciliationComplete: false,
        submissionRetryAllowed: false,
      },
    });
  });

  it('runs one durable-context reconciliation attempt and stops after terminal evidence', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));
    let lookupCalls = 0;
    const attempt = new AgenticWalletMarketSwapStatusReconciliationAttempt(
      reconciliationContextStore,
      {
        run: () => {
          lookupCalls += 1;
          return Promise.resolve(finishedStatusLookupResponse());
        },
      },
      statusStore,
      () => new Date('2026-10-03T12:00:07.000Z'),
      1_000,
    );

    await expect(attempt.reconcileOnce(uuid(10))).resolves.toMatchObject({
      status: 'status_observation_recorded',
      providerCallStarted: true,
      providerCallCompleted: true,
      statusLookupRequired: false,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
    await expect(attempt.reconcileOnce(uuid(10))).resolves.toMatchObject({
      status: 'status_lookup_not_required',
      providerCallStarted: false,
      providerCallCompleted: false,
      statusLookupRequired: false,
    });
    expect(lookupCalls).toBe(1);
    await expect(prisma.realExecutionStatusObservation.count()).resolves.toBe(
      1,
    );
  });

  it('lists only bounded durable reconciliation candidates whose cadence is due', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));

    await expect(
      reconciliationCandidateStore.listDue({
        evaluatedAt: new Date('2026-10-03T12:00:05.000Z'),
        minimumLookupIntervalMs: 1_000,
        limit: 1,
      }),
    ).resolves.toMatchObject([
      {
        gateId: uuid(10),
        phase: 'awaiting_status_observation',
        eligibleAt: new Date('2026-10-03T12:00:05.000Z'),
      },
    ]);

    await statusStore.record(statusObservation(10));
    await expect(
      reconciliationCandidateStore.listDue({
        evaluatedAt: new Date('2026-10-03T12:00:06.999Z'),
        minimumLookupIntervalMs: 1_000,
        limit: 1,
      }),
    ).resolves.toEqual([]);
    await expect(
      reconciliationCandidateStore.listDue({
        evaluatedAt: new Date('2026-10-03T12:00:07.000Z'),
        minimumLookupIntervalMs: 1_000,
        limit: 1,
      }),
    ).resolves.toMatchObject([
      {
        gateId: uuid(10),
        phase: 'provider_pending',
        latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
        latestObservationTransactionHash: null,
        latestObservationBookedAt: new Date('2026-10-03T12:00:05.000Z'),
        latestObservationUpdatedAt: new Date('2026-10-03T12:00:05.500Z'),
        eligibleAt: new Date('2026-10-03T12:00:07.000Z'),
      },
    ]);

    await statusStore.record(
      statusObservation(10, {
        providerStatus: 'FINISHED',
        transactionHash: `0x${'a'.repeat(64)}`,
        updatedAt: new Date('2026-10-03T12:00:06.500Z'),
        terminal: true,
        executionSucceeded: true,
        statusLookupRequired: false,
      }),
    );
    await expect(
      reconciliationCandidateStore.listDue({
        evaluatedAt: new Date('2026-10-03T12:00:08.000Z'),
        minimumLookupIntervalMs: 1_000,
        limit: 1,
      }),
    ).resolves.toEqual([]);
  });

  it('enforces pending-status cadence from durable observation time at the runner boundary', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));
    await statusStore.record(statusObservation(10));
    let evaluatedAt = new Date('2026-10-03T12:00:06.999Z');
    let lookupCalls = 0;
    const attempt = new AgenticWalletMarketSwapStatusReconciliationAttempt(
      reconciliationContextStore,
      {
        run: () => {
          lookupCalls += 1;
          return Promise.resolve(finishedStatusLookupResponse());
        },
      },
      statusStore,
      () => evaluatedAt,
      1_000,
    );

    await expect(attempt.reconcileOnce(uuid(10))).resolves.toMatchObject({
      status: 'status_lookup_deferred',
      evaluatedAt,
      nextStatusLookupAt: new Date('2026-10-03T12:00:07.000Z'),
      providerCallStarted: false,
      statusLookupRequired: true,
    });
    expect(lookupCalls).toBe(0);
    await expect(prisma.realExecutionStatusObservation.count()).resolves.toBe(
      1,
    );

    evaluatedAt = new Date('2026-10-03T12:00:07.000Z');
    await expect(attempt.reconcileOnce(uuid(10))).resolves.toMatchObject({
      status: 'status_observation_recorded',
      evaluatedAt,
      nextStatusLookupAt: evaluatedAt,
      providerCallStarted: true,
      statusLookupRequired: false,
    });
    expect(lookupCalls).toBe(1);
    await expect(prisma.realExecutionStatusObservation.count()).resolves.toBe(
      2,
    );
  });

  it('runs one bounded manual reconciliation cycle and stops after terminal persistence', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));
    let lookupCalls = 0;
    const cycleStatusStore =
      new PrismaAgenticWalletMarketSwapStatusObservationStore(
        prisma,
        () => new Date('2026-10-03T12:00:07.000Z'),
      );
    const attempt = new AgenticWalletMarketSwapStatusReconciliationAttempt(
      reconciliationContextStore,
      {
        run: () => {
          lookupCalls += 1;
          return Promise.resolve(finishedStatusLookupResponse());
        },
      },
      cycleStatusStore,
      () => new Date('2026-10-03T12:00:07.000Z'),
      1_000,
    );
    const cycle = new AgenticWalletMarketSwapStatusReconciliationCycle(
      reconciliationCandidateStore,
      attempt,
    );
    const input = {
      evaluatedAt: new Date('2026-10-03T12:00:07.000Z'),
      minimumLookupIntervalMs: 1_000,
      limit: 1,
    };

    await expect(cycle.runOnce(input)).resolves.toMatchObject({
      candidateCount: 1,
      attemptedCount: 1,
      observationRecordedCount: 1,
      lookupDeferredCount: 0,
      blockedCount: 0,
      automaticRetryPerformed: false,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
    await expect(cycle.runOnce(input)).resolves.toMatchObject({
      candidateCount: 0,
      attemptedCount: 0,
      observationRecordedCount: 0,
    });
    expect(lookupCalls).toBe(1);
    await expect(prisma.realExecutionStatusObservation.count()).resolves.toBe(
      1,
    );
  });

  it('persists complete financial evidence, accounting evidence, and an inert mutation commitment', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));
    const terminal = await statusStore.record(
      statusObservation(10, {
        providerStatus: 'FINISHED',
        transactionHash: `0x${'a'.repeat(64)}`,
        updatedAt: new Date('2026-10-03T12:00:06.000Z'),
        terminal: true,
        executionSucceeded: true,
        statusLookupRequired: false,
      }),
    );
    const input = financialEvidence(terminal.stored.id);

    const first = await financialEvidenceStore.record(input);
    const replay = await financialEvidenceStore.record(input);

    expect(first).toMatchObject({
      replayed: false,
      stored: {
        id: uuid(23),
        evidence: {
          actualTargetReceivedQuantity: '0.000071',
          providerFeeCoverageComplete: true,
          networkFeeCoverageComplete: true,
        },
      },
    });
    expect(replay).toEqual({ stored: first.stored, replayed: true });
    await expect(
      financialCompletionStore.getByGateId(uuid(10)),
    ).resolves.toMatchObject({
      evidenceId: uuid(23),
      gateId: uuid(10),
      actualReceivedQuantity: '0.000071',
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    });
    const accountingInput = accountingBalanceEvidence(first.stored.id);
    const firstAccounting =
      await accountingBalanceEvidenceStore.record(accountingInput);
    const accountingReplay =
      await accountingBalanceEvidenceStore.record(accountingInput);
    expect(firstAccounting).toMatchObject({
      replayed: false,
      stored: {
        id: uuid(24),
        evidence: {
          completionEvidenceId: uuid(23),
          gateId: uuid(10),
          transactionHash: `0x${'a'.repeat(64)}`,
          coverageComplete: true,
        },
      },
    });
    expect(accountingReplay).toEqual({
      stored: firstAccounting.stored,
      replayed: true,
    });
    await expect(
      accountingBalanceEvidenceReadStore.getByGateId(uuid(10)),
    ).resolves.toEqual(firstAccounting.stored);
    const planAssessment = assessAgenticWalletMarketSwapAccountingMutationPlan(
      firstAccounting.stored,
    );
    if (planAssessment.plan === null)
      throw new Error('Accounting mutation plan was blocked');
    const commitmentAssessment =
      prepareAgenticWalletMarketSwapAccountingMutationCommitment(
        planAssessment.plan,
        uuid(25),
        new Date('2026-10-03T12:00:11.000Z'),
      );
    if (commitmentAssessment.commitment === null)
      throw new Error('Accounting mutation commitment was blocked');
    const firstCommitment = await accountingMutationCommitmentStore.record(
      commitmentAssessment.commitment,
    );
    const commitmentReplay = await accountingMutationCommitmentStore.record(
      commitmentAssessment.commitment,
    );
    expect(firstCommitment).toMatchObject({
      replayed: false,
      stored: {
        commitment: {
          mutationId: uuid(25),
          planFingerprint: commitmentAssessment.commitment.planFingerprint,
          accountingMutationAuthorized: false,
          accountingMutationComplete: false,
          submissionRetryAllowed: false,
        },
        recordedAt: new Date('2026-10-03T12:00:12.000Z'),
      },
    });
    expect(commitmentReplay).toEqual({
      stored: firstCommitment.stored,
      replayed: true,
    });
    const authorizationAssessment =
      authorizeAgenticWalletMarketSwapAccountingMutation(
        firstCommitment.stored,
        {
          authorizationId: uuid(26),
          mutationId: uuid(25),
          planFingerprint: commitmentAssessment.commitment.planFingerprint,
          gateId: uuid(10),
          transactionHash: `0x${'a'.repeat(64)}`,
          acknowledgment: ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
          authorizedAt: new Date('2026-10-03T12:00:13.000Z'),
        },
      );
    if (authorizationAssessment.authorization === null)
      throw new Error('Accounting mutation authorization was blocked');
    const firstAuthorization =
      await accountingMutationAuthorizationStore.record(
        authorizationAssessment.authorization,
      );
    const authorizationReplay =
      await accountingMutationAuthorizationStore.record(
        authorizationAssessment.authorization,
      );
    expect(firstAuthorization).toMatchObject({
      replayed: false,
      stored: {
        authorization: {
          authorizationId: uuid(26),
          accountingMutationAuthorized: true,
          accountingMutationComplete: false,
          submissionRetryAllowed: false,
        },
        recordedAt: new Date('2026-10-03T12:00:14.000Z'),
      },
    });
    expect(authorizationReplay).toEqual({
      stored: firstAuthorization.stored,
      replayed: true,
    });
    await expect(
      accountingMutationAuthorizationReadStore.getByGateId(uuid(10)),
    ).resolves.toEqual(firstAuthorization.stored);
    await prisma.realExecutionAccountingBalance.createMany({
      data: [
        {
          assetIdentity: 'token:0x55d398326f99059ff775485246999027b3197955',
          assetType: 'token',
          assetAddress: '0x55d398326f99059ff775485246999027b3197955',
          quantity: '100',
          updatedAt: new Date('2026-10-03T12:00:14.500Z'),
        },
        {
          assetIdentity: 'token:0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
          assetType: 'token',
          assetAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
          quantity: '0',
          updatedAt: new Date('2026-10-03T12:00:14.500Z'),
        },
        {
          assetIdentity: 'native:BNB',
          assetType: 'native',
          assetSymbol: 'BNB',
          quantity: '1',
          updatedAt: new Date('2026-10-03T12:00:14.500Z'),
        },
      ],
    });
    const applicationAssessment =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        firstAuthorization.stored,
        {
          applicationId: uuid(27),
          authorizationId: uuid(26),
          mutationId: uuid(25),
          planFingerprint: commitmentAssessment.commitment.planFingerprint,
          gateId: uuid(10),
          transactionHash: `0x${'a'.repeat(64)}`,
          acknowledgment: ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
          currentBalances: [
            {
              assetType: 'token',
              assetAddress: '0x55d398326f99059ff775485246999027b3197955',
              currentQuantity: '100',
            },
            {
              assetType: 'token',
              assetAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
              currentQuantity: '0',
            },
            {
              assetType: 'native',
              assetSymbol: 'BNB',
              currentQuantity: '1',
            },
          ],
          balanceCoverageComplete: true,
          balancesObservedAt: new Date('2026-10-03T12:00:15.000Z'),
          preparedAt: new Date('2026-10-03T12:00:16.000Z'),
        },
      );
    if (applicationAssessment.application === null)
      throw new Error('Accounting mutation application was blocked');
    const firstApplication = await accountingMutationApplicationStore.apply(
      applicationAssessment.application,
    );
    const applicationReplay = await accountingMutationApplicationStore.apply(
      applicationAssessment.application,
    );
    expect(firstApplication).toMatchObject({
      replayed: false,
      applied: {
        application: { applicationId: uuid(27) },
        appliedAt: new Date('2026-10-03T12:00:17.000Z'),
        accountingMutationComplete: true,
        submissionRetryAllowed: false,
      },
    });
    expect(applicationReplay).toEqual({
      applied: firstApplication.applied,
      replayed: true,
    });
    await expect(
      accountingMutationApplicationReadStore.getByGateId(uuid(10)),
    ).resolves.toEqual(firstApplication.applied);
    await expect(
      prisma.realExecutionAccountingBalance.findMany({
        orderBy: { assetIdentity: 'asc' },
      }),
    ).resolves.toMatchObject([
      { assetIdentity: 'native:BNB', quantity: '0.9997' },
      {
        assetIdentity: 'token:0x55d398326f99059ff775485246999027b3197955',
        quantity: '95',
      },
      {
        assetIdentity: 'token:0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
        quantity: '0.000071',
      },
    ]);
    await expect(
      financialCompletionStore.getByGateId(uuid(10)),
    ).resolves.toMatchObject({
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    });
    await expect(
      prisma.realExecutionFinancialReconciliationEvidence.count(),
    ).resolves.toBe(1);
    await expect(
      prisma.realExecutionAccountingBalanceEvidence.count(),
    ).resolves.toBe(1);
    await expect(
      prisma.realExecutionAccountingMutationCommitment.count(),
    ).resolves.toBe(1);
    await expect(
      prisma.realExecutionAccountingMutationAuthorization.count(),
    ).resolves.toBe(1);
    await expect(
      prisma.realExecutionAccountingMutationApplication.count(),
    ).resolves.toBe(1);
  });

  it('fails closed when directly persisted observation timing contradicts its receipt', async () => {
    await store.create(command(10));
    await receiptStore.record(submissionReceipt(10));
    await prisma.realExecutionStatusObservation.create({
      data: {
        id: uuid(22),
        gateId: uuid(10),
        providerId: 'agentic_wallet',
        providerOrderId: '1234567890',
        providerStatus: 'PENDING',
        transactionHash: null,
        bookedAt: new Date('2026-10-03T12:00:05.000Z'),
        providerUpdatedAt: new Date('2026-10-03T12:00:05.500Z'),
        recordedAt: new Date('2026-10-03T12:00:04.999Z'),
      },
    });

    await expect(reconciliationStore.getByGateId(uuid(10))).rejects.toThrow(
      'Persisted market-swap reconciliation evidence is inconsistent',
    );
  });

  async function cleanup(): Promise<void> {
    await prisma.realExecutionAccountingMutationApplication.deleteMany();
    await prisma.realExecutionAccountingLedgerReconciliation.deleteMany();
    await prisma.realExecutionAccountingBalanceInitialization.deleteMany();
    await prisma.realExecutionAccountingBalance.deleteMany();
    await prisma.realExecutionAccountingMutationAuthorization.deleteMany();
    await prisma.realExecutionAccountingMutationCommitment.deleteMany();
    await prisma.realExecutionAccountingBalanceEvidence.deleteMany();
    await prisma.realExecutionFinancialReconciliationEvidence.deleteMany();
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

function financialEvidence(
  statusObservationId: string,
): AgenticWalletMarketSwapFinancialReconciliationEvidence {
  return {
    scope: 'agentic_wallet_market_swap_financial_reconciliation_evidence',
    providerId: 'agentic_wallet',
    chainId: '56',
    gateId: uuid(10),
    providerOrderId: '1234567890',
    statusObservationId,
    transactionHash: `0x${'a'.repeat(64)}`,
    sourceTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
    targetTokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    submittedSourceQuantity: '5',
    actualTargetReceivedQuantity: '0.000071',
    providerFeeComponents: [],
    networkFeeAsset: 'BNB',
    networkFeeQuantity: '0.0003',
    transactionReceiptObserved: true,
    targetBalanceDeltaObserved: true,
    providerFeeCoverageComplete: true,
    networkFeeCoverageComplete: true,
    observedAt: new Date('2026-10-03T12:00:07.000Z'),
  };
}

function accountingBalanceEvidence(
  completionEvidenceId: string,
): AgenticWalletMarketSwapAccountingBalanceEvidence {
  return {
    scope: 'agentic_wallet_market_swap_accounting_balance_evidence',
    completionEvidenceId,
    gateId: uuid(10),
    transactionHash: `0x${'a'.repeat(64)}`,
    balanceChanges: [
      {
        assetType: 'token',
        assetAddress: '0x55d398326f99059ff775485246999027b3197955',
        direction: 'debit',
        beforeQuantity: '100',
        afterQuantity: '95',
        deltaQuantity: '5',
      },
      {
        assetType: 'token',
        assetAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
        direction: 'credit',
        beforeQuantity: '0',
        afterQuantity: '0.000071',
        deltaQuantity: '0.000071',
      },
      {
        assetType: 'native',
        assetSymbol: 'BNB',
        direction: 'debit',
        beforeQuantity: '1',
        afterQuantity: '0.9997',
        deltaQuantity: '0.0003',
      },
    ],
    coverageComplete: true,
    observedAt: new Date('2026-10-03T12:00:09.000Z'),
  };
}

function finishedStatusLookupResponse(): Record<string, unknown> {
  return {
    success: true,
    data: {
      total: 1,
      page: 1,
      pageSize: 20,
      list: [
        {
          orderType: 'market',
          orderId: '1234567890',
          chain: '56',
          fromToken: '0x55d398326f99059ff775485246999027b3197955',
          fromTokenName: 'USDT',
          fromTokenQty: '5',
          toToken: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
          toTokenName: 'BTCB',
          status: 'FINISHED',
          slippage: '0.1',
          txHash: `0x${'a'.repeat(64)}`,
          bookTime: '2026-10-03T12:00:05.000Z',
          updatedTime: '2026-10-03T12:00:07.000Z',
        },
      ],
    },
  };
}

function accountingBalanceInitialization(): AgenticWalletAccountingBalanceInitialization {
  return {
    scope: 'agentic_wallet_accounting_balance_initialization',
    initializationId: uuid(29),
    providerId: 'agentic_wallet',
    chainId: '56',
    acknowledgment: ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
    balances: [
      { assetType: 'native', assetSymbol: 'BNB', currentQuantity: '2' },
      {
        assetType: 'token',
        assetAddress: '0x55d398326f99059ff775485246999027b3197955',
        currentQuantity: '1000.5',
      },
      {
        assetType: 'token',
        assetAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
        currentQuantity: '0.125',
      },
    ],
    balanceCoverageComplete: true,
    walletObservedAt: new Date('2026-10-03T12:00:00.000Z'),
    maximumObservationAgeMs: 5_000,
    preparedAt: new Date('2026-10-03T12:00:02.000Z'),
    accountingBalanceInitializationPrepared: true,
    accountingBalancesInitialized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function accountingBalanceObservation(): AgenticWalletCapabilityObservation {
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
      observedAt: new Date('2026-10-03T12:00:03.500Z'),
    },
    settings: null,
    quota: null,
    addresses: [{ chainId: '56', address: '0xwallet' }],
    balances: [
      { chainId: '56', tokenAddress: USDT, symbol: 'USDT', quantity: '1000.5' },
      { chainId: '56', tokenAddress: BTCB, symbol: 'BTCB', quantity: '0.125' },
      {
        chainId: '56',
        tokenAddress: 'native-bnb',
        symbol: 'BNB',
        quantity: '2',
      },
    ],
    gas: null,
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
