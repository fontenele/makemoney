import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapReconciliationState,
  AgenticWalletMarketSwapReconciliationStateIdentityError,
  AgenticWalletMarketSwapReconciliationStateStore,
  projectAgenticWalletMarketSwapReconciliationState,
} from './agentic-wallet-market-swap-reconciliation-state.store';
import { mapPersistedAgenticWalletMarketSwapSubmissionReceipt } from './prisma-agentic-wallet-market-swap-submission-receipt.store';
import { mapPersistedAgenticWalletMarketSwapStatusObservation } from './prisma-agentic-wallet-market-swap-status-observation.store';

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

    const storedReceipt =
      mapPersistedAgenticWalletMarketSwapSubmissionReceipt(row);
    if (storedReceipt.receipt.gateId !== gateId) {
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
      (latest.observation.gateId !== storedReceipt.receipt.gateId ||
        latest.observation.providerId !== storedReceipt.receipt.providerId ||
        latest.observation.providerOrderId !==
          storedReceipt.receipt.providerOrderId ||
        latest.recordedAt.getTime() < storedReceipt.recordedAt.getTime())
    ) {
      throw new Error(
        'Persisted market-swap reconciliation evidence is inconsistent',
      );
    }

    return projectAgenticWalletMarketSwapReconciliationState(
      storedReceipt,
      latest,
    );
  }
}
