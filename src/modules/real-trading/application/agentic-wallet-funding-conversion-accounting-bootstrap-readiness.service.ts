import { AgenticWalletFundingConversionAccountingAbsenceReader } from './agentic-wallet-funding-conversion-accounting-absence.reader';
import type { FundingConversionAccountingAbsenceEvidence } from './agentic-wallet-funding-conversion-accounting-bootstrap';
import { AgenticWalletFundingConversionFinancialEvidenceContextStore } from './agentic-wallet-funding-conversion-financial-evidence-context.store';
import {
  AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
  StoredFundingConversionFinancialReconciliation,
} from './agentic-wallet-funding-conversion-financial-reconciliation.store';
import type { FundingConversionFinancialEvidenceContext } from './agentic-wallet-funding-conversion-financial-evidence-context.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface FundingConversionAccountingBootstrapReadinessResult {
  readonly scope: 'agentic_wallet_funding_conversion_accounting_bootstrap_readiness';
  readonly status: 'blocked' | 'ready_for_explicit_bootstrap_action';
  readonly blockers: readonly string[];
  readonly attemptId: string;
  readonly reconciliationId: string | null;
  readonly accountingState: FundingConversionAccountingAbsenceEvidence | null;
  readonly financialReconciliationComplete: boolean;
  readonly terminalConversionContextComplete: boolean;
  readonly accountingStateInspected: boolean;
  readonly accountingStateEmpty: boolean;
  readonly providerReadStarted: false;
  readonly bootstrapInvoked: false;
  readonly explicitOperatorActionRequired: true;
  readonly accountingBalancesInitialized: false;
  readonly strategyExecutionAuthorized: false;
  readonly automaticRetryAllowed: false;
}

export class FundingConversionAccountingBootstrapReadinessRequestError extends Error {}

export class AgenticWalletFundingConversionAccountingBootstrapReadinessService {
  constructor(
    private readonly reconciliations: AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
    private readonly contexts: AgenticWalletFundingConversionFinancialEvidenceContextStore,
    private readonly absence: AgenticWalletFundingConversionAccountingAbsenceReader,
  ) {}

  async assess(
    attemptId: string,
  ): Promise<FundingConversionAccountingBootstrapReadinessResult> {
    if (typeof attemptId !== 'string' || !UUID_PATTERN.test(attemptId))
      throw new FundingConversionAccountingBootstrapReadinessRequestError();

    const reconciliation = await this.reconciliations.getByAttemptId(attemptId);
    if (reconciliation === null)
      return result(attemptId, ['financial_reconciliation_absent']);
    const context = await this.contexts.getByAttemptId(attemptId);
    if (context === null)
      return result(
        attemptId,
        ['terminal_conversion_context_absent'],
        reconciliation,
      );
    if (!matches(reconciliation, context))
      return result(
        attemptId,
        ['durable_conversion_context_mismatch'],
        reconciliation,
        true,
      );

    const accountingState = await this.absence.inspect();
    const empty =
      accountingState.initializationCount === 0 &&
      accountingState.balanceCount === 0 &&
      accountingState.synchronizationCount === 0;
    return result(
      attemptId,
      empty ? [] : ['accounting_state_not_empty'],
      reconciliation,
      true,
      accountingState,
    );
  }
}

function matches(
  reconciliation: StoredFundingConversionFinancialReconciliation,
  context: FundingConversionFinancialEvidenceContext,
): boolean {
  const durable = context.reconciliation;
  return (
    reconciliation.attemptId === durable.attemptId &&
    reconciliation.planId === durable.planId &&
    reconciliation.evidence.providerOrderId === durable.providerOrderId &&
    reconciliation.evidence.submittedSourceQuantityBnb ===
      durable.sourceQuantityBnb &&
    reconciliation.expectedUsdt === durable.expectedUsdt &&
    reconciliation.minimumUsdt === durable.minimumUsdt &&
    reconciliation.evidence.statusObservationId ===
      durable.statusObservation.id &&
    reconciliation.evidence.transactionHash ===
      durable.statusObservation.observation.transactionHash &&
    reconciliation.evidence.chainId === '56' &&
    reconciliation.financialReconciliationComplete === true &&
    reconciliation.automaticRetryAllowed === false &&
    durable.statusObservation.observation.terminal === true &&
    durable.statusObservation.observation.executionSucceeded === true &&
    durable.statusObservation.observation.automaticRetryAllowed === false
  );
}

function result(
  attemptId: string,
  blockers: readonly string[],
  reconciliation: StoredFundingConversionFinancialReconciliation | null = null,
  contextComplete = false,
  accountingState: FundingConversionAccountingAbsenceEvidence | null = null,
): FundingConversionAccountingBootstrapReadinessResult {
  const accountingStateEmpty =
    accountingState !== null &&
    accountingState.initializationCount === 0 &&
    accountingState.balanceCount === 0 &&
    accountingState.synchronizationCount === 0;
  return {
    scope: 'agentic_wallet_funding_conversion_accounting_bootstrap_readiness',
    status:
      blockers.length === 0 ? 'ready_for_explicit_bootstrap_action' : 'blocked',
    blockers,
    attemptId,
    reconciliationId: reconciliation?.id ?? null,
    accountingState,
    financialReconciliationComplete: reconciliation !== null,
    terminalConversionContextComplete: contextComplete,
    accountingStateInspected: accountingState !== null,
    accountingStateEmpty,
    providerReadStarted: false,
    bootstrapInvoked: false,
    explicitOperatorActionRequired: true,
    accountingBalancesInitialized: false,
    strategyExecutionAuthorized: false,
    automaticRetryAllowed: false,
  };
}
