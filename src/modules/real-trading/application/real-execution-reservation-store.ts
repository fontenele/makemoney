import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import { RealExecutionProviderQuotaSnapshot } from './real-execution-provider-quota-risk';
import {
  RealExecutionReservationCapacityBlocker,
  RealExecutionReservationCapacityFreshnessPolicy,
} from './real-execution-reservation-capacity';
import { RealExecutionResourceSnapshot } from './real-execution-resource-risk';

export interface RealExecutionReservationCommand {
  readonly intent: RealExecutionIntent;
  readonly quote: RealExecutionQuote;
  readonly limits: RealExecutionLocalRiskLimits;
  readonly budgetSnapshot: RealExecutionBudgetSnapshot;
  readonly resourceSnapshot: RealExecutionResourceSnapshot;
  readonly quotaSnapshot: RealExecutionProviderQuotaSnapshot;
  readonly freshness: RealExecutionReservationCapacityFreshnessPolicy;
}

export interface StoredRealExecutionReservation {
  readonly id: string;
  readonly providerId: string;
  readonly chainId: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly idempotencyKey: string;
  readonly utcDay: string;
  readonly budgetChargeUsdt: string;
  readonly sourceTokenAddress: string;
  readonly sourceSymbol: string;
  readonly sourceQuantity: string;
  readonly nativeGasSymbol: 'BNB';
  readonly nativeGasQuantity: string;
  readonly providerQuotaUsd: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}

export interface RealExecutionReservationStore {
  reserve(command: RealExecutionReservationCommand): Promise<{
    reservation: StoredRealExecutionReservation;
    replayed: boolean;
  }>;
}

export class RealExecutionReservationIdempotencyConflictError extends Error {
  constructor() {
    super('Real execution reservation idempotency key was reused differently');
    this.name = RealExecutionReservationIdempotencyConflictError.name;
  }
}

export class RealExecutionReservationIdentityConflictError extends Error {
  constructor() {
    super('Real execution intent or quote is already reserved');
    this.name = RealExecutionReservationIdentityConflictError.name;
  }
}

export class RealExecutionReservationCapacityError extends Error {
  constructor(
    readonly blockers: readonly RealExecutionReservationCapacityBlocker[],
  ) {
    super('Real execution reservation capacity is blocked');
    this.name = RealExecutionReservationCapacityError.name;
  }
}
