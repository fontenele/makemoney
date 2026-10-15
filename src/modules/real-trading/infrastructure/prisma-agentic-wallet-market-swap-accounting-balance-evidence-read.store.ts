import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { assessAgenticWalletMarketSwapAccountingBalanceEvidence } from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  AgenticWalletMarketSwapAccountingBalanceEvidenceIdentityError,
  AgenticWalletMarketSwapAccountingBalanceEvidenceReadStore,
} from './agentic-wallet-market-swap-accounting-balance-evidence.store';
import { assessAgenticWalletMarketSwapFinancialReconciliationCompletion } from './agentic-wallet-market-swap-financial-reconciliation-completion';
import { mapPersistedAgenticWalletMarketSwapAccountingBalanceEvidence } from './prisma-agentic-wallet-market-swap-accounting-balance-evidence.store';
import { mapPersistedAgenticWalletMarketSwapFinancialReconciliationEvidence } from './prisma-agentic-wallet-market-swap-financial-reconciliation-evidence.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore implements AgenticWalletMarketSwapAccountingBalanceEvidenceReadStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByGateId(gateId: string) {
    if (!UUID_PATTERN.test(gateId))
      throw new AgenticWalletMarketSwapAccountingBalanceEvidenceIdentityError();

    const row =
      await this.prisma.realExecutionAccountingBalanceEvidence.findUnique({
        where: { gateId },
        include: { financialReconciliationEvidence: true },
      });
    if (row === null) return null;

    const stored =
      mapPersistedAgenticWalletMarketSwapAccountingBalanceEvidence(row);
    const storedFinancial =
      mapPersistedAgenticWalletMarketSwapFinancialReconciliationEvidence(
        row.financialReconciliationEvidence,
      );
    const completionAssessment =
      assessAgenticWalletMarketSwapFinancialReconciliationCompletion(
        storedFinancial,
      );
    if (completionAssessment.completion === null)
      throw new Error('Persisted accounting balance evidence is inconsistent');
    const balanceAssessment =
      assessAgenticWalletMarketSwapAccountingBalanceEvidence(
        completionAssessment.completion,
        stored.evidence,
      );
    if (
      balanceAssessment.evidence === null ||
      balanceAssessment.evidence.gateId !== gateId
    )
      throw new Error('Persisted accounting balance evidence is inconsistent');

    return {
      id: stored.id,
      evidence: balanceAssessment.evidence,
      recordedAt: new Date(stored.recordedAt),
    };
  }
}
