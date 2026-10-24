import { randomUUID } from 'node:crypto';

import { AgenticWalletFundingConversionAccountingSnapshotReader } from './agentic-wallet-funding-conversion-accounting-snapshot.reader';
import {
  AgenticWalletFundingConversionAccountingSyncStore,
  AppliedFundingConversionAccountingSync,
  FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
} from './agentic-wallet-funding-conversion-accounting-sync.store';
import { AgenticWalletFundingConversionFinancialEvidenceContextStore } from './agentic-wallet-funding-conversion-financial-evidence-context.store';
import { AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore } from './agentic-wallet-funding-conversion-financial-reconciliation.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface FundingConversionAccountingSyncCommand {
  readonly attemptId: string;
  readonly initializationId: string;
  readonly acknowledgment: typeof FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT;
}

export interface FundingConversionAccountingSyncResult {
  readonly scope: 'agentic_wallet_funding_conversion_accounting_sync';
  readonly status:
    'blocked' | 'accounting_already_synchronized' | 'accounting_synchronized';
  readonly blockers: readonly string[];
  readonly synchronization: AppliedFundingConversionAccountingSync | null;
  readonly replayed: boolean;
  readonly providerReadStarted: boolean;
  readonly providerReadCompleted: boolean;
  readonly accountingSynchronizationComplete: boolean;
  readonly strategyExecutionAuthorized: false;
  readonly automaticRetryAllowed: false;
}

export class FundingConversionAccountingSyncRequestError extends Error {}

export class AgenticWalletFundingConversionAccountingSyncService {
  private readonly activeAttemptIds = new Set<string>();

  constructor(
    private readonly store: AgenticWalletFundingConversionAccountingSyncStore,
    private readonly reconciliations: AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
    private readonly contexts: AgenticWalletFundingConversionFinancialEvidenceContextStore,
    private readonly snapshots: AgenticWalletFundingConversionAccountingSnapshotReader,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
  ) {}

  async synchronize(
    command: FundingConversionAccountingSyncCommand,
    signal?: AbortSignal,
  ): Promise<FundingConversionAccountingSyncResult> {
    validate(command);
    if (signal?.aborted) throw signal.reason;
    if (this.activeAttemptIds.has(command.attemptId))
      return result('blocked', ['accounting_synchronization_in_progress']);
    this.activeAttemptIds.add(command.attemptId);
    try {
      const existing = await this.store.getByAttemptId(command.attemptId);
      if (existing !== null)
        return result('accounting_already_synchronized', [], existing, true);
      const reconciliation = await this.reconciliations.getByAttemptId(
        command.attemptId,
      );
      if (reconciliation === null)
        return result('blocked', ['financial_reconciliation_absent']);
      const context = await this.contexts.getByAttemptId(command.attemptId);
      if (context === null)
        return result('blocked', ['terminal_conversion_context_absent']);
      if (signal?.aborted) throw signal.reason;
      const snapshot = await this.snapshots.load(context.walletAddress, signal);
      if (signal?.aborted) throw signal.reason;
      const preparedAt = this.now();
      const id = this.newId();
      if (
        !UUID_PATTERN.test(id) ||
        !Number.isFinite(preparedAt.getTime()) ||
        preparedAt.getTime() < snapshot.observedAt.getTime()
      )
        return result(
          'blocked',
          ['invalid_synchronization_identity_or_time'],
          null,
          false,
          true,
          true,
        );
      const applied = await this.store.apply({
        id,
        initializationId: command.initializationId,
        reconciliation,
        context,
        snapshot,
        acknowledgment: command.acknowledgment,
        preparedAt: new Date(preparedAt),
      });
      return result(
        'accounting_synchronized',
        [],
        applied.synchronized,
        applied.replayed,
        true,
        true,
      );
    } finally {
      this.activeAttemptIds.delete(command.attemptId);
    }
  }
}

function validate(command: FundingConversionAccountingSyncCommand): void {
  if (
    typeof command !== 'object' ||
    command === null ||
    !UUID_PATTERN.test(command.attemptId) ||
    !UUID_PATTERN.test(command.initializationId) ||
    command.acknowledgment !== FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT
  )
    throw new FundingConversionAccountingSyncRequestError();
}

function result(
  status: FundingConversionAccountingSyncResult['status'],
  blockers: readonly string[],
  synchronization: AppliedFundingConversionAccountingSync | null = null,
  replayed = false,
  providerReadStarted = false,
  providerReadCompleted = false,
): FundingConversionAccountingSyncResult {
  return {
    scope: 'agentic_wallet_funding_conversion_accounting_sync',
    status,
    blockers,
    synchronization,
    replayed,
    providerReadStarted,
    providerReadCompleted,
    accountingSynchronizationComplete: synchronization !== null,
    strategyExecutionAuthorized: false,
    automaticRetryAllowed: false,
  };
}
