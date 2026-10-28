import { randomUUID } from 'node:crypto';

import { AgenticWalletFundingConversionAccountingAbsenceReader } from './agentic-wallet-funding-conversion-accounting-absence.reader';
import {
  FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
  prepareFundingConversionAccountingBootstrap,
} from './agentic-wallet-funding-conversion-accounting-bootstrap';
import {
  AgenticWalletFundingConversionAccountingBootstrapStore,
  AppliedFundingConversionAccountingBootstrap,
} from './agentic-wallet-funding-conversion-accounting-bootstrap.store';
import { AgenticWalletFundingConversionAccountingSnapshotReader } from './agentic-wallet-funding-conversion-accounting-snapshot.reader';
import { AgenticWalletFundingConversionFinancialEvidenceContextStore } from './agentic-wallet-funding-conversion-financial-evidence-context.store';
import { AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore } from './agentic-wallet-funding-conversion-financial-reconciliation.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAXIMUM_SNAPSHOT_AGE_MS = 60_000;

export interface FundingConversionAccountingBootstrapCommand {
  readonly attemptId: string;
  readonly acknowledgment: typeof FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT;
}

export interface FundingConversionAccountingBootstrapResult {
  readonly scope: 'agentic_wallet_funding_conversion_accounting_bootstrap_action';
  readonly status: 'blocked' | 'accounting_bootstrapped';
  readonly blockers: readonly string[];
  readonly applied: AppliedFundingConversionAccountingBootstrap | null;
  readonly replayed: boolean;
  readonly accountingStateInspected: boolean;
  readonly providerReadStarted: boolean;
  readonly providerReadCompleted: boolean;
  readonly accountingBootstrapComplete: boolean;
  readonly ordinaryAccountingSynchronizationApplied: false;
  readonly historicalLedgerContinuityClaimed: false;
  readonly historicalBtcbContinuityClaimed: false;
  readonly strategyExecutionAuthorized: false;
  readonly automaticRetryAllowed: false;
}

export class FundingConversionAccountingBootstrapRequestError extends Error {}
export class FundingConversionAccountingBootstrapCanceledError extends Error {}

export class AgenticWalletFundingConversionAccountingBootstrapService {
  private readonly activeAttemptIds = new Set<string>();

  constructor(
    private readonly reconciliations: AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
    private readonly contexts: AgenticWalletFundingConversionFinancialEvidenceContextStore,
    private readonly absence: AgenticWalletFundingConversionAccountingAbsenceReader,
    private readonly snapshots: AgenticWalletFundingConversionAccountingSnapshotReader,
    private readonly store: AgenticWalletFundingConversionAccountingBootstrapStore,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
  ) {}

  async bootstrapOnce(
    command: FundingConversionAccountingBootstrapCommand,
    signal?: AbortSignal,
  ): Promise<FundingConversionAccountingBootstrapResult> {
    validate(command);
    assertNotCanceled(signal);
    if (this.activeAttemptIds.has(command.attemptId))
      return result('blocked', ['accounting_bootstrap_in_progress']);

    this.activeAttemptIds.add(command.attemptId);
    try {
      const reconciliation = await this.reconciliations.getByAttemptId(
        command.attemptId,
      );
      if (reconciliation === null)
        return result('blocked', ['financial_reconciliation_absent']);
      const context = await this.contexts.getByAttemptId(command.attemptId);
      if (context === null)
        return result('blocked', ['terminal_conversion_context_absent']);
      assertNotCanceled(signal);

      const absence = await this.absence.inspect();
      if (
        absence.initializationCount !== 0 ||
        absence.balanceCount !== 0 ||
        absence.synchronizationCount !== 0
      )
        return result(
          'blocked',
          ['accounting_state_not_empty'],
          null,
          false,
          true,
        );
      assertNotCanceled(signal);

      const snapshot = await this.snapshots.load(context.walletAddress, signal);
      assertNotCanceled(signal);
      const preparedAt = this.now();
      const bootstrapId = this.newId();
      if (
        !UUID_PATTERN.test(bootstrapId) ||
        !Number.isFinite(preparedAt.getTime())
      )
        return result(
          'blocked',
          ['invalid_bootstrap_identity_or_time'],
          null,
          false,
          true,
          true,
          true,
        );

      const assessment = prepareFundingConversionAccountingBootstrap(
        reconciliation,
        context,
        snapshot,
        absence,
        {
          bootstrapId,
          acknowledgment: command.acknowledgment,
          maximumSnapshotAgeMs: MAXIMUM_SNAPSHOT_AGE_MS,
          preparedAt: new Date(preparedAt),
        },
      );
      if (assessment.bootstrap === null)
        return result(
          'blocked',
          assessment.blockers,
          null,
          false,
          true,
          true,
          true,
        );

      const stored = await this.store.apply({
        bootstrap: assessment.bootstrap,
        reconciliation,
        context,
        snapshot,
        absence,
      });
      return result(
        'accounting_bootstrapped',
        [],
        stored.applied,
        stored.replayed,
        true,
        true,
        true,
      );
    } finally {
      this.activeAttemptIds.delete(command.attemptId);
    }
  }
}

function validate(command: FundingConversionAccountingBootstrapCommand): void {
  if (
    typeof command !== 'object' ||
    command === null ||
    !UUID_PATTERN.test(command.attemptId) ||
    command.acknowledgment !==
      FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT
  )
    throw new FundingConversionAccountingBootstrapRequestError();
}

function assertNotCanceled(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new FundingConversionAccountingBootstrapCanceledError();
}

function result(
  status: FundingConversionAccountingBootstrapResult['status'],
  blockers: readonly string[],
  applied: AppliedFundingConversionAccountingBootstrap | null = null,
  replayed = false,
  accountingStateInspected = false,
  providerReadStarted = false,
  providerReadCompleted = false,
): FundingConversionAccountingBootstrapResult {
  return {
    scope: 'agentic_wallet_funding_conversion_accounting_bootstrap_action',
    status,
    blockers,
    applied,
    replayed,
    accountingStateInspected,
    providerReadStarted,
    providerReadCompleted,
    accountingBootstrapComplete: applied !== null,
    ordinaryAccountingSynchronizationApplied: false,
    historicalLedgerContinuityClaimed: false,
    historicalBtcbContinuityClaimed: false,
    strategyExecutionAuthorized: false,
    automaticRetryAllowed: false,
  };
}
