import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapAccountingMutationApplication,
  AgenticWalletMarketSwapLocalAccountingBalance,
  isValidAgenticWalletMarketSwapAccountingMutationApplication,
  prepareAgenticWalletMarketSwapAccountingMutationApplication,
} from './agentic-wallet-market-swap-accounting-mutation-application';
import {
  AgenticWalletMarketSwapAccountingLedgerMismatchError,
  AgenticWalletMarketSwapAccountingMutationApplicationBlockedError,
  AgenticWalletMarketSwapAccountingMutationApplicationConflictError,
  AgenticWalletMarketSwapAccountingMutationApplicationStore,
  AgenticWalletMarketSwapAccountingMutationAuthorizationNotFoundError,
  AppliedAgenticWalletMarketSwapAccountingMutation,
} from './agentic-wallet-market-swap-accounting-mutation-application.store';
import { mapPersistedAgenticWalletMarketSwapAccountingMutationAuthorization } from './prisma-agentic-wallet-market-swap-accounting-mutation-authorization.store';

type AuthorizationRelation = Parameters<
  typeof mapPersistedAgenticWalletMarketSwapAccountingMutationAuthorization
>[0];

type ApplicationRow = {
  id: string;
  authorizationId: string;
  accountingMutationCommitmentId: string;
  accountingBalanceEvidenceId: string;
  financialReconciliationEvidenceId: string;
  gateId: string;
  transactionHash: string;
  planFingerprint: string;
  acknowledgment: string;
  currentBalances: unknown;
  balanceTransitions: unknown;
  authorizationRecordedAt: Date;
  balancesObservedAt: Date;
  preparedAt: Date;
  requestFingerprint: string;
  appliedAt: Date;
  accountingMutationAuthorization: AuthorizationRelation;
};

export class PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore implements AgenticWalletMarketSwapAccountingMutationApplicationStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async apply(
    application: AgenticWalletMarketSwapAccountingMutationApplication,
  ): Promise<{
    applied: AppliedAgenticWalletMarketSwapAccountingMutation;
    replayed: boolean;
  }> {
    if (
      !isValidAgenticWalletMarketSwapAccountingMutationApplication(application)
    )
      throw new AgenticWalletMarketSwapAccountingMutationApplicationBlockedError(
        ['invalid_accounting_mutation_application_request'],
      );

    const requestFingerprint = fingerprint(application);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261016, 96)`;
        const existing =
          await tx.realExecutionAccountingMutationApplication.findFirst({
            where: {
              OR: [
                { id: application.applicationId },
                { authorizationId: application.authorizationId },
                { accountingMutationCommitmentId: application.mutationId },
                { gateId: application.gateId },
                { transactionHash: application.transactionHash },
                { planFingerprint: application.planFingerprint },
              ],
            },
            include: authorizationInclude,
          });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint)
            throw new AgenticWalletMarketSwapAccountingMutationApplicationConflictError();
          return {
            applied:
              mapPersistedAgenticWalletMarketSwapAccountingMutationApplication(
                existing,
              ),
            replayed: true,
          };
        }

        const authorizationRow =
          await tx.realExecutionAccountingMutationAuthorization.findUnique({
            where: { id: application.authorizationId },
            include: authorizationRelationInclude,
          });
        if (!authorizationRow)
          throw new AgenticWalletMarketSwapAccountingMutationAuthorizationNotFoundError();
        const storedAuthorization =
          mapPersistedAgenticWalletMarketSwapAccountingMutationAuthorization(
            authorizationRow,
          );

        const identities = application.balanceTransitions.map(assetIdentity);
        const balanceRows = await tx.realExecutionAccountingBalance.findMany({
          where: { assetIdentity: { in: identities } },
        });
        const currentBalances = balanceRows.map(mapBalance);
        const assessment =
          prepareAgenticWalletMarketSwapAccountingMutationApplication(
            storedAuthorization,
            {
              applicationId: application.applicationId,
              authorizationId: application.authorizationId,
              mutationId: application.mutationId,
              planFingerprint: application.planFingerprint,
              gateId: application.gateId,
              transactionHash: application.transactionHash,
              acknowledgment: application.acknowledgment,
              currentBalances,
              balanceCoverageComplete: true,
              balancesObservedAt: application.balancesObservedAt,
              preparedAt: application.preparedAt,
            },
          );
        if (
          assessment.application === null ||
          fingerprint(assessment.application) !== requestFingerprint
        )
          throw new AgenticWalletMarketSwapAccountingLedgerMismatchError();

        const appliedAt = this.now();
        if (
          !(appliedAt instanceof Date) ||
          !Number.isFinite(appliedAt.getTime()) ||
          appliedAt.getTime() < application.preparedAt.getTime()
        )
          throw new Error('Accounting mutation application time is invalid');

        for (const transition of application.balanceTransitions) {
          const updated = await tx.realExecutionAccountingBalance.updateMany({
            where: {
              assetIdentity: assetIdentity(transition),
              quantity: transition.beforeQuantity,
            },
            data: {
              quantity: transition.afterQuantity,
              updatedAt: appliedAt,
            },
          });
          if (updated.count !== 1)
            throw new AgenticWalletMarketSwapAccountingLedgerMismatchError();
        }

        const plan =
          storedAuthorization.authorization.commitment.commitment.plan;
        const created =
          await tx.realExecutionAccountingMutationApplication.create({
            data: {
              id: application.applicationId,
              authorizationId: application.authorizationId,
              accountingMutationCommitmentId: application.mutationId,
              accountingBalanceEvidenceId: plan.accountingEvidenceId,
              financialReconciliationEvidenceId: plan.completionEvidenceId,
              gateId: application.gateId,
              transactionHash: application.transactionHash,
              planFingerprint: application.planFingerprint,
              acknowledgment: application.acknowledgment,
              currentBalances: application.currentBalances,
              balanceTransitions: application.balanceTransitions,
              authorizationRecordedAt: application.authorizationRecordedAt,
              balancesObservedAt: application.balancesObservedAt,
              preparedAt: application.preparedAt,
              requestFingerprint,
              appliedAt,
            },
            include: authorizationInclude,
          });
        return {
          applied:
            mapPersistedAgenticWalletMarketSwapAccountingMutationApplication(
              created,
            ),
          replayed: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

const authorizationRelationInclude = {
  accountingMutationCommitment: {
    include: {
      accountingBalanceEvidence: {
        include: { financialReconciliationEvidence: true },
      },
    },
  },
} as const;

const authorizationInclude = {
  accountingMutationAuthorization: {
    include: authorizationRelationInclude,
  },
} as const;

export function mapPersistedAgenticWalletMarketSwapAccountingMutationApplication(
  row: ApplicationRow,
): AppliedAgenticWalletMarketSwapAccountingMutation {
  const storedAuthorization =
    mapPersistedAgenticWalletMarketSwapAccountingMutationAuthorization(
      row.accountingMutationAuthorization,
    );
  const assessment =
    prepareAgenticWalletMarketSwapAccountingMutationApplication(
      storedAuthorization,
      {
        applicationId: row.id,
        authorizationId: row.authorizationId,
        mutationId: row.accountingMutationCommitmentId,
        planFingerprint: row.planFingerprint,
        gateId: row.gateId,
        transactionHash: row.transactionHash,
        acknowledgment:
          row.acknowledgment as AgenticWalletMarketSwapAccountingMutationApplication['acknowledgment'],
        currentBalances:
          row.currentBalances as AgenticWalletMarketSwapLocalAccountingBalance[],
        balanceCoverageComplete: true,
        balancesObservedAt: new Date(row.balancesObservedAt),
        preparedAt: new Date(row.preparedAt),
      },
    );
  const application = assessment.application;
  const plan = storedAuthorization.authorization.commitment.commitment.plan;
  if (
    application === null ||
    row.accountingBalanceEvidenceId !== plan.accountingEvidenceId ||
    row.financialReconciliationEvidenceId !== plan.completionEvidenceId ||
    row.authorizationRecordedAt.getTime() !==
      application.authorizationRecordedAt.getTime() ||
    JSON.stringify(canonicalize(row.balanceTransitions)) !==
      JSON.stringify(canonicalize(application.balanceTransitions)) ||
    row.requestFingerprint !== fingerprint(application) ||
    !(row.appliedAt instanceof Date) ||
    !Number.isFinite(row.appliedAt.getTime()) ||
    row.appliedAt.getTime() < application.preparedAt.getTime()
  )
    throw new Error('Persisted accounting mutation application is invalid');

  return {
    scope: 'applied_agentic_wallet_market_swap_accounting_mutation',
    application,
    appliedAt: new Date(row.appliedAt),
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationAuthorized: true,
    accountingMutationPrepared: true,
    accountingMutationComplete: true,
    submissionRetryAllowed: false,
  };
}

function mapBalance(row: {
  assetIdentity: string;
  assetType: string;
  assetAddress: string | null;
  assetSymbol: string | null;
  quantity: string;
}): AgenticWalletMarketSwapLocalAccountingBalance {
  const balance =
    row.assetType === 'token'
      ? {
          assetType: 'token' as const,
          assetAddress: row.assetAddress ?? '',
          currentQuantity: row.quantity,
        }
      : {
          assetType: 'native' as const,
          assetSymbol: row.assetSymbol as 'BNB',
          currentQuantity: row.quantity,
        };
  if (assetIdentity(balance) !== row.assetIdentity)
    throw new AgenticWalletMarketSwapAccountingLedgerMismatchError();
  return balance;
}

function assetIdentity(value: {
  assetType: string;
  assetAddress?: string;
  assetSymbol?: string;
}): string {
  return value.assetType === 'token'
    ? `token:${value.assetAddress ?? ''}`
    : `native:${value.assetSymbol ?? ''}`;
}

function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value
      .map(canonicalize)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}
