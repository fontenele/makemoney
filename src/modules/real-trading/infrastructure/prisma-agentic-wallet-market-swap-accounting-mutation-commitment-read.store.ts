import { isDeepStrictEqual } from 'node:util';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from './agentic-wallet-market-swap-accounting-mutation-commitment';
import {
  AgenticWalletMarketSwapAccountingMutationCommitmentIdentityError,
  AgenticWalletMarketSwapAccountingMutationCommitmentReadStore,
} from './agentic-wallet-market-swap-accounting-mutation-commitment.store';
import { assessAgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';
import { revalidatePersistedAgenticWalletMarketSwapAccountingBalanceEvidence } from './prisma-agentic-wallet-market-swap-accounting-balance-evidence-read.store';
import { mapPersistedAgenticWalletMarketSwapAccountingMutationCommitment } from './prisma-agentic-wallet-market-swap-accounting-mutation-commitment.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletMarketSwapAccountingMutationCommitmentReadStore implements AgenticWalletMarketSwapAccountingMutationCommitmentReadStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByGateId(gateId: string) {
    if (!UUID_PATTERN.test(gateId))
      throw new AgenticWalletMarketSwapAccountingMutationCommitmentIdentityError();

    const row =
      await this.prisma.realExecutionAccountingMutationCommitment.findUnique({
        where: { gateId },
        include: {
          accountingBalanceEvidence: {
            include: { financialReconciliationEvidence: true },
          },
        },
      });
    if (row === null) return null;

    return revalidatePersistedAgenticWalletMarketSwapAccountingMutationCommitment(
      row,
      gateId,
    );
  }
}

export function revalidatePersistedAgenticWalletMarketSwapAccountingMutationCommitment(
  row: Parameters<
    typeof mapPersistedAgenticWalletMarketSwapAccountingMutationCommitment
  >[0] & {
    accountingBalanceEvidence: Parameters<
      typeof revalidatePersistedAgenticWalletMarketSwapAccountingBalanceEvidence
    >[0];
  },
  gateId: string,
) {
  const stored =
    mapPersistedAgenticWalletMarketSwapAccountingMutationCommitment(row);
  const storedEvidence =
    revalidatePersistedAgenticWalletMarketSwapAccountingBalanceEvidence(
      row.accountingBalanceEvidence,
      gateId,
    );
  const planAssessment =
    assessAgenticWalletMarketSwapAccountingMutationPlan(storedEvidence);
  if (planAssessment.plan === null)
    throw new Error('Persisted accounting mutation commitment is inconsistent');
  const commitmentAssessment =
    prepareAgenticWalletMarketSwapAccountingMutationCommitment(
      planAssessment.plan,
      stored.commitment.mutationId,
      stored.commitment.preparedAt,
    );
  if (
    commitmentAssessment.commitment === null ||
    !isDeepStrictEqual(commitmentAssessment.commitment, stored.commitment)
  )
    throw new Error('Persisted accounting mutation commitment is inconsistent');

  return {
    commitment: commitmentAssessment.commitment,
    recordedAt: new Date(stored.recordedAt),
  };
}
