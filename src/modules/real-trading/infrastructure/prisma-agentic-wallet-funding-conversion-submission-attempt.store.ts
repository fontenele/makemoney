import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionSubmissionAttemptStore,
  AgenticWalletFundingConversionSubmissionClaim,
  FundingConversionSubmissionClaimBlockedError,
  FundingConversionSubmissionClaimConflictError,
  StoredAgenticWalletFundingConversionSubmissionAttempt,
} from '../application/agentic-wallet-funding-conversion-submission-attempt.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

@Injectable()
export class PrismaAgenticWalletFundingConversionSubmissionAttemptStore implements AgenticWalletFundingConversionSubmissionAttemptStore {
  constructor(private readonly prisma: PrismaService) {}

  async claim(claim: AgenticWalletFundingConversionSubmissionClaim): Promise<{
    attempt: StoredAgenticWalletFundingConversionSubmissionAttempt;
    replayed: boolean;
  }> {
    validateClaimShape(claim);
    const confirmationPhraseDigest = digest(claim.confirmationPhrase);
    const requestFingerprint = digest(
      JSON.stringify({
        confirmationPhraseDigest,
        freshSourceQuantityBnb: claim.freshSourceQuantityBnb,
        freshExpectedUsdt: claim.freshExpectedUsdt,
        freshMinimumUsdt: claim.freshMinimumUsdt,
        freshMaximumSlippagePercent: claim.freshMaximumSlippagePercent,
        freshRemainingQuantityBnb: claim.freshRemainingQuantityBnb,
        preConversionWalletAddress: claim.preConversionWalletAddress,
        preConversionBalanceBlockNumber: claim.preConversionBalanceBlockNumber,
        preConversionBnbBalance: claim.preConversionBnbBalance,
        preConversionUsdtBalance: claim.preConversionUsdtBalance,
        preConversionBalanceObservedAt:
          claim.preConversionBalanceObservedAt.toISOString(),
        providerFeeRate: claim.providerFeeRate,
        providerFeeUsd: claim.providerFeeUsd,
        estimatedNetworkFeeUsd: claim.estimatedNetworkFeeUsd,
        feeEvidenceGasMode: claim.feeEvidenceGasMode,
        feeEvidenceObservedAt: claim.feeEvidenceObservedAt.toISOString(),
        id: claim.id,
        planFingerprint: claim.planFingerprint,
        planId: claim.planId,
        startedAt: claim.startedAt.toISOString(),
      }),
    );

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261022, 127)`;
        const existing =
          await tx.agenticWalletFundingConversionSubmissionAttempt.findUnique({
            where: { planId: claim.planId },
          });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint) {
            throw new FundingConversionSubmissionClaimConflictError();
          }
          return { attempt: mapAttempt(existing), replayed: true };
        }

        const plan = await tx.agenticWalletFundingConversionPlan.findUnique({
          where: { id: claim.planId },
        });
        const blockers: string[] = [];
        if (!plan) blockers.push('plan_not_found');
        if (plan && plan.fingerprint !== claim.planFingerprint)
          blockers.push('plan_fingerprint_mismatch');
        if (plan && plan.confirmationPhraseDigest !== confirmationPhraseDigest)
          blockers.push('confirmation_phrase_mismatch');
        if (plan && !plan.executionConfigurationReady)
          blockers.push('plan_configuration_not_ready');
        if (
          plan &&
          new Decimal(claim.freshSourceQuantityBnb).toFixed() !==
            new Decimal(plan.sourceQuantityBnb).toFixed()
        )
          blockers.push('fresh_source_quantity_mismatch');
        if (
          plan &&
          new Decimal(claim.freshMaximumSlippagePercent).toFixed() !==
            new Decimal(plan.maximumSlippagePercent).toFixed()
        )
          blockers.push('fresh_slippage_mismatch');
        if (
          plan &&
          claim.startedAt.getTime() > plan.confirmationExpiresAt.getTime()
        )
          blockers.push('confirmation_expired');
        if (
          plan &&
          new Decimal(claim.freshMinimumUsdt).lessThan(plan.minimumUsdt)
        )
          blockers.push('fresh_minimum_below_plan_minimum');
        if (
          plan &&
          (plan.minimumGasReserveBnb === null ||
            new Decimal(claim.freshRemainingQuantityBnb).lessThan(
              plan.minimumGasReserveBnb,
            ))
        )
          blockers.push('fresh_remaining_bnb_below_gas_reserve');
        if (blockers.length > 0) {
          throw new FundingConversionSubmissionClaimBlockedError(blockers);
        }

        const created =
          await tx.agenticWalletFundingConversionSubmissionAttempt.create({
            data: {
              id: claim.id,
              planId: claim.planId,
              requestFingerprint,
              freshSourceQuantityBnb: claim.freshSourceQuantityBnb,
              freshExpectedUsdt: claim.freshExpectedUsdt,
              freshMinimumUsdt: claim.freshMinimumUsdt,
              freshMaximumSlippagePercent: claim.freshMaximumSlippagePercent,
              freshRemainingQuantityBnb: claim.freshRemainingQuantityBnb,
              preConversionWalletAddress: claim.preConversionWalletAddress,
              preConversionBalanceBlockNumber:
                claim.preConversionBalanceBlockNumber,
              preConversionBnbBalance: claim.preConversionBnbBalance,
              preConversionUsdtBalance: claim.preConversionUsdtBalance,
              preConversionBalanceObservedAt:
                claim.preConversionBalanceObservedAt,
              providerFeeRate: claim.providerFeeRate,
              providerFeeUsd: claim.providerFeeUsd,
              estimatedNetworkFeeUsd: claim.estimatedNetworkFeeUsd,
              feeEvidenceGasMode: claim.feeEvidenceGasMode,
              feeEvidenceObservedAt: claim.feeEvidenceObservedAt,
              state: 'submission_claimed',
              automaticRetryAllowed: false,
              startedAt: claim.startedAt,
            },
          });
        return { attempt: mapAttempt(created), replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function validateClaimShape(
  claim: AgenticWalletFundingConversionSubmissionClaim,
): void {
  if (
    !UUID_PATTERN.test(claim.id) ||
    !UUID_PATTERN.test(claim.planId) ||
    !HASH_PATTERN.test(claim.planFingerprint) ||
    typeof claim.confirmationPhrase !== 'string' ||
    claim.confirmationPhrase.length < 1 ||
    claim.confirmationPhrase.length > 512 ||
    !isNonNegativeDecimal(claim.freshSourceQuantityBnb) ||
    !isNonNegativeDecimal(claim.freshExpectedUsdt) ||
    !isNonNegativeDecimal(claim.freshMinimumUsdt) ||
    !isNonNegativeDecimal(claim.freshMaximumSlippagePercent) ||
    !isNonNegativeDecimal(claim.freshRemainingQuantityBnb) ||
    !/^0x[0-9a-f]{40}$/.test(claim.preConversionWalletAddress) ||
    !/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(
      claim.preConversionBalanceBlockNumber,
    ) ||
    !isNonNegativeDecimal(claim.preConversionBnbBalance) ||
    !isNonNegativeDecimal(claim.preConversionUsdtBalance) ||
    claim.providerFeeRate !== '0' ||
    claim.providerFeeUsd !== '0' ||
    !isNonNegativeDecimal(claim.estimatedNetworkFeeUsd) ||
    !/^[a-z]{1,16}$/.test(claim.feeEvidenceGasMode) ||
    !(claim.preConversionBalanceObservedAt instanceof Date) ||
    !Number.isFinite(claim.preConversionBalanceObservedAt.getTime()) ||
    !(claim.feeEvidenceObservedAt instanceof Date) ||
    !Number.isFinite(claim.feeEvidenceObservedAt.getTime()) ||
    !(claim.startedAt instanceof Date) ||
    !Number.isFinite(claim.startedAt.getTime()) ||
    claim.preConversionBalanceObservedAt.getTime() >
      claim.startedAt.getTime() ||
    claim.feeEvidenceObservedAt.getTime() <
      claim.preConversionBalanceObservedAt.getTime() ||
    claim.feeEvidenceObservedAt.getTime() > claim.startedAt.getTime()
  ) {
    throw new FundingConversionSubmissionClaimBlockedError(['invalid_claim']);
  }
}

function isNonNegativeDecimal(value: string): boolean {
  return DECIMAL_PATTERN.test(value) && new Decimal(value).isFinite();
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function mapAttempt(row: {
  id: string;
  planId: string;
  requestFingerprint: string;
  freshSourceQuantityBnb: string;
  freshExpectedUsdt: string;
  freshMinimumUsdt: string;
  freshMaximumSlippagePercent: string;
  freshRemainingQuantityBnb: string;
  preConversionWalletAddress: string | null;
  preConversionBalanceBlockNumber: string | null;
  preConversionBnbBalance: string | null;
  preConversionUsdtBalance: string | null;
  preConversionBalanceObservedAt: Date | null;
  providerFeeRate: string | null;
  providerFeeUsd: string | null;
  estimatedNetworkFeeUsd: string | null;
  feeEvidenceGasMode: string | null;
  feeEvidenceObservedAt: Date | null;
  state: string;
  automaticRetryAllowed: boolean;
  startedAt: Date;
}): StoredAgenticWalletFundingConversionSubmissionAttempt {
  if (
    row.state !== 'submission_claimed' ||
    row.automaticRetryAllowed !== false ||
    !HASH_PATTERN.test(row.requestFingerprint) ||
    !Number.isFinite(row.startedAt.getTime()) ||
    row.preConversionWalletAddress === null ||
    !/^0x[0-9a-f]{40}$/.test(row.preConversionWalletAddress) ||
    row.preConversionBalanceBlockNumber === null ||
    row.preConversionBnbBalance === null ||
    row.preConversionUsdtBalance === null ||
    row.preConversionBalanceObservedAt === null ||
    !/^0x(?:0|[1-9a-f][0-9a-f]*)$/.test(row.preConversionBalanceBlockNumber) ||
    !isNonNegativeDecimal(row.preConversionBnbBalance) ||
    !isNonNegativeDecimal(row.preConversionUsdtBalance) ||
    !Number.isFinite(row.preConversionBalanceObservedAt.getTime()) ||
    row.providerFeeRate !== '0' ||
    row.providerFeeUsd !== '0' ||
    row.estimatedNetworkFeeUsd === null ||
    row.feeEvidenceGasMode === null ||
    row.feeEvidenceObservedAt === null ||
    !isNonNegativeDecimal(row.estimatedNetworkFeeUsd) ||
    !/^[a-z]{1,16}$/.test(row.feeEvidenceGasMode) ||
    !Number.isFinite(row.feeEvidenceObservedAt.getTime()) ||
    row.preConversionBalanceObservedAt.getTime() > row.startedAt.getTime() ||
    row.feeEvidenceObservedAt.getTime() <
      row.preConversionBalanceObservedAt.getTime() ||
    row.feeEvidenceObservedAt.getTime() > row.startedAt.getTime()
  ) {
    throw new Error(
      'Persisted funding conversion submission attempt is invalid',
    );
  }
  return {
    id: row.id,
    planId: row.planId,
    requestFingerprint: row.requestFingerprint,
    freshSourceQuantityBnb: row.freshSourceQuantityBnb,
    freshExpectedUsdt: row.freshExpectedUsdt,
    freshMinimumUsdt: row.freshMinimumUsdt,
    freshMaximumSlippagePercent: row.freshMaximumSlippagePercent,
    freshRemainingQuantityBnb: row.freshRemainingQuantityBnb,
    preConversionWalletAddress: row.preConversionWalletAddress,
    preConversionBalanceBlockNumber: row.preConversionBalanceBlockNumber,
    preConversionBnbBalance: row.preConversionBnbBalance,
    preConversionUsdtBalance: row.preConversionUsdtBalance,
    preConversionBalanceObservedAt: new Date(
      row.preConversionBalanceObservedAt,
    ),
    providerFeeRate: row.providerFeeRate,
    providerFeeUsd: row.providerFeeUsd,
    estimatedNetworkFeeUsd: row.estimatedNetworkFeeUsd,
    feeEvidenceGasMode: row.feeEvidenceGasMode,
    feeEvidenceObservedAt: new Date(row.feeEvidenceObservedAt),
    state: 'submission_claimed',
    automaticRetryAllowed: false,
    startedAt: new Date(row.startedAt),
  };
}
