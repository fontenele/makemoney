import { createHash } from 'node:crypto';

import Decimal from 'decimal.js';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionAccountingSyncStore,
  AppliedFundingConversionAccountingSync,
  FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
  FundingConversionAccountingSyncBalance,
  FundingConversionAccountingSyncBlockedError,
  FundingConversionAccountingSyncConflictError,
  FundingConversionAccountingSyncRequest,
} from '../application/agentic-wallet-funding-conversion-accounting-sync.store';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { mapPersistedAgenticWalletAccountingBalanceInitialization } from './prisma-agentic-wallet-accounting-balance-initialization.store';
import { mapPersistedFundingConversionFinancialReconciliation } from './prisma-agentic-wallet-funding-conversion-financial-reconciliation.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/;
const HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const BLOCK_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;
const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/;
const ExactDecimal = Decimal.clone({ precision: 80 });

type SyncRow = {
  id: string;
  initializationId: string;
  reconciliationId: string;
  attemptId: string;
  transactionHash: string;
  walletAddress: string;
  blockNumber: string;
  acknowledgment: string;
  balances: unknown;
  observedAt: Date;
  preparedAt: Date;
  requestFingerprint: string;
  appliedAt: Date;
};

export class PrismaAgenticWalletFundingConversionAccountingSyncStore extends AgenticWalletFundingConversionAccountingSyncStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  async getByAttemptId(
    attemptId: string,
  ): Promise<AppliedFundingConversionAccountingSync | null> {
    if (!UUID_PATTERN.test(attemptId))
      throw new FundingConversionAccountingSyncBlockedError([
        'invalid_attempt_identity',
      ]);
    const row =
      await this.prisma.agenticWalletFundingConversionAccountingSync.findUnique(
        { where: { attemptId } },
      );
    if (row === null) return null;
    const mapped = mapPersistedFundingConversionAccountingSync(row);
    if (mapped.attemptId !== attemptId)
      throw new FundingConversionAccountingSyncBlockedError([
        'persisted_attempt_identity_mismatch',
      ]);
    return mapped;
  }

  async apply(request: FundingConversionAccountingSyncRequest): Promise<{
    synchronized: AppliedFundingConversionAccountingSync;
    replayed: boolean;
  }> {
    validateRequest(request);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261016, 96)`;
        const existing =
          await tx.agenticWalletFundingConversionAccountingSync.findFirst({
            where: {
              OR: [
                { id: request.id },
                { attemptId: request.reconciliation.attemptId },
                { reconciliationId: request.reconciliation.id },
                {
                  transactionHash:
                    request.reconciliation.evidence.transactionHash,
                },
              ],
            },
          });
        if (existing !== null) {
          const mapped = mapPersistedFundingConversionAccountingSync(existing);
          if (
            mapped.attemptId !== request.reconciliation.attemptId ||
            mapped.reconciliationId !== request.reconciliation.id ||
            mapped.initializationId !== request.initializationId ||
            mapped.acknowledgment !== request.acknowledgment
          )
            throw new FundingConversionAccountingSyncConflictError();
          return { synchronized: mapped, replayed: true };
        }

        const [reconciliationRow, attempt, initialization, balanceRows] =
          await Promise.all([
            tx.agenticWalletFundingConversionFinancialReconciliation.findUnique(
              { where: { id: request.reconciliation.id } },
            ),
            tx.agenticWalletFundingConversionSubmissionAttempt.findUnique({
              where: { id: request.reconciliation.attemptId },
            }),
            tx.realExecutionAccountingBalanceInitialization.findUnique({
              where: { id: request.initializationId },
            }),
            tx.realExecutionAccountingBalance.findMany({
              orderBy: { assetIdentity: 'asc' },
            }),
          ]);
        if (
          reconciliationRow === null ||
          attempt === null ||
          initialization === null
        )
          throw blocked('durable_context_absent');

        const reconciliation =
          mapPersistedFundingConversionFinancialReconciliation(
            reconciliationRow,
          );
        const initialized =
          mapPersistedAgenticWalletAccountingBalanceInitialization(
            initialization,
          );
        if (
          JSON.stringify(canonicalize(reconciliation)) !==
            JSON.stringify(canonicalize(request.reconciliation)) ||
          initialized.initialization.initializationId !==
            request.initializationId ||
          initialized.initialization.providerId !== 'agentic_wallet' ||
          initialized.initialization.chainId !== '56'
        )
          throw blocked('durable_context_mismatch');

        const snapshot = validateSnapshot(request);
        if (
          attempt.id !== reconciliation.attemptId ||
          attempt.planId !== reconciliation.planId ||
          attempt.preConversionWalletAddress !== snapshot.walletAddress ||
          attempt.preConversionBalanceBlockNumber === null ||
          !BLOCK_PATTERN.test(attempt.preConversionBalanceBlockNumber) ||
          BigInt(snapshot.blockNumber) <=
            BigInt(attempt.preConversionBalanceBlockNumber) ||
          attempt.preConversionBnbBalance === null ||
          attempt.preConversionUsdtBalance === null ||
          !canonicalDecimal(attempt.preConversionBnbBalance) ||
          !canonicalDecimal(attempt.preConversionUsdtBalance) ||
          request.context.reconciliation.attemptId !== attempt.id ||
          request.context.reconciliation.providerOrderId !==
            reconciliation.evidence.providerOrderId ||
          request.context.walletAddress !== snapshot.walletAddress ||
          snapshot.observedAt.getTime() <
            reconciliation.evidence.observedAt.getTime()
        )
          throw blocked('conversion_context_mismatch');

        const current = validateCurrentBalances(balanceRows);
        if (
          balanceRows.some(
            (row) =>
              !(row.updatedAt instanceof Date) ||
              !Number.isFinite(row.updatedAt.getTime()) ||
              row.updatedAt.getTime() < initialized.initializedAt.getTime() ||
              row.updatedAt.getTime() > reconciliation.recordedAt.getTime(),
          )
        )
          throw blocked('accounting_ledger_chronology_mismatch');
        const bnbIdentity = 'native:BNB';
        const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
        const usdtIdentity = `token:${instrument.usdt.tokenAddress}`;
        const btcbIdentity = `token:${instrument.btc.tokenAddress}`;
        const expectedBnb = new ExactDecimal(attempt.preConversionBnbBalance)
          .minus(reconciliation.evidence.submittedSourceQuantityBnb)
          .minus(reconciliation.evidence.networkFeeQuantityBnb);
        const expectedUsdt = new ExactDecimal(
          attempt.preConversionUsdtBalance,
        ).plus(reconciliation.evidence.actualUsdtReceived);
        if (
          expectedBnb.isNegative() ||
          snapshot.balances.get(bnbIdentity) !== expectedBnb.toFixed() ||
          snapshot.balances.get(usdtIdentity) !== expectedUsdt.toFixed() ||
          current.get(bnbIdentity) !== attempt.preConversionBnbBalance ||
          current.get(usdtIdentity) !== attempt.preConversionUsdtBalance ||
          current.get(btcbIdentity) !== snapshot.balances.get(btcbIdentity)
        )
          throw blocked('ledger_or_wallet_balance_mismatch');

        const transitions = [...current.entries()]
          .map(([assetIdentity, beforeQuantity]) => ({
            assetIdentity,
            beforeQuantity,
            afterQuantity: snapshot.balances.get(assetIdentity) ?? '',
          }))
          .sort((left, right) =>
            left.assetIdentity.localeCompare(right.assetIdentity),
          );
        const appliedAt = this.now();
        if (
          !Number.isFinite(appliedAt.getTime()) ||
          appliedAt.getTime() < request.preparedAt.getTime()
        )
          throw blocked('invalid_application_time');

        for (const transition of transitions) {
          const updated = await tx.realExecutionAccountingBalance.updateMany({
            where: {
              assetIdentity: transition.assetIdentity,
              quantity: transition.beforeQuantity,
            },
            data: {
              quantity: transition.afterQuantity,
              updatedAt: appliedAt,
            },
          });
          if (updated.count !== 1) throw blocked('concurrent_ledger_change');
        }

        const data = {
          id: request.id,
          initializationId: request.initializationId,
          reconciliationId: reconciliation.id,
          attemptId: reconciliation.attemptId,
          transactionHash: reconciliation.evidence.transactionHash,
          walletAddress: snapshot.walletAddress,
          blockNumber: snapshot.blockNumber,
          acknowledgment: request.acknowledgment,
          balances: transitions,
          observedAt: snapshot.observedAt,
          preparedAt: request.preparedAt,
          appliedAt,
        };
        const created =
          await tx.agenticWalletFundingConversionAccountingSync.create({
            data: {
              ...data,
              balances: transitions,
              requestFingerprint: fingerprint(data),
            },
          });
        return {
          synchronized: mapPersistedFundingConversionAccountingSync(created),
          replayed: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

export function mapPersistedFundingConversionAccountingSync(
  row: SyncRow,
): AppliedFundingConversionAccountingSync {
  const balances = validateTransitions(row.balances);
  const data = {
    id: row.id,
    initializationId: row.initializationId,
    reconciliationId: row.reconciliationId,
    attemptId: row.attemptId,
    transactionHash: row.transactionHash,
    walletAddress: row.walletAddress,
    blockNumber: row.blockNumber,
    acknowledgment: row.acknowledgment,
    balances,
    observedAt: new Date(row.observedAt),
    preparedAt: new Date(row.preparedAt),
    appliedAt: new Date(row.appliedAt),
  };
  if (
    !UUID_PATTERN.test(data.id) ||
    !UUID_PATTERN.test(data.initializationId) ||
    !UUID_PATTERN.test(data.reconciliationId) ||
    !UUID_PATTERN.test(data.attemptId) ||
    !HASH_PATTERN.test(data.transactionHash) ||
    !ADDRESS_PATTERN.test(data.walletAddress) ||
    !BLOCK_PATTERN.test(data.blockNumber) ||
    data.acknowledgment !== FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT ||
    !Number.isFinite(data.observedAt.getTime()) ||
    !Number.isFinite(data.preparedAt.getTime()) ||
    !Number.isFinite(data.appliedAt.getTime()) ||
    data.preparedAt.getTime() < data.observedAt.getTime() ||
    data.appliedAt.getTime() < data.preparedAt.getTime() ||
    !FINGERPRINT_PATTERN.test(row.requestFingerprint) ||
    row.requestFingerprint !== fingerprint(data)
  )
    throw blocked('persisted_synchronization_invalid');
  return {
    scope: 'applied_funding_conversion_accounting_sync',
    ...data,
    acknowledgment: FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
    balances: balances.map((balance) => ({ ...balance })),
    financialReconciliationComplete: true,
    accountingSynchronizationComplete: true,
    automaticRetryAllowed: false,
  };
}

function validateRequest(request: FundingConversionAccountingSyncRequest) {
  if (
    typeof request !== 'object' ||
    request === null ||
    !UUID_PATTERN.test(request.id) ||
    !UUID_PATTERN.test(request.initializationId) ||
    request.acknowledgment !==
      FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT ||
    !(request.preparedAt instanceof Date) ||
    !Number.isFinite(request.preparedAt.getTime()) ||
    request.reconciliation.financialReconciliationComplete !== true ||
    request.reconciliation.automaticRetryAllowed !== false
  )
    throw blocked('invalid_synchronization_request');
}

function validateSnapshot(request: FundingConversionAccountingSyncRequest): {
  walletAddress: string;
  blockNumber: string;
  balances: Map<string, string>;
  observedAt: Date;
} {
  const snapshot = request.snapshot;
  if (
    snapshot.scope !==
      'agentic_wallet_funding_conversion_accounting_snapshot' ||
    snapshot.chainId !== '56' ||
    !ADDRESS_PATTERN.test(snapshot.walletAddress) ||
    !BLOCK_PATTERN.test(snapshot.blockNumber) ||
    !Array.isArray(snapshot.balances) ||
    snapshot.balances.length !== 3 ||
    !Number.isFinite(snapshot.observedAt.getTime()) ||
    request.preparedAt.getTime() < snapshot.observedAt.getTime()
  )
    throw blocked('invalid_wallet_snapshot');
  const balances = new Map<string, string>();
  for (const raw of snapshot.balances as readonly unknown[]) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
      throw blocked('invalid_wallet_snapshot');
    const balance = raw as Record<string, unknown>;
    const expectedIdentity =
      balance.assetType === 'native'
        ? balance.assetAddress === null && balance.assetSymbol === 'BNB'
          ? 'native:BNB'
          : ''
        : balance.assetType === 'token' &&
            typeof balance.assetAddress === 'string' &&
            balance.assetSymbol === null
          ? `token:${balance.assetAddress}`
          : '';
    if (
      typeof balance.assetIdentity !== 'string' ||
      balance.assetIdentity !== expectedIdentity ||
      typeof balance.quantity !== 'string' ||
      !canonicalDecimal(balance.quantity) ||
      balances.has(balance.assetIdentity)
    )
      throw blocked('invalid_wallet_snapshot');
    balances.set(balance.assetIdentity, balance.quantity);
  }
  const required = requiredIdentities();
  if (required.some((identity) => !balances.has(identity)))
    throw blocked('invalid_wallet_snapshot');
  return {
    walletAddress: snapshot.walletAddress,
    blockNumber: snapshot.blockNumber,
    balances,
    observedAt: new Date(snapshot.observedAt),
  };
}

function validateCurrentBalances(
  rows: readonly {
    assetIdentity: string;
    assetType: string;
    assetAddress: string | null;
    assetSymbol: string | null;
    quantity: string;
    updatedAt: Date;
  }[],
): Map<string, string> {
  if (rows.length !== 3) throw blocked('accounting_ledger_incomplete');
  const balances = new Map<string, string>();
  for (const row of rows) {
    const identity =
      row.assetType === 'native'
        ? `native:${row.assetSymbol ?? ''}`
        : row.assetType === 'token'
          ? `token:${row.assetAddress ?? ''}`
          : '';
    if (
      row.assetIdentity !== identity ||
      !canonicalDecimal(row.quantity) ||
      balances.has(identity)
    )
      throw blocked('accounting_ledger_invalid');
    balances.set(identity, row.quantity);
  }
  if (requiredIdentities().some((identity) => !balances.has(identity)))
    throw blocked('accounting_ledger_incomplete');
  return balances;
}

function validateTransitions(
  value: unknown,
): FundingConversionAccountingSyncBalance[] {
  if (!Array.isArray(value) || value.length !== 3)
    throw blocked('persisted_synchronization_invalid');
  const result: FundingConversionAccountingSyncBalance[] = [];
  const identities = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
      throw blocked('persisted_synchronization_invalid');
    const entry = raw as Record<string, unknown>;
    if (
      typeof entry.assetIdentity !== 'string' ||
      !requiredIdentities().includes(entry.assetIdentity) ||
      typeof entry.beforeQuantity !== 'string' ||
      !canonicalDecimal(entry.beforeQuantity) ||
      typeof entry.afterQuantity !== 'string' ||
      !canonicalDecimal(entry.afterQuantity) ||
      identities.has(entry.assetIdentity)
    )
      throw blocked('persisted_synchronization_invalid');
    identities.add(entry.assetIdentity);
    result.push({
      assetIdentity: entry.assetIdentity,
      beforeQuantity: entry.beforeQuantity,
      afterQuantity: entry.afterQuantity,
    });
  }
  return result.sort((left, right) =>
    left.assetIdentity.localeCompare(right.assetIdentity),
  );
}

function requiredIdentities(): string[] {
  const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  return [
    'native:BNB',
    `token:${instrument.usdt.tokenAddress}`,
    `token:${instrument.btc.tokenAddress}`,
  ];
}

function canonicalDecimal(value: string): boolean {
  return DECIMAL_PATTERN.test(value);
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

function blocked(blocker: string): FundingConversionAccountingSyncBlockedError {
  return new FundingConversionAccountingSyncBlockedError([blocker]);
}
