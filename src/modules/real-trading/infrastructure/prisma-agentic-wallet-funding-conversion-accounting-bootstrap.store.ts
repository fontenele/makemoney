import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
  FundingConversionAccountingBootstrap,
  prepareFundingConversionAccountingBootstrap,
} from '../application/agentic-wallet-funding-conversion-accounting-bootstrap';
import {
  AgenticWalletFundingConversionAccountingBootstrapStore,
  AppliedFundingConversionAccountingBootstrap,
  FundingConversionAccountingBootstrapBlockedError,
  FundingConversionAccountingBootstrapConflictError,
  FundingConversionAccountingBootstrapStoreRequest,
} from '../application/agentic-wallet-funding-conversion-accounting-bootstrap.store';
import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
  isValidAgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import { mapPersistedFundingConversionFinancialReconciliation } from './prisma-agentic-wallet-funding-conversion-financial-reconciliation.store';

const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/;

type BootstrapRow = {
  id: string;
  initializationId: string;
  reconciliationId: string;
  attemptId: string;
  transactionHash: string;
  walletAddress: string;
  blockNumber: string;
  acknowledgment: string;
  reason: string;
  balances: unknown;
  walletObservedAt: Date;
  accountingStateInspectedAt: Date;
  maximumSnapshotAgeMs: number;
  preparedAt: Date;
  historicalLedgerContinuityClaimed: boolean;
  historicalBtcbContinuityClaimed: boolean;
  requestFingerprint: string;
  appliedAt: Date;
};

export class PrismaAgenticWalletFundingConversionAccountingBootstrapStore extends AgenticWalletFundingConversionAccountingBootstrapStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  async apply(
    request: FundingConversionAccountingBootstrapStoreRequest,
  ): Promise<{
    applied: AppliedFundingConversionAccountingBootstrap;
    replayed: boolean;
  }> {
    validateRequest(request);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261016, 99)`;
        const bootstrap = request.bootstrap;
        const existing =
          await tx.agenticWalletFundingConversionAccountingBootstrap.findFirst({
            where: {
              OR: [
                { id: bootstrap.bootstrapId },
                { initializationId: bootstrap.bootstrapId },
                { reconciliationId: bootstrap.reconciliationId },
                { attemptId: bootstrap.attemptId },
                { transactionHash: bootstrap.transactionHash },
              ],
            },
          });
        if (existing !== null) {
          if (
            existing.id !== bootstrap.bootstrapId ||
            existing.initializationId !== bootstrap.bootstrapId ||
            existing.reconciliationId !== bootstrap.reconciliationId ||
            existing.attemptId !== bootstrap.attemptId ||
            existing.transactionHash !== bootstrap.transactionHash
          )
            throw new FundingConversionAccountingBootstrapConflictError();
          const applied =
            mapPersistedFundingConversionAccountingBootstrap(existing);
          if (
            applied.bootstrap.bootstrapId !== bootstrap.bootstrapId ||
            applied.bootstrap.reconciliationId !== bootstrap.reconciliationId ||
            applied.bootstrap.attemptId !== bootstrap.attemptId ||
            applied.bootstrap.transactionHash !== bootstrap.transactionHash ||
            existing.requestFingerprint !== fingerprint(bootstrap)
          )
            throw new FundingConversionAccountingBootstrapConflictError();
          return { applied, replayed: true };
        }

        const [
          reconciliationRow,
          attempt,
          initializationCount,
          balanceCount,
          synchronizationCount,
        ] = await Promise.all([
          tx.agenticWalletFundingConversionFinancialReconciliation.findUnique({
            where: { id: bootstrap.reconciliationId },
          }),
          tx.agenticWalletFundingConversionSubmissionAttempt.findUnique({
            where: { id: bootstrap.attemptId },
          }),
          tx.realExecutionAccountingBalanceInitialization.count(),
          tx.realExecutionAccountingBalance.count(),
          tx.agenticWalletFundingConversionAccountingSync.count(),
        ]);
        if (reconciliationRow === null || attempt === null)
          throw blocked('durable_conversion_context_absent');
        const reconciliation =
          mapPersistedFundingConversionFinancialReconciliation(
            reconciliationRow,
          );
        if (
          JSON.stringify(canonicalize(reconciliation)) !==
            JSON.stringify(canonicalize(request.reconciliation)) ||
          !matchesDurableContext(attempt, request)
        )
          throw blocked('durable_conversion_context_mismatch');
        if (
          initializationCount !== 0 ||
          balanceCount !== 0 ||
          synchronizationCount !== 0
        )
          throw blocked('accounting_state_not_empty');

        const appliedAt = this.now();
        if (
          !Number.isFinite(appliedAt.getTime()) ||
          appliedAt.getTime() < bootstrap.preparedAt.getTime() ||
          appliedAt.getTime() - bootstrap.walletObservedAt.getTime() >
            bootstrap.maximumSnapshotAgeMs
        )
          throw blocked('wallet_snapshot_stale_at_application');

        const initialization = initializationFrom(bootstrap);
        if (
          !isValidAgenticWalletAccountingBalanceInitialization(initialization)
        )
          throw blocked('derived_initialization_invalid');
        const initializedAt = new Date(appliedAt);
        await tx.realExecutionAccountingBalanceInitialization.create({
          data: {
            id: initialization.initializationId,
            providerId: initialization.providerId,
            chainId: initialization.chainId,
            acknowledgment: initialization.acknowledgment,
            balances: initialization.balances,
            walletObservedAt: initialization.walletObservedAt,
            maximumObservationAgeMs: initialization.maximumObservationAgeMs,
            preparedAt: initialization.preparedAt,
            requestFingerprint: fingerprint(initialization),
            initializedAt,
          },
        });
        for (const balance of bootstrap.balances) {
          await tx.realExecutionAccountingBalance.create({
            data: {
              assetIdentity: balance.assetIdentity,
              assetType: balance.assetType,
              assetAddress: balance.assetAddress,
              assetSymbol: balance.assetSymbol,
              quantity: balance.currentQuantity,
              updatedAt: initializedAt,
            },
          });
        }
        const created =
          await tx.agenticWalletFundingConversionAccountingBootstrap.create({
            data: {
              id: bootstrap.bootstrapId,
              initializationId: bootstrap.bootstrapId,
              reconciliationId: bootstrap.reconciliationId,
              attemptId: bootstrap.attemptId,
              transactionHash: bootstrap.transactionHash,
              walletAddress: bootstrap.walletAddress,
              blockNumber: bootstrap.blockNumber,
              acknowledgment: bootstrap.acknowledgment,
              reason: bootstrap.reason,
              balances: bootstrap.balances.map((balance) => ({ ...balance })),
              walletObservedAt: bootstrap.walletObservedAt,
              accountingStateInspectedAt: bootstrap.accountingStateInspectedAt,
              maximumSnapshotAgeMs: bootstrap.maximumSnapshotAgeMs,
              preparedAt: bootstrap.preparedAt,
              historicalLedgerContinuityClaimed: false,
              historicalBtcbContinuityClaimed: false,
              requestFingerprint: fingerprint(bootstrap),
              appliedAt,
            },
          });
        return {
          applied: mapPersistedFundingConversionAccountingBootstrap(created),
          replayed: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

export function mapPersistedFundingConversionAccountingBootstrap(
  row: BootstrapRow,
): AppliedFundingConversionAccountingBootstrap {
  const bootstrap: FundingConversionAccountingBootstrap = {
    scope: 'agentic_wallet_funding_conversion_accounting_bootstrap',
    bootstrapId: row.id,
    reconciliationId: row.reconciliationId,
    attemptId: row.attemptId,
    transactionHash: row.transactionHash,
    chainId: '56',
    walletAddress: row.walletAddress,
    blockNumber: row.blockNumber,
    balances: row.balances as FundingConversionAccountingBootstrap['balances'],
    acknowledgment:
      row.acknowledgment as FundingConversionAccountingBootstrap['acknowledgment'],
    reason: row.reason as FundingConversionAccountingBootstrap['reason'],
    walletObservedAt: new Date(row.walletObservedAt),
    accountingStateInspectedAt: new Date(row.accountingStateInspectedAt),
    maximumSnapshotAgeMs: row.maximumSnapshotAgeMs,
    preparedAt: new Date(row.preparedAt),
    financialReconciliationComplete: true,
    postConversionStateVerified: true,
    historicalLedgerContinuityClaimed: false,
    historicalBtcbContinuityClaimed: false,
    accountingBootstrapPrepared: true,
    accountingBalancesInitialized: false,
    accountingSynchronizationComplete: false,
    strategyExecutionAuthorized: false,
    automaticRetryAllowed: false,
  };
  if (
    row.initializationId !== row.id ||
    row.acknowledgment !==
      FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT ||
    row.reason !== 'post_reconciliation_missing_preexisting_ledger' ||
    row.historicalLedgerContinuityClaimed !== false ||
    row.historicalBtcbContinuityClaimed !== false ||
    !FINGERPRINT_PATTERN.test(row.requestFingerprint) ||
    row.requestFingerprint !== fingerprint(bootstrap) ||
    !Number.isFinite(row.appliedAt.getTime()) ||
    row.appliedAt.getTime() < bootstrap.preparedAt.getTime() ||
    row.appliedAt.getTime() - bootstrap.walletObservedAt.getTime() >
      bootstrap.maximumSnapshotAgeMs
  )
    throw blocked('persisted_accounting_bootstrap_invalid');
  return {
    scope: 'applied_funding_conversion_accounting_bootstrap',
    bootstrap: {
      ...bootstrap,
      balances: bootstrap.balances.map((balance) => ({ ...balance })),
      walletObservedAt: new Date(bootstrap.walletObservedAt),
      accountingStateInspectedAt: new Date(
        bootstrap.accountingStateInspectedAt,
      ),
      preparedAt: new Date(bootstrap.preparedAt),
    },
    initializationId: row.initializationId,
    appliedAt: new Date(row.appliedAt),
    accountingBalancesInitialized: true,
    accountingBootstrapComplete: true,
    ordinaryAccountingSynchronizationApplied: false,
    historicalLedgerContinuityClaimed: false,
    historicalBtcbContinuityClaimed: false,
    strategyExecutionAuthorized: false,
    automaticRetryAllowed: false,
  };
}

function validateRequest(
  request: FundingConversionAccountingBootstrapStoreRequest,
): void {
  const bootstrap = request?.bootstrap;
  if (bootstrap === undefined) throw blocked('invalid_bootstrap_request');
  const assessment = prepareFundingConversionAccountingBootstrap(
    request.reconciliation,
    request.context,
    request.snapshot,
    request.absence,
    {
      bootstrapId: bootstrap.bootstrapId,
      acknowledgment: bootstrap.acknowledgment,
      maximumSnapshotAgeMs: bootstrap.maximumSnapshotAgeMs,
      preparedAt: bootstrap.preparedAt,
    },
  );
  if (
    assessment.bootstrap === null ||
    JSON.stringify(canonicalize(assessment.bootstrap)) !==
      JSON.stringify(canonicalize(bootstrap))
  )
    throw blocked(...assessment.blockers, 'bootstrap_plan_mismatch');
}

function matchesDurableContext(
  attempt: {
    id: string;
    planId: string;
    providerOrderId: string | null;
    state: string;
    automaticRetryAllowed: boolean;
    freshSourceQuantityBnb: string;
    freshExpectedUsdt: string;
    freshMinimumUsdt: string;
    preConversionWalletAddress: string | null;
    preConversionBalanceBlockNumber: string | null;
    preConversionBnbBalance: string | null;
    preConversionUsdtBalance: string | null;
    preConversionBalanceObservedAt: Date | null;
    providerFeeRate: string | null;
    providerFeeUsd: string | null;
    feeEvidenceObservedAt: Date | null;
  },
  request: FundingConversionAccountingBootstrapStoreRequest,
): boolean {
  const context = request.context;
  return (
    attempt.id === request.bootstrap.attemptId &&
    attempt.planId === context.reconciliation.planId &&
    attempt.providerOrderId === context.reconciliation.providerOrderId &&
    attempt.state === 'provider_finished_pending_financial_reconciliation' &&
    attempt.automaticRetryAllowed === false &&
    attempt.freshSourceQuantityBnb ===
      context.reconciliation.sourceQuantityBnb &&
    attempt.freshExpectedUsdt === context.reconciliation.expectedUsdt &&
    attempt.freshMinimumUsdt === context.reconciliation.minimumUsdt &&
    attempt.preConversionWalletAddress === context.walletAddress &&
    attempt.preConversionBalanceBlockNumber === context.preBalanceBlockNumber &&
    attempt.preConversionBnbBalance === context.preBnbBalance &&
    attempt.preConversionUsdtBalance === context.preUsdtBalance &&
    attempt.preConversionBalanceObservedAt?.getTime() ===
      context.preBalanceObservedAt.getTime() &&
    attempt.providerFeeRate === context.providerFeeRate &&
    attempt.providerFeeUsd === context.providerFeeUsd &&
    attempt.feeEvidenceObservedAt?.getTime() ===
      context.feeEvidenceObservedAt.getTime()
  );
}

function initializationFrom(
  bootstrap: FundingConversionAccountingBootstrap,
): AgenticWalletAccountingBalanceInitialization {
  return {
    scope: 'agentic_wallet_accounting_balance_initialization',
    initializationId: bootstrap.bootstrapId,
    providerId: 'agentic_wallet',
    chainId: '56',
    acknowledgment: ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
    balances: bootstrap.balances.map((balance) =>
      balance.assetType === 'native'
        ? {
            assetType: 'native' as const,
            assetSymbol: 'BNB',
            currentQuantity: balance.currentQuantity,
          }
        : {
            assetType: 'token' as const,
            assetAddress: balance.assetAddress ?? '',
            currentQuantity: balance.currentQuantity,
          },
    ),
    balanceCoverageComplete: true,
    walletObservedAt: new Date(bootstrap.walletObservedAt),
    maximumObservationAgeMs: bootstrap.maximumSnapshotAgeMs,
    preparedAt: new Date(bootstrap.preparedAt),
    accountingBalanceInitializationPrepared: true,
    accountingBalancesInitialized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
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

function blocked(
  ...blockers: string[]
): FundingConversionAccountingBootstrapBlockedError {
  return new FundingConversionAccountingBootstrapBlockedError(
    [...new Set(blockers)].filter((value) => value.length > 0),
  );
}
