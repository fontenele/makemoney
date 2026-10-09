import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapStatusReconciliationCandidate,
  AgenticWalletMarketSwapStatusReconciliationCandidateStore,
  ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput,
  validateStatusReconciliationCandidateInput,
} from './agentic-wallet-market-swap-status-reconciliation-candidate.store';
import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface DueCandidateRow {
  readonly gateId: string;
  readonly providerOrderId: string;
  readonly receiptRecordedAt: Date;
  readonly latestObservationId: string | null;
  readonly latestProviderStatus: string | null;
  readonly latestObservationRecordedAt: Date | null;
  readonly latestObservationTransactionHash: string | null;
  readonly latestObservationBookedAt: Date | null;
  readonly latestObservationUpdatedAt: Date | null;
}

export class PrismaAgenticWalletMarketSwapStatusReconciliationCandidateStore implements AgenticWalletMarketSwapStatusReconciliationCandidateStore {
  constructor(private readonly prisma: PrismaService) {}

  async listDue(
    input: ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput,
  ): Promise<AgenticWalletMarketSwapStatusReconciliationCandidate[]> {
    validateStatusReconciliationCandidateInput(input);
    const pendingCutoffTime =
      input.evaluatedAt.getTime() - input.minimumLookupIntervalMs;
    if (!Number.isSafeInteger(pendingCutoffTime)) {
      throw new Error(
        'Agentic Wallet status reconciliation candidate cutoff is invalid',
      );
    }
    const pendingCutoff = new Date(pendingCutoffTime);
    if (!Number.isFinite(pendingCutoff.getTime())) {
      throw new Error(
        'Agentic Wallet status reconciliation candidate cutoff is invalid',
      );
    }

    const rows = await this.prisma.$queryRaw<DueCandidateRow[]>`
      SELECT receipt.gate_id AS "gateId",
             receipt.provider_order_id AS "providerOrderId",
             receipt.recorded_at AS "receiptRecordedAt",
             latest.id AS "latestObservationId",
             latest.provider_status AS "latestProviderStatus",
             latest.recorded_at AS "latestObservationRecordedAt",
             latest.transaction_hash AS "latestObservationTransactionHash",
             latest.booked_at AS "latestObservationBookedAt",
             latest.provider_updated_at AS "latestObservationUpdatedAt"
      FROM real_execution_submission_receipts AS receipt
      LEFT JOIN LATERAL (
        SELECT observation.id,
               observation.provider_status,
               observation.recorded_at,
               observation.transaction_hash,
               observation.booked_at,
               observation.provider_updated_at
        FROM real_execution_status_observations AS observation
        WHERE observation.gate_id = receipt.gate_id
          AND observation.provider_id = receipt.provider_id
          AND observation.provider_order_id = receipt.provider_order_id
        ORDER BY observation.sequence DESC
        LIMIT 1
      ) AS latest ON TRUE
      WHERE receipt.provider_id = 'agentic_wallet'
        AND receipt.lifecycle_status = 'pending_confirmation'
        AND receipt.provider_submission_acknowledged = TRUE
        AND receipt.terminal = FALSE
        AND receipt.execution_succeeded = FALSE
        AND receipt.status_lookup_required = TRUE
        AND receipt.automatic_retry_allowed = FALSE
        AND receipt.recorded_at <= ${input.evaluatedAt}
        AND (
          latest.id IS NULL
          OR (
            latest.provider_status = 'PENDING'
            AND latest.recorded_at <= ${pendingCutoff}
          )
        )
      ORDER BY CASE
                 WHEN latest.id IS NULL THEN receipt.recorded_at
                 ELSE latest.recorded_at +
                      (${input.minimumLookupIntervalMs} * INTERVAL '1 millisecond')
               END ASC,
               receipt.gate_id ASC
      LIMIT ${input.limit}
    `;

    return rows.map((row) => mapCandidate(row, input));
  }
}

function mapCandidate(
  row: DueCandidateRow,
  input: ListDueAgenticWalletMarketSwapStatusReconciliationCandidatesInput,
): AgenticWalletMarketSwapStatusReconciliationCandidate {
  const awaitingFirstObservation =
    row.latestObservationId === null &&
    row.latestProviderStatus === null &&
    row.latestObservationRecordedAt === null &&
    row.latestObservationTransactionHash === null &&
    row.latestObservationBookedAt === null &&
    row.latestObservationUpdatedAt === null;
  const providerPending =
    UUID_PATTERN.test(row.latestObservationId ?? '') &&
    row.latestProviderStatus === 'PENDING' &&
    isValidDate(row.latestObservationRecordedAt) &&
    isValidOptionalTransactionHash(row.latestObservationTransactionHash) &&
    isValidDate(row.latestObservationBookedAt) &&
    isValidDate(row.latestObservationUpdatedAt) &&
    row.latestObservationUpdatedAt.getTime() >=
      row.latestObservationBookedAt.getTime();
  if (
    !UUID_PATTERN.test(row.gateId) ||
    !isSafeAgenticWalletProviderOrderId(row.providerOrderId) ||
    !isValidDate(row.receiptRecordedAt) ||
    row.receiptRecordedAt.getTime() > input.evaluatedAt.getTime() ||
    (!awaitingFirstObservation && !providerPending)
  ) {
    throw new Error(
      'Persisted Agentic Wallet status reconciliation candidate is invalid',
    );
  }

  const eligibleAt = awaitingFirstObservation
    ? new Date(row.receiptRecordedAt)
    : new Date(
        row.latestObservationRecordedAt!.getTime() +
          input.minimumLookupIntervalMs,
      );
  if (
    !Number.isFinite(eligibleAt.getTime()) ||
    eligibleAt.getTime() > input.evaluatedAt.getTime() ||
    (!awaitingFirstObservation &&
      row.latestObservationRecordedAt!.getTime() <
        row.receiptRecordedAt.getTime())
  ) {
    throw new Error(
      'Persisted Agentic Wallet status reconciliation candidate is invalid',
    );
  }

  return {
    scope: 'agentic_wallet_market_swap_status_reconciliation_candidate',
    providerId: 'agentic_wallet',
    gateId: row.gateId,
    providerOrderId: row.providerOrderId,
    phase: awaitingFirstObservation
      ? 'awaiting_status_observation'
      : 'provider_pending',
    receiptRecordedAt: new Date(row.receiptRecordedAt),
    latestObservationId: row.latestObservationId,
    latestObservationRecordedAt:
      row.latestObservationRecordedAt === null
        ? null
        : new Date(row.latestObservationRecordedAt),
    latestObservationTransactionHash: row.latestObservationTransactionHash,
    latestObservationBookedAt:
      row.latestObservationBookedAt === null
        ? null
        : new Date(row.latestObservationBookedAt),
    latestObservationUpdatedAt:
      row.latestObservationUpdatedAt === null
        ? null
        : new Date(row.latestObservationUpdatedAt),
    eligibleAt,
    evaluatedAt: new Date(input.evaluatedAt),
    statusLookupRequired: true,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
  };
}

function isValidOptionalTransactionHash(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === 'string' && /^0x[0-9a-f]{64}$/.test(value))
  );
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}
