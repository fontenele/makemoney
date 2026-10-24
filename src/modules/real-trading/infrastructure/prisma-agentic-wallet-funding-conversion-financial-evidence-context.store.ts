import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionFinancialEvidenceContextStore,
  FundingConversionFinancialEvidenceContext,
} from '../application/agentic-wallet-funding-conversion-financial-evidence-context.store';
import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';
import { mapFundingConversionStatusObservation } from './prisma-agentic-wallet-funding-conversion-financial-reconciliation.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/;
const BLOCK_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;

export class FundingConversionFinancialEvidenceContextInvalidError extends Error {}

@Injectable()
export class PrismaAgenticWalletFundingConversionFinancialEvidenceContextStore extends AgenticWalletFundingConversionFinancialEvidenceContextStore {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getByAttemptId(
    attemptId: string,
  ): Promise<FundingConversionFinancialEvidenceContext | null> {
    if (!UUID_PATTERN.test(attemptId))
      throw new FundingConversionFinancialEvidenceContextInvalidError();
    const attempt =
      await this.prisma.agenticWalletFundingConversionSubmissionAttempt.findUnique(
        {
          where: { id: attemptId },
          include: {
            plan: true,
            statusObservations: {
              where: { providerStatus: 'FINISHED' },
              orderBy: [{ providerUpdatedAt: 'desc' }, { id: 'desc' }],
              take: 1,
            },
          },
        },
      );
    if (attempt === null) return null;
    const statusRow = attempt.statusObservations[0];
    if (
      attempt.id !== attemptId ||
      attempt.plan.id !== attempt.planId ||
      attempt.state !== 'provider_finished_pending_financial_reconciliation' ||
      attempt.automaticRetryAllowed !== false ||
      !isSafeAgenticWalletProviderOrderId(attempt.providerOrderId) ||
      statusRow === undefined ||
      statusRow.attemptId !== attempt.id ||
      statusRow.providerOrderId !== attempt.providerOrderId ||
      attempt.preConversionWalletAddress === null ||
      !ADDRESS_PATTERN.test(attempt.preConversionWalletAddress) ||
      attempt.preConversionBalanceBlockNumber === null ||
      !BLOCK_PATTERN.test(attempt.preConversionBalanceBlockNumber) ||
      attempt.preConversionBnbBalance === null ||
      !DECIMAL_PATTERN.test(attempt.preConversionBnbBalance) ||
      attempt.preConversionUsdtBalance === null ||
      !DECIMAL_PATTERN.test(attempt.preConversionUsdtBalance) ||
      attempt.preConversionBalanceObservedAt === null ||
      !validDate(attempt.preConversionBalanceObservedAt) ||
      attempt.providerFeeRate !== '0' ||
      attempt.providerFeeUsd !== '0' ||
      attempt.feeEvidenceObservedAt === null ||
      !validDate(attempt.feeEvidenceObservedAt) ||
      attempt.preConversionBalanceObservedAt.getTime() >
        attempt.feeEvidenceObservedAt.getTime() ||
      !positive(attempt.freshSourceQuantityBnb) ||
      !positive(attempt.freshExpectedUsdt) ||
      !positive(attempt.freshMinimumUsdt)
    )
      throw new FundingConversionFinancialEvidenceContextInvalidError();

    const statusObservation = mapFundingConversionStatusObservation(statusRow);
    if (
      attempt.feeEvidenceObservedAt.getTime() >
      statusObservation.observation.bookedAt.getTime()
    )
      throw new FundingConversionFinancialEvidenceContextInvalidError();
    return {
      reconciliation: {
        scope:
          'agentic_wallet_funding_conversion_financial_reconciliation_context',
        attemptId: attempt.id,
        planId: attempt.planId,
        providerOrderId: attempt.providerOrderId,
        sourceQuantityBnb: attempt.freshSourceQuantityBnb,
        expectedUsdt: attempt.freshExpectedUsdt,
        minimumUsdt: attempt.freshMinimumUsdt,
        statusObservation,
      },
      walletAddress: attempt.preConversionWalletAddress,
      preBalanceBlockNumber: attempt.preConversionBalanceBlockNumber,
      preBnbBalance: attempt.preConversionBnbBalance,
      preUsdtBalance: attempt.preConversionUsdtBalance,
      preBalanceObservedAt: new Date(attempt.preConversionBalanceObservedAt),
      providerFeeRate: attempt.providerFeeRate,
      providerFeeUsd: attempt.providerFeeUsd,
      feeEvidenceObservedAt: new Date(attempt.feeEvidenceObservedAt),
    };
  }
}

function positive(value: string): boolean {
  return DECIMAL_PATTERN.test(value) && value !== '0';
}

function validDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}
