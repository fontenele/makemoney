import Decimal from 'decimal.js';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionStatusContextStore,
  FundingConversionStatusContextIdentityError,
  FundingConversionStatusLookupContext,
} from '../application/agentic-wallet-funding-conversion-status-context.store';
import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const TERMINAL_STATES = new Set([
  'provider_finished_pending_financial_reconciliation',
  'provider_failed',
  'submission_outcome_unknown',
]);

export class PrismaAgenticWalletFundingConversionStatusContextStore implements AgenticWalletFundingConversionStatusContextStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByAttemptId(
    attemptId: string,
  ): Promise<FundingConversionStatusLookupContext | null> {
    if (!UUID_PATTERN.test(attemptId))
      throw new FundingConversionStatusContextIdentityError();

    const row =
      await this.prisma.agenticWalletFundingConversionSubmissionAttempt.findUnique(
        { where: { id: attemptId } },
      );
    if (row === null) return null;
    if (
      row.id !== attemptId ||
      row.automaticRetryAllowed !== false ||
      !(row.startedAt instanceof Date) ||
      !Number.isFinite(row.startedAt.getTime()) ||
      !(row.completedAt instanceof Date) ||
      !Number.isFinite(row.completedAt.getTime()) ||
      row.completedAt.getTime() < row.startedAt.getTime()
    )
      throw new Error('Persisted funding conversion status context is invalid');

    if (row.state === 'submitted_pending_confirmation') {
      if (
        !isSafeAgenticWalletProviderOrderId(row.providerOrderId) ||
        !isCanonicalPositiveDecimal(row.freshSourceQuantityBnb) ||
        !isCanonicalPositiveDecimal(row.freshMaximumSlippagePercent)
      )
        throw new Error(
          'Persisted funding conversion status context is invalid',
        );
      return {
        attemptId,
        attemptState: row.state,
        statusLookupRequired: true,
        statusContext: {
          attemptId,
          providerOrderId: row.providerOrderId,
          sourceQuantityBnb: row.freshSourceQuantityBnb,
          maximumSlippagePercent: row.freshMaximumSlippagePercent,
        },
      };
    }

    if (!TERMINAL_STATES.has(row.state))
      throw new Error('Persisted funding conversion status context is invalid');
    if (
      (row.state === 'submission_outcome_unknown' &&
        row.providerOrderId !== null) ||
      (row.state !== 'submission_outcome_unknown' &&
        !isSafeAgenticWalletProviderOrderId(row.providerOrderId))
    )
      throw new Error('Persisted funding conversion status context is invalid');
    return {
      attemptId,
      attemptState:
        row.state as FundingConversionStatusLookupContext['attemptState'],
      statusLookupRequired: false,
      statusContext: null,
    };
  }
}

function isCanonicalPositiveDecimal(value: unknown): value is string {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL_PATTERN.test(value))
    return false;
  try {
    const decimal = new Decimal(value);
    return decimal.gt(0) && decimal.toFixed() === value;
  } catch {
    return false;
  }
}
