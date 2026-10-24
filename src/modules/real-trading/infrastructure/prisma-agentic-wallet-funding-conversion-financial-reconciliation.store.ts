import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionFinancialReconciliationStore,
  FundingConversionFinancialReconciliationBlockedError,
  FundingConversionFinancialReconciliationConflictError,
  FundingConversionFinancialReconciliationContextNotFoundError,
  StoredFundingConversionFinancialReconciliation,
} from '../application/agentic-wallet-funding-conversion-financial-reconciliation.store';
import type { StoredFundingConversionStatusObservation } from '../application/agentic-wallet-funding-conversion-status-observation.store';
import {
  FundingConversionFinancialReconciliationContext,
  FundingConversionFinancialReconciliationEvidence,
  FundingConversionOutputAssessment,
  assessFundingConversionFinancialReconciliationEvidence,
  isValidFundingConversionFinancialReconciliationEvidence,
} from './agentic-wallet-funding-conversion-financial-reconciliation-evidence';
import {
  FundingConversionStatusObservation,
  isValidFundingConversionStatusObservation,
} from './agentic-wallet-funding-conversion-status-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;
const ExactDecimal = Decimal.clone({ precision: 80 });

@Injectable()
export class PrismaAgenticWalletFundingConversionFinancialReconciliationStore implements AgenticWalletFundingConversionFinancialReconciliationStore {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    id: string,
    evidence: FundingConversionFinancialReconciliationEvidence,
    recordedAt: Date,
  ): Promise<{
    reconciliation: StoredFundingConversionFinancialReconciliation;
    replayed: boolean;
  }> {
    if (
      !UUID_PATTERN.test(id) ||
      !isValidFundingConversionFinancialReconciliationEvidence(evidence) ||
      !(recordedAt instanceof Date) ||
      !Number.isFinite(recordedAt.getTime()) ||
      recordedAt.getTime() < evidence.observedAt.getTime()
    )
      throw new FundingConversionFinancialReconciliationBlockedError([
        'invalid_financial_evidence',
      ]);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261022, 135)`;
        const existing =
          await tx.agenticWalletFundingConversionFinancialReconciliation.findUnique(
            { where: { attemptId: evidence.attemptId } },
          );
        if (existing) {
          const mapped =
            mapPersistedFundingConversionFinancialReconciliation(existing);
          if (
            mapped.id !== id ||
            existing.requestFingerprint !==
              fingerprint(
                id,
                mapped.planId,
                mapped.expectedUsdt,
                mapped.minimumUsdt,
                evidence,
              )
          )
            throw new FundingConversionFinancialReconciliationConflictError();
          return { reconciliation: mapped, replayed: true };
        }

        const [attempt, statusRow] = await Promise.all([
          tx.agenticWalletFundingConversionSubmissionAttempt.findUnique({
            where: { id: evidence.attemptId },
            include: { plan: true },
          }),
          tx.agenticWalletFundingConversionStatusObservation.findUnique({
            where: { id: evidence.statusObservationId },
          }),
        ]);
        if (!attempt || !statusRow)
          throw new FundingConversionFinancialReconciliationContextNotFoundError();
        if (
          attempt.state !==
            'provider_finished_pending_financial_reconciliation' ||
          attempt.automaticRetryAllowed !== false ||
          attempt.providerOrderId !== evidence.providerOrderId ||
          attempt.plan.id !== attempt.planId ||
          statusRow.attemptId !== attempt.id
        )
          throw new FundingConversionFinancialReconciliationBlockedError([
            'invalid_reconciliation_context',
          ]);

        const statusObservation =
          mapFundingConversionStatusObservation(statusRow);
        const context: FundingConversionFinancialReconciliationContext = {
          scope:
            'agentic_wallet_funding_conversion_financial_reconciliation_context',
          attemptId: attempt.id,
          planId: attempt.planId,
          providerOrderId: evidence.providerOrderId,
          sourceQuantityBnb: attempt.freshSourceQuantityBnb,
          expectedUsdt: attempt.freshExpectedUsdt,
          minimumUsdt: attempt.freshMinimumUsdt,
          statusObservation,
        };
        const assessment =
          assessFundingConversionFinancialReconciliationEvidence(
            context,
            evidence,
          );
        if (
          assessment.evidence === null ||
          assessment.outputAssessment === null
        )
          throw new FundingConversionFinancialReconciliationBlockedError(
            assessment.blockers,
          );

        const requestFingerprint = fingerprint(
          id,
          attempt.planId,
          attempt.freshExpectedUsdt,
          attempt.freshMinimumUsdt,
          assessment.evidence,
        );
        const created =
          await tx.agenticWalletFundingConversionFinancialReconciliation.create(
            {
              data: {
                id,
                attemptId: attempt.id,
                planId: attempt.planId,
                statusObservationId: assessment.evidence.statusObservationId,
                providerOrderId: assessment.evidence.providerOrderId,
                transactionHash: assessment.evidence.transactionHash,
                chainId: assessment.evidence.chainId,
                sourceTokenAddress: assessment.evidence.sourceTokenAddress,
                targetTokenAddress: assessment.evidence.targetTokenAddress,
                submittedSourceQuantityBnb:
                  assessment.evidence.submittedSourceQuantityBnb,
                expectedUsdt: attempt.freshExpectedUsdt,
                minimumUsdt: attempt.freshMinimumUsdt,
                actualUsdtReceived: assessment.evidence.actualUsdtReceived,
                outputAssessment: assessment.outputAssessment,
                providerFeeComponents: assessment.evidence
                  .providerFeeComponents as unknown as Prisma.InputJsonValue,
                networkFeeAsset: assessment.evidence.networkFeeAsset,
                networkFeeQuantityBnb:
                  assessment.evidence.networkFeeQuantityBnb,
                observedAt: assessment.evidence.observedAt,
                requestFingerprint,
                recordedAt,
              },
            },
          );
        return {
          reconciliation:
            mapPersistedFundingConversionFinancialReconciliation(created),
          replayed: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

export function mapFundingConversionStatusObservation(row: {
  id: string;
  attemptId: string;
  providerOrderId: string;
  providerStatus: string;
  transactionHash: string | null;
  bookedAt: Date;
  providerUpdatedAt: Date;
  recordedAt: Date;
}): StoredFundingConversionStatusObservation {
  const status = row.providerStatus as 'PENDING' | 'FINISHED' | 'FAILED';
  const observation: FundingConversionStatusObservation = {
    attemptId: row.attemptId,
    providerOrderId: row.providerOrderId,
    providerStatus: status,
    transactionHash: row.transactionHash,
    bookedAt: new Date(row.bookedAt),
    providerUpdatedAt: new Date(row.providerUpdatedAt),
    terminal: status !== 'PENDING',
    executionSucceeded: status === 'FINISHED',
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    automaticRetryAllowed: false,
  };
  const stored = {
    id: row.id,
    observation,
    recordedAt: new Date(row.recordedAt),
  };
  if (
    !UUID_PATTERN.test(row.id) ||
    !isValidFundingConversionStatusObservation(observation) ||
    !Number.isFinite(stored.recordedAt.getTime()) ||
    stored.recordedAt.getTime() < observation.providerUpdatedAt.getTime()
  )
    throw new Error(
      'Persisted funding conversion status observation is invalid',
    );
  return stored;
}

export function mapPersistedFundingConversionFinancialReconciliation(row: {
  id: string;
  attemptId: string;
  planId: string;
  statusObservationId: string;
  providerOrderId: string;
  transactionHash: string;
  chainId: string;
  sourceTokenAddress: string;
  targetTokenAddress: string;
  submittedSourceQuantityBnb: string;
  expectedUsdt: string;
  minimumUsdt: string;
  actualUsdtReceived: string;
  outputAssessment: string;
  providerFeeComponents: unknown;
  networkFeeAsset: string;
  networkFeeQuantityBnb: string;
  observedAt: Date;
  requestFingerprint: string;
  recordedAt: Date;
}): StoredFundingConversionFinancialReconciliation {
  const evidence = {
    scope:
      'agentic_wallet_funding_conversion_financial_reconciliation_evidence' as const,
    attemptId: row.attemptId,
    providerOrderId: row.providerOrderId,
    statusObservationId: row.statusObservationId,
    transactionHash: row.transactionHash,
    chainId: row.chainId,
    sourceTokenAddress: row.sourceTokenAddress,
    targetTokenAddress: row.targetTokenAddress,
    submittedSourceQuantityBnb: row.submittedSourceQuantityBnb,
    actualUsdtReceived: row.actualUsdtReceived,
    providerFeeComponents: row.providerFeeComponents,
    networkFeeAsset: row.networkFeeAsset,
    networkFeeQuantityBnb: row.networkFeeQuantityBnb,
    transactionReceiptObserved: true,
    sourceBalanceDeltaObserved: true,
    targetBalanceDeltaObserved: true,
    providerFeeCoverageComplete: true,
    networkFeeCoverageComplete: true,
    observedAt: new Date(row.observedAt),
  } as FundingConversionFinancialReconciliationEvidence;
  const expectedAssessment = classify(
    row.actualUsdtReceived,
    row.minimumUsdt,
    row.expectedUsdt,
  );
  if (
    !UUID_PATTERN.test(row.id) ||
    !UUID_PATTERN.test(row.planId) ||
    !isValidFundingConversionFinancialReconciliationEvidence(evidence) ||
    expectedAssessment === null ||
    row.outputAssessment !== expectedAssessment ||
    !isCanonicalFundingConversionFinancialReconciliationRequestFingerprint(
      row.requestFingerprint,
    ) ||
    !(row.recordedAt instanceof Date) ||
    !Number.isFinite(row.recordedAt.getTime()) ||
    row.recordedAt.getTime() < evidence.observedAt.getTime() ||
    row.requestFingerprint !==
      fingerprint(
        row.id,
        row.planId,
        row.expectedUsdt,
        row.minimumUsdt,
        evidence,
      )
  )
    throw new Error(
      'Persisted funding conversion financial reconciliation is invalid',
    );
  return {
    id: row.id,
    attemptId: row.attemptId,
    planId: row.planId,
    expectedUsdt: row.expectedUsdt,
    minimumUsdt: row.minimumUsdt,
    outputAssessment: expectedAssessment,
    evidence: snapshotEvidence(evidence),
    recordedAt: new Date(row.recordedAt),
    financialReconciliationComplete: true,
    automaticRetryAllowed: false,
  };
}

export function isCanonicalFundingConversionFinancialReconciliationRequestFingerprint(
  value: unknown,
): value is string {
  return typeof value === 'string' && HASH_PATTERN.test(value);
}

function classify(
  actual: string,
  minimum: string,
  expected: string,
): FundingConversionOutputAssessment | null {
  if (
    !DECIMAL_PATTERN.test(actual) ||
    !DECIMAL_PATTERN.test(minimum) ||
    !DECIMAL_PATTERN.test(expected)
  )
    return null;
  try {
    const actualDecimal = new ExactDecimal(actual);
    const minimumDecimal = new ExactDecimal(minimum);
    const expectedDecimal = new ExactDecimal(expected);
    if (
      !actualDecimal.gt(0) ||
      !minimumDecimal.gt(0) ||
      !expectedDecimal.gt(0) ||
      minimumDecimal.gt(expectedDecimal)
    )
      return null;
    return actualDecimal.lt(minimumDecimal)
      ? 'below_accepted_minimum'
      : actualDecimal.lt(expectedDecimal)
        ? 'minimum_satisfied_below_expected'
        : 'expected_output_satisfied';
  } catch {
    return null;
  }
}

function fingerprint(
  id: string,
  planId: string,
  expectedUsdt: string,
  minimumUsdt: string,
  evidence: FundingConversionFinancialReconciliationEvidence,
): string {
  const normalizedEvidence = {
    ...evidence,
    providerFeeComponents: [...evidence.providerFeeComponents].sort(
      (left, right) => left.assetAddress.localeCompare(right.assetAddress),
    ),
  };
  return createHash('sha256')
    .update(
      JSON.stringify(
        canonicalize({
          evidence: normalizedEvidence,
          expectedUsdt,
          id,
          minimumUsdt,
          planId,
        }),
      ),
    )
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

function snapshotEvidence(
  evidence: FundingConversionFinancialReconciliationEvidence,
): FundingConversionFinancialReconciliationEvidence {
  return {
    ...evidence,
    providerFeeComponents: evidence.providerFeeComponents.map((fee) => ({
      ...fee,
    })),
    observedAt: new Date(evidence.observedAt),
  };
}
