import { randomUUID } from 'node:crypto';

import { AgenticWalletFundingConversionFinancialEvidenceReader } from './agentic-wallet-funding-conversion-financial-evidence.reader';
import {
  AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
  AgenticWalletFundingConversionFinancialReconciliationStore,
  StoredFundingConversionFinancialReconciliation,
} from './agentic-wallet-funding-conversion-financial-reconciliation.store';
import { isValidFundingConversionFinancialReconciliationEvidence } from '../infrastructure/agentic-wallet-funding-conversion-financial-reconciliation-evidence';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface FundingConversionFinancialReconciliationResult {
  readonly scope: 'agentic_wallet_funding_conversion_financial_reconciliation';
  readonly status:
    | 'blocked'
    | 'evidence_unavailable'
    | 'evidence_invalid'
    | 'reconciliation_already_recorded'
    | 'reconciliation_recorded';
  readonly blockers: readonly string[];
  readonly reconciliation: StoredFundingConversionFinancialReconciliation | null;
  readonly reconciliationReplayed: boolean;
  readonly evidenceReadStarted: boolean;
  readonly evidenceReadCompleted: boolean;
  readonly financialReconciliationRequired: boolean;
  readonly financialReconciliationComplete: boolean;
  readonly automaticRetryAllowed: false;
}

export class FundingConversionFinancialReconciliationServiceIdentityError extends Error {}
export class FundingConversionFinancialReconciliationServiceCanceledError extends Error {}

export class AgenticWalletFundingConversionFinancialReconciliationService {
  private readonly activeAttemptIds = new Set<string>();

  constructor(
    private readonly reconciliations: AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
    private readonly evidenceReader: AgenticWalletFundingConversionFinancialEvidenceReader,
    private readonly store: AgenticWalletFundingConversionFinancialReconciliationStore,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
  ) {}

  async reconcileOnce(
    attemptId: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionFinancialReconciliationResult> {
    if (typeof attemptId !== 'string' || !UUID_PATTERN.test(attemptId))
      throw new FundingConversionFinancialReconciliationServiceIdentityError();
    if (signal?.aborted)
      throw new FundingConversionFinancialReconciliationServiceCanceledError();
    if (this.activeAttemptIds.has(attemptId))
      return result('blocked', ['financial_reconciliation_in_progress']);

    this.activeAttemptIds.add(attemptId);
    try {
      const existing = await this.reconciliations.getByAttemptId(attemptId);
      if (existing !== null)
        return result('reconciliation_already_recorded', [], existing, true);
      if (signal?.aborted)
        throw new FundingConversionFinancialReconciliationServiceCanceledError();

      const evidence = await this.evidenceReader.load(attemptId, signal);
      if (evidence === null)
        return result('evidence_unavailable', [], null, false, true, true);
      if (!isValidFundingConversionFinancialReconciliationEvidence(evidence))
        return result(
          'evidence_invalid',
          ['invalid_financial_evidence'],
          null,
          false,
          true,
          true,
        );
      if (signal?.aborted)
        throw new FundingConversionFinancialReconciliationServiceCanceledError();

      const reconciliationId = this.newId();
      const recordedAt = this.now();
      if (
        !UUID_PATTERN.test(reconciliationId) ||
        !(recordedAt instanceof Date) ||
        !Number.isFinite(recordedAt.getTime()) ||
        recordedAt.getTime() < evidence.observedAt.getTime()
      )
        return result(
          'blocked',
          ['invalid_recording_identity_or_time'],
          null,
          false,
          true,
          true,
        );

      const stored = await this.store.record(
        reconciliationId,
        evidence,
        new Date(recordedAt),
      );
      return result(
        'reconciliation_recorded',
        [],
        stored.reconciliation,
        stored.replayed,
        true,
        true,
      );
    } finally {
      this.activeAttemptIds.delete(attemptId);
    }
  }
}

function result(
  status: FundingConversionFinancialReconciliationResult['status'],
  blockers: readonly string[],
  reconciliation: StoredFundingConversionFinancialReconciliation | null = null,
  reconciliationReplayed = false,
  evidenceReadStarted = false,
  evidenceReadCompleted = false,
): FundingConversionFinancialReconciliationResult {
  const complete = reconciliation !== null;
  return {
    scope: 'agentic_wallet_funding_conversion_financial_reconciliation',
    status,
    blockers,
    reconciliation,
    reconciliationReplayed,
    evidenceReadStarted,
    evidenceReadCompleted,
    financialReconciliationRequired: !complete,
    financialReconciliationComplete: complete,
    automaticRetryAllowed: false,
  };
}
