import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
  AgenticWalletMarketSwapAccountingMutationAuthorization,
  authorizeAgenticWalletMarketSwapAccountingMutation,
  isValidAgenticWalletMarketSwapAccountingMutationAuthorization,
} from './agentic-wallet-market-swap-accounting-mutation-authorization';
import {
  AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError,
  AgenticWalletMarketSwapAccountingMutationAuthorizationConflictError,
  AgenticWalletMarketSwapAccountingMutationAuthorizationStore,
  AgenticWalletMarketSwapAccountingMutationCommitmentNotFoundError,
  StoredAgenticWalletMarketSwapAccountingMutationAuthorization,
} from './agentic-wallet-market-swap-accounting-mutation-authorization.store';
import { revalidatePersistedAgenticWalletMarketSwapAccountingMutationCommitment } from './prisma-agentic-wallet-market-swap-accounting-mutation-commitment-read.store';

type CommitmentRelation = Parameters<
  typeof revalidatePersistedAgenticWalletMarketSwapAccountingMutationCommitment
>[0];

export class PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore implements AgenticWalletMarketSwapAccountingMutationAuthorizationStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async record(
    authorization: AgenticWalletMarketSwapAccountingMutationAuthorization,
  ): Promise<{
    stored: StoredAgenticWalletMarketSwapAccountingMutationAuthorization;
    replayed: boolean;
  }> {
    if (
      !isValidAgenticWalletMarketSwapAccountingMutationAuthorization(
        authorization,
      )
    )
      throw new AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError(
        ['invalid_accounting_mutation_authorization_request'],
      );

    const requestFingerprint = fingerprint(authorization);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261015, 93)`;
        const existing =
          await tx.realExecutionAccountingMutationAuthorization.findUnique({
            where: {
              accountingMutationCommitmentId:
                authorization.commitment.commitment.mutationId,
            },
            include: commitmentInclude,
          });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint)
            throw new AgenticWalletMarketSwapAccountingMutationAuthorizationConflictError();
          return {
            stored:
              mapPersistedAgenticWalletMarketSwapAccountingMutationAuthorization(
                existing,
              ),
            replayed: true,
          };
        }

        const commitmentRow =
          await tx.realExecutionAccountingMutationCommitment.findUnique({
            where: { id: authorization.commitment.commitment.mutationId },
            include: {
              accountingBalanceEvidence: {
                include: { financialReconciliationEvidence: true },
              },
            },
          });
        if (!commitmentRow)
          throw new AgenticWalletMarketSwapAccountingMutationCommitmentNotFoundError();

        const storedCommitment =
          revalidatePersistedAgenticWalletMarketSwapAccountingMutationCommitment(
            commitmentRow,
            authorization.commitment.commitment.plan.gateId,
          );
        const assessment = authorizeAgenticWalletMarketSwapAccountingMutation(
          storedCommitment,
          {
            authorizationId: authorization.authorizationId,
            mutationId: authorization.commitment.commitment.mutationId,
            planFingerprint:
              authorization.commitment.commitment.planFingerprint,
            gateId: authorization.commitment.commitment.plan.gateId,
            transactionHash:
              authorization.commitment.commitment.plan.transactionHash,
            acknowledgment: authorization.acknowledgment,
            authorizedAt: authorization.authorizedAt,
          },
        );
        if (assessment.authorization === null)
          throw new AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError(
            assessment.blockers,
          );

        const recordedAt = this.now();
        if (
          !(recordedAt instanceof Date) ||
          !Number.isFinite(recordedAt.getTime()) ||
          recordedAt.getTime() < authorization.authorizedAt.getTime()
        )
          throw new Error(
            'Accounting mutation authorization recording metadata is invalid',
          );

        const value = assessment.authorization;
        const created =
          await tx.realExecutionAccountingMutationAuthorization.create({
            data: {
              id: value.authorizationId,
              accountingMutationCommitmentId:
                value.commitment.commitment.mutationId,
              accountingBalanceEvidenceId:
                value.commitment.commitment.plan.accountingEvidenceId,
              financialReconciliationEvidenceId:
                value.commitment.commitment.plan.completionEvidenceId,
              gateId: value.commitment.commitment.plan.gateId,
              transactionHash: value.commitment.commitment.plan.transactionHash,
              planFingerprint: value.commitment.commitment.planFingerprint,
              acknowledgment: value.acknowledgment,
              authorizedAt: value.authorizedAt,
              requestFingerprint,
              recordedAt,
            },
            include: commitmentInclude,
          });
        return {
          stored:
            mapPersistedAgenticWalletMarketSwapAccountingMutationAuthorization(
              created,
            ),
          replayed: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

const commitmentInclude = {
  accountingMutationCommitment: {
    include: {
      accountingBalanceEvidence: {
        include: { financialReconciliationEvidence: true },
      },
    },
  },
} as const;

function fingerprint(
  authorization: AgenticWalletMarketSwapAccountingMutationAuthorization,
): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(authorization)))
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

export function mapPersistedAgenticWalletMarketSwapAccountingMutationAuthorization(row: {
  id: string;
  accountingMutationCommitmentId: string;
  accountingBalanceEvidenceId: string;
  financialReconciliationEvidenceId: string;
  gateId: string;
  transactionHash: string;
  planFingerprint: string;
  acknowledgment: string;
  authorizedAt: Date;
  recordedAt: Date;
  accountingMutationCommitment: CommitmentRelation;
}): StoredAgenticWalletMarketSwapAccountingMutationAuthorization {
  const storedCommitment =
    revalidatePersistedAgenticWalletMarketSwapAccountingMutationCommitment(
      row.accountingMutationCommitment,
      row.gateId,
    );
  if (
    row.accountingMutationCommitmentId !==
      storedCommitment.commitment.mutationId ||
    row.accountingBalanceEvidenceId !==
      storedCommitment.commitment.plan.accountingEvidenceId ||
    row.financialReconciliationEvidenceId !==
      storedCommitment.commitment.plan.completionEvidenceId ||
    row.transactionHash !== storedCommitment.commitment.plan.transactionHash ||
    row.planFingerprint !== storedCommitment.commitment.planFingerprint ||
    row.acknowledgment !== ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT
  )
    throw new Error('Persisted accounting mutation authorization is invalid');

  const assessment = authorizeAgenticWalletMarketSwapAccountingMutation(
    storedCommitment,
    {
      authorizationId: row.id,
      mutationId: row.accountingMutationCommitmentId,
      planFingerprint: row.planFingerprint,
      gateId: row.gateId,
      transactionHash: row.transactionHash,
      acknowledgment: ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
      authorizedAt: new Date(row.authorizedAt),
    },
  );
  if (assessment.authorization === null)
    throw new Error('Persisted accounting mutation authorization is invalid');
  if (
    !(row.recordedAt instanceof Date) ||
    !Number.isFinite(row.recordedAt.getTime()) ||
    row.recordedAt.getTime() < row.authorizedAt.getTime()
  )
    throw new Error('Persisted accounting mutation authorization is invalid');

  return {
    authorization: assessment.authorization,
    recordedAt: new Date(row.recordedAt),
  };
}
