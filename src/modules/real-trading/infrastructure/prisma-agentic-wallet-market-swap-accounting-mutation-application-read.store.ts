import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapAccountingMutationApplicationIdentityError,
  AgenticWalletMarketSwapAccountingMutationApplicationReadStore,
  AppliedAgenticWalletMarketSwapAccountingMutation,
} from './agentic-wallet-market-swap-accounting-mutation-application.store';
import { mapPersistedAgenticWalletMarketSwapAccountingMutationApplication } from './prisma-agentic-wallet-market-swap-accounting-mutation-application.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletMarketSwapAccountingMutationApplicationReadStore implements AgenticWalletMarketSwapAccountingMutationApplicationReadStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByGateId(
    gateId: string,
  ): Promise<AppliedAgenticWalletMarketSwapAccountingMutation | null> {
    if (typeof gateId !== 'string' || !UUID_PATTERN.test(gateId))
      throw new AgenticWalletMarketSwapAccountingMutationApplicationIdentityError();

    const row =
      await this.prisma.realExecutionAccountingMutationApplication.findUnique({
        where: { gateId },
        include: {
          accountingMutationAuthorization: {
            include: {
              accountingMutationCommitment: {
                include: {
                  accountingBalanceEvidence: {
                    include: { financialReconciliationEvidence: true },
                  },
                },
              },
            },
          },
        },
      });
    if (row === null) return null;

    const applied =
      mapPersistedAgenticWalletMarketSwapAccountingMutationApplication(row);
    if (applied.application.gateId !== gateId)
      throw new Error('Persisted accounting mutation application is invalid');
    return applied;
  }
}
