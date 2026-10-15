import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapAccountingMutationCommitment,
  isValidAgenticWalletMarketSwapAccountingMutationCommitment,
  prepareAgenticWalletMarketSwapAccountingMutationCommitment,
} from './agentic-wallet-market-swap-accounting-mutation-commitment';
import {
  AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError,
  AgenticWalletMarketSwapAccountingMutationCommitmentConflictError,
  AgenticWalletMarketSwapAccountingMutationCommitmentStore,
  AgenticWalletMarketSwapAccountingMutationEvidenceNotFoundError,
  StoredAgenticWalletMarketSwapAccountingMutationCommitment,
  isValidStoredAgenticWalletMarketSwapAccountingMutationCommitment,
} from './agentic-wallet-market-swap-accounting-mutation-commitment.store';
import { assessAgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';
import { revalidatePersistedAgenticWalletMarketSwapAccountingBalanceEvidence } from './prisma-agentic-wallet-market-swap-accounting-balance-evidence-read.store';

export class PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore implements AgenticWalletMarketSwapAccountingMutationCommitmentStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async record(
    commitment: AgenticWalletMarketSwapAccountingMutationCommitment,
  ): Promise<{
    stored: StoredAgenticWalletMarketSwapAccountingMutationCommitment;
    replayed: boolean;
  }> {
    if (!isValidAgenticWalletMarketSwapAccountingMutationCommitment(commitment))
      throw new AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError(
        ['invalid_accounting_mutation_commitment'],
      );
    const requestFingerprint = fingerprint(commitment);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261015, 90)`;
        const existing =
          await tx.realExecutionAccountingMutationCommitment.findUnique({
            where: {
              accountingBalanceEvidenceId: commitment.plan.accountingEvidenceId,
            },
          });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint)
            throw new AgenticWalletMarketSwapAccountingMutationCommitmentConflictError();
          return {
            stored:
              mapPersistedAgenticWalletMarketSwapAccountingMutationCommitment(
                existing,
              ),
            replayed: true,
          };
        }

        const accountingRow =
          await tx.realExecutionAccountingBalanceEvidence.findUnique({
            where: { id: commitment.plan.accountingEvidenceId },
            include: { financialReconciliationEvidence: true },
          });
        if (!accountingRow)
          throw new AgenticWalletMarketSwapAccountingMutationEvidenceNotFoundError();

        const storedEvidence =
          revalidatePersistedAgenticWalletMarketSwapAccountingBalanceEvidence(
            accountingRow,
            commitment.plan.gateId,
          );
        const planAssessment =
          assessAgenticWalletMarketSwapAccountingMutationPlan(storedEvidence);
        if (planAssessment.plan === null)
          throw new AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError(
            ['invalid_accounting_mutation_plan'],
          );
        const durableAssessment =
          prepareAgenticWalletMarketSwapAccountingMutationCommitment(
            planAssessment.plan,
            commitment.mutationId,
            commitment.preparedAt,
          );
        if (
          durableAssessment.commitment === null ||
          durableAssessment.commitment.planFingerprint !==
            commitment.planFingerprint
        )
          throw new AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError(
            durableAssessment.blockers.length > 0
              ? durableAssessment.blockers
              : ['invalid_accounting_mutation_plan'],
          );

        const recordedAt = this.now();
        if (
          !(recordedAt instanceof Date) ||
          !Number.isFinite(recordedAt.getTime()) ||
          recordedAt.getTime() < commitment.preparedAt.getTime()
        )
          throw new Error(
            'Accounting mutation commitment recording metadata is invalid',
          );

        const value = durableAssessment.commitment;
        const created =
          await tx.realExecutionAccountingMutationCommitment.create({
            data: {
              id: value.mutationId,
              accountingBalanceEvidenceId: value.plan.accountingEvidenceId,
              financialReconciliationEvidenceId:
                value.plan.completionEvidenceId,
              gateId: value.plan.gateId,
              transactionHash: value.plan.transactionHash,
              planFingerprint: value.planFingerprint,
              balanceTransitions: value.plan.balanceTransitions,
              evidenceObservedAt: value.plan.evidenceObservedAt,
              evidenceRecordedAt: value.plan.evidenceRecordedAt,
              preparedAt: value.preparedAt,
              requestFingerprint,
              recordedAt,
            },
          });
        return {
          stored:
            mapPersistedAgenticWalletMarketSwapAccountingMutationCommitment(
              created,
            ),
          replayed: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function fingerprint(
  commitment: AgenticWalletMarketSwapAccountingMutationCommitment,
): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(commitment)))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}

export function mapPersistedAgenticWalletMarketSwapAccountingMutationCommitment(row: {
  id: string;
  accountingBalanceEvidenceId: string;
  financialReconciliationEvidenceId: string;
  gateId: string;
  transactionHash: string;
  planFingerprint: string;
  balanceTransitions: unknown;
  evidenceObservedAt: Date;
  evidenceRecordedAt: Date;
  preparedAt: Date;
  recordedAt: Date;
}): StoredAgenticWalletMarketSwapAccountingMutationCommitment {
  const commitment = {
    scope: 'agentic_wallet_market_swap_accounting_mutation_commitment' as const,
    mutationId: row.id,
    planFingerprint: row.planFingerprint,
    plan: {
      scope: 'agentic_wallet_market_swap_accounting_mutation_plan' as const,
      accountingEvidenceId: row.accountingBalanceEvidenceId,
      completionEvidenceId: row.financialReconciliationEvidenceId,
      gateId: row.gateId,
      transactionHash: row.transactionHash,
      balanceTransitions: row.balanceTransitions,
      evidenceObservedAt: new Date(row.evidenceObservedAt),
      evidenceRecordedAt: new Date(row.evidenceRecordedAt),
      financialReconciliationComplete: true as const,
      accountingMutationRequired: true as const,
      accountingMutationAuthorized: false as const,
      accountingMutationComplete: false as const,
      submissionRetryAllowed: false as const,
    },
    preparedAt: new Date(row.preparedAt),
    financialReconciliationComplete: true as const,
    accountingMutationRequired: true as const,
    accountingMutationAuthorized: false as const,
    accountingMutationComplete: false as const,
    submissionRetryAllowed: false as const,
  } as AgenticWalletMarketSwapAccountingMutationCommitment;
  const stored = {
    commitment,
    recordedAt: new Date(row.recordedAt),
  };
  if (
    !isValidAgenticWalletMarketSwapAccountingMutationCommitment(commitment) ||
    !isValidStoredAgenticWalletMarketSwapAccountingMutationCommitment(stored)
  )
    throw new Error('Persisted accounting mutation commitment is invalid');
  return stored;
}
