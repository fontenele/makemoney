import {
  AgenticWalletAccountingLedgerReconciliationAssessment,
  AgenticWalletAccountingLedgerReconciliationRequest,
} from './agentic-wallet-accounting-ledger-reconciliation';
import { AgenticWalletCapabilityObservation } from './agentic-wallet-capability.adapter';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAXIMUM_OBSERVATION_AGE_MS = 60_000;

export interface AgenticWalletCapabilityObservationLoader {
  load(
    chainId: '56',
    observedAt: Date,
    signal?: AbortSignal,
  ): Promise<AgenticWalletCapabilityObservation>;
}

export interface AgenticWalletAccountingLedgerReconciliationPort {
  reconcile(
    initializationId: string,
    observation: AgenticWalletCapabilityObservation,
    request: AgenticWalletAccountingLedgerReconciliationRequest,
  ): Promise<AgenticWalletAccountingLedgerReconciliationAssessment | null>;
}

export class AgenticWalletAccountingLedgerReconciliationAttemptRequestError extends Error {
  constructor() {
    super('Accounting ledger reconciliation attempt request is invalid');
  }
}

export class AgenticWalletAccountingLedgerReconciliationAttemptClockError extends Error {
  constructor() {
    super('Accounting ledger reconciliation attempt clock is invalid');
  }
}

export class AgenticWalletAccountingLedgerReconciliationAttemptCancelledError extends Error {
  constructor() {
    super('Accounting ledger reconciliation attempt was cancelled');
  }
}

export class AgenticWalletAccountingLedgerReconciliationAttempt {
  constructor(
    private readonly observationLoader: AgenticWalletCapabilityObservationLoader,
    private readonly reconciliation: AgenticWalletAccountingLedgerReconciliationPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async run(
    initializationId: string,
    maximumObservationAgeMs: number,
    signal?: AbortSignal,
  ): Promise<AgenticWalletAccountingLedgerReconciliationAssessment | null> {
    if (
      typeof initializationId !== 'string' ||
      !UUID_PATTERN.test(initializationId) ||
      !Number.isSafeInteger(maximumObservationAgeMs) ||
      maximumObservationAgeMs < 1 ||
      maximumObservationAgeMs > MAXIMUM_OBSERVATION_AGE_MS
    )
      throw new AgenticWalletAccountingLedgerReconciliationAttemptRequestError();
    assertNotCancelled(signal);

    const observedAt = this.now();
    if (!isValidDate(observedAt))
      throw new AgenticWalletAccountingLedgerReconciliationAttemptClockError();
    const observation = await this.observationLoader.load(
      '56',
      new Date(observedAt),
      signal,
    );
    assertNotCancelled(signal);

    const evaluatedAt = this.now();
    if (
      !isValidDate(evaluatedAt) ||
      evaluatedAt.getTime() < observedAt.getTime()
    )
      throw new AgenticWalletAccountingLedgerReconciliationAttemptClockError();
    return this.reconciliation.reconcile(initializationId, observation, {
      maximumObservationAgeMs,
      evaluatedAt: new Date(evaluatedAt),
    });
  }
}

function assertNotCancelled(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new AgenticWalletAccountingLedgerReconciliationAttemptCancelledError();
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}
