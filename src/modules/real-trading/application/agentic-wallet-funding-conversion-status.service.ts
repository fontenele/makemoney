import {
  AgenticWalletFundingConversionStatusContextStore,
  FundingConversionStatusContextIdentityError,
} from './agentic-wallet-funding-conversion-status-context.store';
import {
  AgenticWalletFundingConversionStatusObservationStore,
  StoredFundingConversionStatusObservation,
} from './agentic-wallet-funding-conversion-status-observation.store';
import { AgenticWalletMarketSwapStatusLookupRunner } from '../infrastructure/agentic-wallet-market-swap-status-lookup-runner';
import { assessAgenticWalletFundingConversionStatusResponse } from '../infrastructure/agentic-wallet-funding-conversion-status-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface FundingConversionStatusReconciliationResult {
  readonly scope: 'agentic_wallet_funding_conversion_status_reconciliation';
  readonly status:
    | 'blocked'
    | 'status_lookup_not_required'
    | 'status_response_invalid'
    | 'status_observation_recorded';
  readonly blockers: readonly string[];
  readonly storedObservation: StoredFundingConversionStatusObservation | null;
  readonly observationReplayed: boolean;
  readonly providerCallStarted: boolean;
  readonly providerCallCompleted: boolean;
  readonly statusLookupRequired: boolean;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly automaticRetryAllowed: false;
}

export class AgenticWalletFundingConversionStatusService {
  private readonly activeAttemptIds = new Set<string>();

  constructor(
    private readonly contextStore: AgenticWalletFundingConversionStatusContextStore,
    private readonly lookupRunner: AgenticWalletMarketSwapStatusLookupRunner,
    private readonly observationStore: AgenticWalletFundingConversionStatusObservationStore,
    private readonly now: () => Date,
    private readonly createObservationId: () => string,
  ) {}

  async reconcileOnce(
    attemptId: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionStatusReconciliationResult> {
    if (!UUID_PATTERN.test(attemptId))
      throw new FundingConversionStatusContextIdentityError();
    if (this.activeAttemptIds.has(attemptId))
      return result('blocked', ['status_reconciliation_in_progress']);

    this.activeAttemptIds.add(attemptId);
    try {
      const context = await this.contextStore.getByAttemptId(attemptId);
      if (context === null)
        return result('blocked', ['status_context_not_found']);
      if (!context.statusLookupRequired)
        return result('status_lookup_not_required', [], false);
      if (context.statusContext === null)
        return result('blocked', ['invalid_status_context']);

      const response = await this.lookupRunner.run(
        {
          kind: 'market_order_status_lookup',
          providerOrderId: context.statusContext.providerOrderId,
        },
        signal,
      );
      const assessment = assessAgenticWalletFundingConversionStatusResponse(
        context.statusContext,
        response,
      );
      if (assessment.observation === null)
        return result(
          'status_response_invalid',
          assessment.blockers,
          true,
          true,
          true,
        );

      const recordedAt = this.now();
      const observationId = this.createObservationId();
      if (
        !UUID_PATTERN.test(observationId) ||
        !(recordedAt instanceof Date) ||
        !Number.isFinite(recordedAt.getTime()) ||
        recordedAt.getTime() <
          assessment.observation.providerUpdatedAt.getTime()
      )
        return result(
          'blocked',
          ['invalid_recording_identity_or_time'],
          true,
          true,
          true,
        );

      const recorded = await this.observationStore.record(
        observationId,
        assessment.observation,
        new Date(recordedAt),
      );
      return result(
        'status_observation_recorded',
        [],
        !recorded.stored.observation.terminal,
        true,
        true,
        recorded.stored,
        recorded.replayed,
      );
    } finally {
      this.activeAttemptIds.delete(attemptId);
    }
  }
}

function result(
  status: FundingConversionStatusReconciliationResult['status'],
  blockers: readonly string[],
  statusLookupRequired = false,
  providerCallStarted = false,
  providerCallCompleted = false,
  storedObservation: StoredFundingConversionStatusObservation | null = null,
  observationReplayed = false,
): FundingConversionStatusReconciliationResult {
  return {
    scope: 'agentic_wallet_funding_conversion_status_reconciliation',
    status,
    blockers,
    storedObservation,
    observationReplayed,
    providerCallStarted,
    providerCallCompleted,
    statusLookupRequired,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    automaticRetryAllowed: false,
  };
}
