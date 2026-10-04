import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { isStructurallyValidAgenticWalletMarketSwapGate } from './agentic-wallet-market-swap-command';
import {
  AgenticWalletMarketSwapStatusReconciliationContext,
  AgenticWalletMarketSwapStatusReconciliationContextIdentityError,
  AgenticWalletMarketSwapStatusReconciliationContextStore,
} from './agentic-wallet-market-swap-status-reconciliation-context.store';
import { projectAgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';
import { mapPersistedAgenticWalletMarketSwapSubmissionReceipt } from './prisma-agentic-wallet-market-swap-submission-receipt.store';
import { mapPersistedAgenticWalletMarketSwapStatusObservation } from './prisma-agentic-wallet-market-swap-status-observation.store';
import { mapPersistedRealExecutionSubmissionGate } from './prisma-real-execution-submission-gate.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletMarketSwapStatusReconciliationContextStore implements AgenticWalletMarketSwapStatusReconciliationContextStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByGateId(
    gateId: string,
  ): Promise<AgenticWalletMarketSwapStatusReconciliationContext | null> {
    if (!UUID_PATTERN.test(gateId)) {
      throw new AgenticWalletMarketSwapStatusReconciliationContextIdentityError();
    }

    const row = await this.prisma.realExecutionSubmissionGate.findUnique({
      where: { id: gateId },
      include: {
        submissionReceipt: {
          include: {
            statusObservations: {
              orderBy: { sequence: 'desc' },
              take: 1,
            },
          },
        },
      },
    });
    if (row === null || row.submissionReceipt === null) return null;

    const gate = mapPersistedRealExecutionSubmissionGate(row);
    if (!isStructurallyValidAgenticWalletMarketSwapGate(gate)) {
      throw new Error('Persisted real execution submission gate is invalid');
    }
    const submissionReceipt =
      mapPersistedAgenticWalletMarketSwapSubmissionReceipt(
        row.submissionReceipt,
      );
    const latest =
      row.submissionReceipt.statusObservations.length === 0
        ? null
        : mapPersistedAgenticWalletMarketSwapStatusObservation(
            row.submissionReceipt.statusObservations[0],
          );
    if (
      gate.id !== gateId ||
      submissionReceipt.receipt.gateId !== gate.id ||
      submissionReceipt.recordedAt.getTime() < gate.createdAt.getTime()
    ) {
      throw new Error(
        'Persisted market-swap reconciliation context is inconsistent',
      );
    }

    const reconciliationState =
      projectAgenticWalletMarketSwapReconciliationState(
        submissionReceipt,
        latest,
      );
    return { gate, submissionReceipt, reconciliationState };
  }
}
