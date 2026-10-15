import { createHash, randomUUID } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapAccountingBalanceEvidence,
  AgenticWalletMarketSwapBalanceChange,
  assessAgenticWalletMarketSwapAccountingBalanceEvidence,
  isValidAgenticWalletMarketSwapAccountingBalanceEvidence,
} from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  AgenticWalletMarketSwapAccountingBalanceCompletionNotFoundError,
  AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError,
  AgenticWalletMarketSwapAccountingBalanceEvidenceConflictError,
  AgenticWalletMarketSwapAccountingBalanceEvidenceStore,
  StoredAgenticWalletMarketSwapAccountingBalanceEvidence,
  isValidStoredAgenticWalletMarketSwapAccountingBalanceEvidence,
} from './agentic-wallet-market-swap-accounting-balance-evidence.store';
import { assessAgenticWalletMarketSwapFinancialReconciliationCompletion } from './agentic-wallet-market-swap-financial-reconciliation-completion';
import { mapPersistedAgenticWalletMarketSwapFinancialReconciliationEvidence } from './prisma-agentic-wallet-market-swap-financial-reconciliation-evidence.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore implements AgenticWalletMarketSwapAccountingBalanceEvidenceStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
    private readonly nextId: () => string = randomUUID,
  ) {}

  async record(
    evidence: AgenticWalletMarketSwapAccountingBalanceEvidence,
  ): Promise<{
    stored: StoredAgenticWalletMarketSwapAccountingBalanceEvidence;
    replayed: boolean;
  }> {
    if (!isValidAgenticWalletMarketSwapAccountingBalanceEvidence(evidence))
      throw new AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError([
        'invalid_accounting_balance_evidence',
      ]);
    const requestFingerprint = fingerprint(evidence);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261015, 86)`;
        const existing =
          await tx.realExecutionAccountingBalanceEvidence.findUnique({
            where: { gateId: evidence.gateId },
          });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint)
            throw new AgenticWalletMarketSwapAccountingBalanceEvidenceConflictError();
          return {
            stored:
              mapPersistedAgenticWalletMarketSwapAccountingBalanceEvidence(
                existing,
              ),
            replayed: true,
          };
        }

        const financialRow =
          await tx.realExecutionFinancialReconciliationEvidence.findUnique({
            where: { gateId: evidence.gateId },
          });
        if (!financialRow)
          throw new AgenticWalletMarketSwapAccountingBalanceCompletionNotFoundError();

        const storedFinancial =
          mapPersistedAgenticWalletMarketSwapFinancialReconciliationEvidence(
            financialRow,
          );
        const completionAssessment =
          assessAgenticWalletMarketSwapFinancialReconciliationCompletion(
            storedFinancial,
          );
        if (completionAssessment.completion === null)
          throw new Error(
            'Persisted financial reconciliation completion is invalid',
          );
        const assessment =
          assessAgenticWalletMarketSwapAccountingBalanceEvidence(
            completionAssessment.completion,
            evidence,
          );
        if (assessment.evidence === null)
          throw new AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError(
            assessment.blockers,
          );

        const recordedAt = this.now();
        const id = this.nextId();
        if (
          !UUID_PATTERN.test(id) ||
          !(recordedAt instanceof Date) ||
          !Number.isFinite(recordedAt.getTime()) ||
          recordedAt.getTime() < assessment.evidence.observedAt.getTime()
        )
          throw new Error(
            'Accounting balance evidence recording metadata is invalid',
          );

        const value = assessment.evidence;
        const created = await tx.realExecutionAccountingBalanceEvidence.create({
          data: {
            id,
            financialReconciliationEvidenceId: value.completionEvidenceId,
            gateId: value.gateId,
            transactionHash: value.transactionHash,
            balanceChanges: value.balanceChanges,
            requestFingerprint,
            observedAt: value.observedAt,
            recordedAt,
          },
        });
        return {
          stored:
            mapPersistedAgenticWalletMarketSwapAccountingBalanceEvidence(
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
  evidence: AgenticWalletMarketSwapAccountingBalanceEvidence,
): string {
  const normalized = {
    ...evidence,
    balanceChanges: [...evidence.balanceChanges].sort((left, right) =>
      balanceChangeIdentity(left).localeCompare(balanceChangeIdentity(right)),
    ),
  };
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(normalized)))
    .digest('hex');
}

function balanceChangeIdentity(
  value: AgenticWalletMarketSwapBalanceChange,
): string {
  return value.assetType === 'token'
    ? `token:${value.assetAddress}`
    : `native:${value.assetSymbol}`;
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

export function mapPersistedAgenticWalletMarketSwapAccountingBalanceEvidence(row: {
  id: string;
  financialReconciliationEvidenceId: string;
  gateId: string;
  transactionHash: string;
  balanceChanges: unknown;
  observedAt: Date;
  recordedAt: Date;
}): StoredAgenticWalletMarketSwapAccountingBalanceEvidence {
  const evidence = {
    scope: 'agentic_wallet_market_swap_accounting_balance_evidence' as const,
    completionEvidenceId: row.financialReconciliationEvidenceId,
    gateId: row.gateId,
    transactionHash: row.transactionHash,
    balanceChanges: row.balanceChanges,
    coverageComplete: true,
    observedAt: new Date(row.observedAt),
  } as AgenticWalletMarketSwapAccountingBalanceEvidence;
  const stored = {
    id: row.id,
    evidence,
    recordedAt: new Date(row.recordedAt),
  };
  if (
    !isValidAgenticWalletMarketSwapAccountingBalanceEvidence(evidence) ||
    !isValidStoredAgenticWalletMarketSwapAccountingBalanceEvidence(stored)
  )
    throw new Error('Persisted accounting balance evidence is invalid');
  return stored;
}
