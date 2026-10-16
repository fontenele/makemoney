import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapAccountingMutationAuthorizationIdentityError,
  AgenticWalletMarketSwapAccountingMutationAuthorizationReadStore,
} from './agentic-wallet-market-swap-accounting-mutation-authorization.store';
import { mapPersistedAgenticWalletMarketSwapAccountingMutationAuthorization } from './prisma-agentic-wallet-market-swap-accounting-mutation-authorization.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore implements AgenticWalletMarketSwapAccountingMutationAuthorizationReadStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByGateId(gateId: string) {
    if (!UUID_PATTERN.test(gateId))
      throw new AgenticWalletMarketSwapAccountingMutationAuthorizationIdentityError();

    const row =
      await this.prisma.realExecutionAccountingMutationAuthorization.findUnique(
        {
          where: { gateId },
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
      );
    if (row === null) return null;

    return mapPersistedAgenticWalletMarketSwapAccountingMutationAuthorization(
      row,
    );
  }
}
