import { randomUUID } from 'node:crypto';

import { AgenticWalletAccountingLedgerReconciliationAttemptPort } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-attempt.guard';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-commitment';
import { AgenticWalletAccountingLedgerReconciliationCommitmentStore } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-commitment.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface AgenticWalletAccountingLedgerReconciliationRecordingRequest {
  readonly initializationId: string;
  readonly maximumObservationAgeMs: number;
}

export interface AgenticWalletAccountingLedgerReconciliationRecordingResult {
  readonly scope: 'agentic_wallet_accounting_ledger_reconciliation_recording';
  readonly status: 'blocked' | 'reconciliation_evidence_recorded';
  readonly blockers: readonly string[];
  readonly initializationId: string;
  readonly reconciliationId: string | null;
  readonly reconciliationFingerprint: string | null;
  readonly walletObservedAt: Date | null;
  readonly reconciledAt: Date | null;
  readonly recordedAt: Date | null;
  readonly providerReadCompleted: true;
  readonly ledgerBalancesReconciled: boolean;
  readonly reconciliationEvidenceRecorded: boolean;
  readonly replayed: boolean;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly strategyExecutionAuthorized: false;
  readonly automaticRetryAllowed: false;
}

export class AgenticWalletAccountingLedgerReconciliationRecordingRequestError extends Error {}

export class AgenticWalletAccountingLedgerReconciliationRecordingService {
  constructor(
    private readonly attempt: AgenticWalletAccountingLedgerReconciliationAttemptPort,
    private readonly commitments: AgenticWalletAccountingLedgerReconciliationCommitmentStore,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  async record(
    value: unknown,
    signal?: AbortSignal,
  ): Promise<AgenticWalletAccountingLedgerReconciliationRecordingResult> {
    const request = parseRequest(value);
    const assessment = await this.attempt.run(
      request.initializationId,
      request.maximumObservationAgeMs,
      signal,
    );
    if (signal?.aborted) throw signal.reason;
    if (assessment === null)
      return blocked(request.initializationId, [
        'accounting_initialization_absent',
      ]);
    if (assessment.reconciliation === null)
      return blocked(request.initializationId, assessment.blockers);

    const preparedAt = this.now();
    const prepared =
      prepareAgenticWalletAccountingLedgerReconciliationCommitment(
        assessment.reconciliation,
        this.createId(),
        preparedAt,
      );
    if (prepared.commitment === null)
      throw new Error(
        `Accounting ledger reconciliation commitment preparation failed: ${prepared.blockers.join(', ')}`,
      );
    if (signal?.aborted) throw signal.reason;

    const persisted = await this.commitments.record(prepared.commitment);
    const commitment = persisted.stored.commitment;
    return {
      scope: 'agentic_wallet_accounting_ledger_reconciliation_recording',
      status: 'reconciliation_evidence_recorded',
      blockers: [],
      initializationId: request.initializationId,
      reconciliationId: commitment.reconciliationId,
      reconciliationFingerprint: commitment.reconciliationFingerprint,
      walletObservedAt: new Date(commitment.reconciliation.walletObservedAt),
      reconciledAt: new Date(commitment.reconciliation.reconciledAt),
      recordedAt: new Date(persisted.stored.recordedAt),
      providerReadCompleted: true,
      ledgerBalancesReconciled: true,
      reconciliationEvidenceRecorded: true,
      replayed: persisted.replayed,
      quoteAuthorized: false,
      submissionAuthorized: false,
      strategyExecutionAuthorized: false,
      automaticRetryAllowed: false,
    };
  }
}

function parseRequest(
  value: unknown,
): AgenticWalletAccountingLedgerReconciliationRecordingRequest {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !==
      'initializationId,maximumObservationAgeMs'
  )
    throw new AgenticWalletAccountingLedgerReconciliationRecordingRequestError();
  const request = value as Record<string, unknown>;
  if (
    typeof request.initializationId !== 'string' ||
    !UUID_PATTERN.test(request.initializationId) ||
    !Number.isSafeInteger(request.maximumObservationAgeMs) ||
    (request.maximumObservationAgeMs as number) < 1 ||
    (request.maximumObservationAgeMs as number) > 60_000
  )
    throw new AgenticWalletAccountingLedgerReconciliationRecordingRequestError();
  return {
    initializationId: request.initializationId,
    maximumObservationAgeMs: request.maximumObservationAgeMs as number,
  };
}

function blocked(
  initializationId: string,
  blockers: readonly string[],
): AgenticWalletAccountingLedgerReconciliationRecordingResult {
  return {
    scope: 'agentic_wallet_accounting_ledger_reconciliation_recording',
    status: 'blocked',
    blockers: [...blockers],
    initializationId,
    reconciliationId: null,
    reconciliationFingerprint: null,
    walletObservedAt: null,
    reconciledAt: null,
    recordedAt: null,
    providerReadCompleted: true,
    ledgerBalancesReconciled: false,
    reconciliationEvidenceRecorded: false,
    replayed: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    strategyExecutionAuthorized: false,
    automaticRetryAllowed: false,
  };
}
