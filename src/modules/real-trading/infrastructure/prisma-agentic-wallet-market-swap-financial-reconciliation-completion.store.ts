import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { assessAgenticWalletMarketSwapFinancialReconciliationCompletion } from './agentic-wallet-market-swap-financial-reconciliation-completion';
import {
  AgenticWalletMarketSwapFinancialReconciliationCompletionIdentityError,
  AgenticWalletMarketSwapFinancialReconciliationCompletionStore,
} from './agentic-wallet-market-swap-financial-reconciliation-completion.store';
import { mapPersistedAgenticWalletMarketSwapFinancialReconciliationEvidence } from './prisma-agentic-wallet-market-swap-financial-reconciliation-evidence.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletMarketSwapFinancialReconciliationCompletionStore implements AgenticWalletMarketSwapFinancialReconciliationCompletionStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByGateId(gateId: string) {
    if (!UUID_PATTERN.test(gateId))
      throw new AgenticWalletMarketSwapFinancialReconciliationCompletionIdentityError();

    const row =
      await this.prisma.realExecutionFinancialReconciliationEvidence.findUnique(
        { where: { gateId } },
      );
    if (row === null) return null;

    const stored =
      mapPersistedAgenticWalletMarketSwapFinancialReconciliationEvidence(row);
    const assessment =
      assessAgenticWalletMarketSwapFinancialReconciliationCompletion(stored);
    if (
      assessment.completion === null ||
      assessment.completion.gateId !== gateId
    )
      throw new Error(
        'Persisted financial reconciliation completion is inconsistent',
      );
    return assessment.completion;
  }
}
