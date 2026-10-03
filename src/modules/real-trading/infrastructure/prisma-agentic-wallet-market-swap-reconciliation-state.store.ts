import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapReconciliationState,
  AgenticWalletMarketSwapReconciliationStateIdentityError,
  AgenticWalletMarketSwapReconciliationStateStore,
} from './agentic-wallet-market-swap-reconciliation-state.store';
import { mapPersistedAgenticWalletMarketSwapStatusObservation } from './prisma-agentic-wallet-market-swap-status-observation.store';
import {
  AgenticWalletMarketSwapSubmissionReceipt,
  isValidAgenticWalletMarketSwapSubmissionReceipt,
} from './agentic-wallet-market-swap-submission-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletMarketSwapReconciliationStateStore implements AgenticWalletMarketSwapReconciliationStateStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByGateId(
    gateId: string,
  ): Promise<AgenticWalletMarketSwapReconciliationState | null> {
    if (!UUID_PATTERN.test(gateId)) {
      throw new AgenticWalletMarketSwapReconciliationStateIdentityError();
    }

    const row = await this.prisma.realExecutionSubmissionReceipt.findUnique({
      where: { gateId },
      include: {
        statusObservations: {
          orderBy: { sequence: 'desc' },
          take: 1,
        },
      },
    });
    if (row === null) return null;

    const receipt = {
      kind: 'agentic_wallet_market_swap_submission_receipt' as const,
      providerId: row.providerId,
      gateId: row.gateId,
      providerOrderId: row.providerOrderId,
      lifecycleStatus: row.lifecycleStatus,
      providerSubmissionAcknowledged: row.providerSubmissionAcknowledged,
      terminal: row.terminal,
      executionSucceeded: row.executionSucceeded,
      statusLookupRequired: row.statusLookupRequired,
      automaticRetryAllowed: row.automaticRetryAllowed,
    } as AgenticWalletMarketSwapSubmissionReceipt;
    if (
      !isValidAgenticWalletMarketSwapSubmissionReceipt(receipt) ||
      !Number.isFinite(row.recordedAt.getTime())
    ) {
      throw new Error('Persisted market-swap submission receipt is invalid');
    }
    if (receipt.gateId !== gateId) {
      throw new Error(
        'Persisted market-swap reconciliation evidence is inconsistent',
      );
    }

    const latest =
      row.statusObservations.length === 0
        ? null
        : mapPersistedAgenticWalletMarketSwapStatusObservation(
            row.statusObservations[0],
          );
    if (
      latest !== null &&
      (latest.observation.gateId !== receipt.gateId ||
        latest.observation.providerId !== receipt.providerId ||
        latest.observation.providerOrderId !== receipt.providerOrderId ||
        latest.recordedAt.getTime() < row.recordedAt.getTime())
    ) {
      throw new Error(
        'Persisted market-swap reconciliation evidence is inconsistent',
      );
    }

    const observation = latest?.observation ?? null;
    const providerStatus = observation?.providerStatus ?? null;
    const phase =
      providerStatus === null
        ? 'awaiting_status_observation'
        : providerStatus === 'PENDING'
          ? 'provider_pending'
          : providerStatus === 'FINISHED'
            ? 'provider_finished_financial_reconciliation_required'
            : 'provider_failed';

    return {
      scope: 'agentic_wallet_market_swap_reconciliation_state',
      providerId: 'agentic_wallet',
      gateId: receipt.gateId,
      providerOrderId: receipt.providerOrderId,
      phase,
      providerStatus,
      transactionHash: observation?.transactionHash ?? null,
      receiptRecordedAt: new Date(row.recordedAt),
      latestObservationId: latest?.id ?? null,
      latestObservationRecordedAt: latest?.recordedAt ?? null,
      terminal: observation?.terminal ?? false,
      executionSucceeded: observation?.executionSucceeded ?? false,
      statusLookupRequired: observation?.statusLookupRequired ?? true,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      actualReceivedQuantity: null,
      submissionRetryAllowed: false,
    };
  }
}
