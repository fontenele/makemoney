import { createHash, randomUUID } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { projectAgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';
import {
  AgenticWalletMarketSwapFinancialReconciliationEvidence,
  assessAgenticWalletMarketSwapFinancialReconciliationEvidence,
  isValidAgenticWalletMarketSwapFinancialReconciliationEvidence,
} from './agentic-wallet-market-swap-financial-reconciliation-evidence';
import {
  AgenticWalletMarketSwapFinancialReconciliationContextNotFoundError,
  AgenticWalletMarketSwapFinancialReconciliationEvidenceBlockedError,
  AgenticWalletMarketSwapFinancialReconciliationEvidenceConflictError,
  AgenticWalletMarketSwapFinancialReconciliationEvidenceStore,
  StoredAgenticWalletMarketSwapFinancialReconciliationEvidence,
  isValidStoredAgenticWalletMarketSwapFinancialReconciliationEvidence,
} from './agentic-wallet-market-swap-financial-reconciliation-evidence.store';
import { mapPersistedAgenticWalletMarketSwapStatusObservation } from './prisma-agentic-wallet-market-swap-status-observation.store';
import { mapPersistedAgenticWalletMarketSwapSubmissionReceipt } from './prisma-agentic-wallet-market-swap-submission-receipt.store';
import { mapPersistedRealExecutionSubmissionGate } from './prisma-real-execution-submission-gate.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore implements AgenticWalletMarketSwapFinancialReconciliationEvidenceStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
    private readonly nextId: () => string = randomUUID,
  ) {}

  async record(
    evidence: AgenticWalletMarketSwapFinancialReconciliationEvidence,
  ): Promise<{
    stored: StoredAgenticWalletMarketSwapFinancialReconciliationEvidence;
    replayed: boolean;
  }> {
    const requestFingerprint = fingerprint(evidence);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261009, 81)`;
        const existing =
          await tx.realExecutionFinancialReconciliationEvidence.findUnique({
            where: { gateId: evidence.gateId },
          });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint)
            throw new AgenticWalletMarketSwapFinancialReconciliationEvidenceConflictError();
          return {
            stored:
              mapPersistedAgenticWalletMarketSwapFinancialReconciliationEvidence(
                existing,
              ),
            replayed: true,
          };
        }

        const [gateRow, receiptRow, observationRow] = await Promise.all([
          tx.realExecutionSubmissionGate.findUnique({
            where: { id: evidence.gateId },
          }),
          tx.realExecutionSubmissionReceipt.findUnique({
            where: { gateId: evidence.gateId },
          }),
          tx.realExecutionStatusObservation.findFirst({
            where: { gateId: evidence.gateId },
            orderBy: { sequence: 'desc' },
          }),
        ]);
        if (!gateRow || !receiptRow || !observationRow)
          throw new AgenticWalletMarketSwapFinancialReconciliationContextNotFoundError();

        const gate = mapPersistedRealExecutionSubmissionGate(gateRow);
        const receipt =
          mapPersistedAgenticWalletMarketSwapSubmissionReceipt(receiptRow);
        const observation =
          mapPersistedAgenticWalletMarketSwapStatusObservation(observationRow);
        const state = projectAgenticWalletMarketSwapReconciliationState(
          receipt,
          observation,
        );
        const assessment =
          assessAgenticWalletMarketSwapFinancialReconciliationEvidence(
            gate,
            state,
            evidence,
          );
        if (assessment.evidence === null)
          throw new AgenticWalletMarketSwapFinancialReconciliationEvidenceBlockedError(
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
            'Financial reconciliation evidence recording metadata is invalid',
          );

        const value = assessment.evidence;
        const created =
          await tx.realExecutionFinancialReconciliationEvidence.create({
            data: {
              id,
              gateId: value.gateId,
              statusObservationId: value.statusObservationId,
              providerId: value.providerId,
              providerOrderId: value.providerOrderId,
              chainId: value.chainId,
              transactionHash: value.transactionHash,
              sourceTokenAddress: value.sourceTokenAddress,
              targetTokenAddress: value.targetTokenAddress,
              submittedSourceQuantity: value.submittedSourceQuantity,
              actualTargetReceivedQuantity: value.actualTargetReceivedQuantity,
              providerFeeComponents:
                value.providerFeeComponents as unknown as Prisma.InputJsonValue,
              networkFeeAsset: value.networkFeeAsset,
              networkFeeQuantity: value.networkFeeQuantity,
              requestFingerprint,
              observedAt: value.observedAt,
              recordedAt,
            },
          });
        return {
          stored:
            mapPersistedAgenticWalletMarketSwapFinancialReconciliationEvidence(
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
  evidence: AgenticWalletMarketSwapFinancialReconciliationEvidence,
): string {
  const normalized = {
    ...evidence,
    providerFeeComponents: [...evidence.providerFeeComponents].sort((a, b) =>
      a.assetAddress.localeCompare(b.assetAddress),
    ),
  };
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(normalized)))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}

export function mapPersistedAgenticWalletMarketSwapFinancialReconciliationEvidence(row: {
  id: string;
  gateId: string;
  statusObservationId: string;
  providerId: string;
  providerOrderId: string;
  chainId: string;
  transactionHash: string;
  sourceTokenAddress: string;
  targetTokenAddress: string;
  submittedSourceQuantity: string;
  actualTargetReceivedQuantity: string;
  providerFeeComponents: unknown;
  networkFeeAsset: string;
  networkFeeQuantity: string;
  observedAt: Date;
  recordedAt: Date;
}): StoredAgenticWalletMarketSwapFinancialReconciliationEvidence {
  const evidence = {
    scope:
      'agentic_wallet_market_swap_financial_reconciliation_evidence' as const,
    providerId: row.providerId,
    chainId: row.chainId,
    gateId: row.gateId,
    providerOrderId: row.providerOrderId,
    statusObservationId: row.statusObservationId,
    transactionHash: row.transactionHash,
    sourceTokenAddress: row.sourceTokenAddress,
    targetTokenAddress: row.targetTokenAddress,
    submittedSourceQuantity: row.submittedSourceQuantity,
    actualTargetReceivedQuantity: row.actualTargetReceivedQuantity,
    providerFeeComponents: row.providerFeeComponents,
    networkFeeAsset: row.networkFeeAsset,
    networkFeeQuantity: row.networkFeeQuantity,
    transactionReceiptObserved: true,
    targetBalanceDeltaObserved: true,
    providerFeeCoverageComplete: true,
    networkFeeCoverageComplete: true,
    observedAt: new Date(row.observedAt),
  } as AgenticWalletMarketSwapFinancialReconciliationEvidence;
  const stored = {
    id: row.id,
    evidence,
    recordedAt: new Date(row.recordedAt),
  };
  if (
    !isValidAgenticWalletMarketSwapFinancialReconciliationEvidence(evidence) ||
    !isValidStoredAgenticWalletMarketSwapFinancialReconciliationEvidence(stored)
  )
    throw new Error('Persisted financial reconciliation evidence is invalid');
  return stored;
}
