import Decimal from 'decimal.js';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;
const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const ASSET_SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;
const OPAQUE_ID_PATTERN = /^\S{1,256}$/;
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;

export interface RealExecutionAsset {
  readonly tokenAddress: string;
  readonly symbol: string | null;
}

export interface RealExecutionIntent {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly kind: 'market_swap';
  readonly chainId: string;
  readonly sourceAsset: RealExecutionAsset;
  readonly targetAsset: RealExecutionAsset;
  readonly sourceQuantity: string;
  readonly maxSlippageRate: string;
  readonly createdAt: Date;
}

export type RealExecutionCostKind = 'network_fee' | 'provider_fee';

export interface RealExecutionCost {
  readonly kind: RealExecutionCostKind;
  readonly asset: RealExecutionAsset;
  readonly quantity: string;
}

export interface RealExecutionQuote {
  readonly id: string;
  readonly providerId: string;
  readonly providerQuoteId: string | null;
  readonly intent: RealExecutionIntent;
  readonly expectedTargetQuantity: string;
  readonly minimumTargetQuantity: string;
  readonly costs: readonly RealExecutionCost[];
  readonly costCoverage: 'complete' | 'partial';
  readonly quotedAt: Date;
  readonly expiresAt: Date;
  readonly executable: false;
}

export type RealExecutionStatus = 'pending' | 'finished' | 'failed';

export interface RealExecutionResult {
  readonly id: string;
  readonly providerId: string;
  readonly quoteId: string;
  readonly intentId: string;
  readonly providerOrderId: string;
  readonly transactionHash: string | null;
  readonly status: RealExecutionStatus;
  readonly actualTargetQuantity: string | null;
  readonly submittedAt: Date;
  readonly observedAt: Date;
  readonly automaticRetryAllowed: false;
}

export type RealExecutionOperation = 'market_swap_quote' | 'market_swap_submit';

export interface RealExecutionChainCapabilities {
  readonly chainId: string;
  readonly operations: readonly RealExecutionOperation[];
}

export interface RealExecutionReadCapabilities {
  readonly securitySettings: boolean;
  readonly quota: boolean;
  readonly balances: boolean;
  readonly gas: boolean;
}

export interface RealExecutionCapabilitySnapshot {
  readonly providerId: string;
  readonly connected: boolean;
  readonly chains: readonly RealExecutionChainCapabilities[];
  readonly reads: RealExecutionReadCapabilities;
  readonly observedAt: Date;
}

export function validateRealExecutionIntent(intent: RealExecutionIntent): void {
  validateUuid(intent.id, 'intent id');
  if (!IDEMPOTENCY_KEY_PATTERN.test(intent.idempotencyKey)) {
    throw new Error('Real execution idempotency key must be canonical');
  }
  if (intent.kind !== 'market_swap') {
    throw new Error('Real execution kind is unsupported');
  }
  validateChainId(intent.chainId);
  validateAsset(intent.sourceAsset, 'source asset');
  validateAsset(intent.targetAsset, 'target asset');
  if (intent.sourceAsset.tokenAddress === intent.targetAsset.tokenAddress) {
    throw new Error('Real execution assets must be distinct');
  }
  validatePositiveDecimal(intent.sourceQuantity, 'source quantity');
  validateNonNegativeDecimal(intent.maxSlippageRate, 'maximum slippage rate');
  if (new ExactDecimal(intent.maxSlippageRate).greaterThan(1)) {
    throw new Error('Real execution maximum slippage rate must not exceed one');
  }
  validateDate(intent.createdAt, 'intent creation time');
}

export function validateRealExecutionQuote(quote: RealExecutionQuote): void {
  validateUuid(quote.id, 'quote id');
  validateProviderId(quote.providerId);
  if (quote.providerQuoteId !== null) {
    validateOpaqueId(quote.providerQuoteId, 'provider quote id');
  }
  validateRealExecutionIntent(quote.intent);
  validatePositiveDecimal(
    quote.expectedTargetQuantity,
    'expected target quantity',
  );
  validatePositiveDecimal(
    quote.minimumTargetQuantity,
    'minimum target quantity',
  );
  if (
    new ExactDecimal(quote.minimumTargetQuantity).greaterThan(
      quote.expectedTargetQuantity,
    )
  ) {
    throw new Error(
      'Real execution minimum target quantity must not exceed expected quantity',
    );
  }
  if (quote.costs.length > 32) {
    throw new Error('Real execution quote costs must be bounded');
  }
  for (const cost of quote.costs) {
    if (cost.kind !== 'network_fee' && cost.kind !== 'provider_fee') {
      throw new Error('Real execution quote cost kind is unsupported');
    }
    validateAsset(cost.asset, 'quote cost asset');
    validateNonNegativeDecimal(cost.quantity, 'quote cost quantity');
  }
  if (quote.costCoverage !== 'complete' && quote.costCoverage !== 'partial') {
    throw new Error('Real execution quote cost coverage is unsupported');
  }
  validateDate(quote.quotedAt, 'quote time');
  validateDate(quote.expiresAt, 'quote expiry time');
  if (quote.quotedAt.getTime() < quote.intent.createdAt.getTime()) {
    throw new Error('Real execution quote must not precede its intent');
  }
  if (quote.expiresAt.getTime() <= quote.quotedAt.getTime()) {
    throw new Error('Real execution quote expiry must follow quote time');
  }
  if (quote.executable !== false) {
    throw new Error('Real execution quote must be non-executable');
  }
}

export function validateRealExecutionResult(result: RealExecutionResult): void {
  validateUuid(result.id, 'result id');
  validateProviderId(result.providerId);
  validateUuid(result.quoteId, 'result quote id');
  validateUuid(result.intentId, 'result intent id');
  validateOpaqueId(result.providerOrderId, 'provider order id');
  if (result.transactionHash !== null) {
    validateOpaqueId(result.transactionHash, 'transaction hash');
  }
  if (!['pending', 'finished', 'failed'].includes(result.status)) {
    throw new Error('Real execution result status is unsupported');
  }
  validateDate(result.submittedAt, 'submission time');
  validateDate(result.observedAt, 'result observation time');
  if (result.observedAt.getTime() < result.submittedAt.getTime()) {
    throw new Error('Real execution result must not predate submission');
  }
  if (result.status === 'finished') {
    if (result.transactionHash === null) {
      throw new Error('Finished real execution requires a transaction hash');
    }
    if (result.actualTargetQuantity === null) {
      throw new Error('Finished real execution requires a target quantity');
    }
    validatePositiveDecimal(
      result.actualTargetQuantity,
      'actual target quantity',
    );
  } else if (result.actualTargetQuantity !== null) {
    throw new Error(
      'Non-finished real execution must not claim a target quantity',
    );
  }
  if (result.automaticRetryAllowed !== false) {
    throw new Error('Real execution result must forbid automatic retry');
  }
}

export function validateRealExecutionCapabilitySnapshot(
  snapshot: RealExecutionCapabilitySnapshot,
): void {
  validateProviderId(snapshot.providerId);
  if (typeof snapshot.connected !== 'boolean') {
    throw new Error('Real execution connection state must be boolean');
  }
  if (snapshot.chains.length > 32) {
    throw new Error('Real execution capability chains must be bounded');
  }
  const chainIds = new Set<string>();
  for (const chain of snapshot.chains) {
    validateChainId(chain.chainId);
    if (chainIds.has(chain.chainId)) {
      throw new Error('Real execution capability chains must be unique');
    }
    chainIds.add(chain.chainId);
    if (new Set(chain.operations).size !== chain.operations.length) {
      throw new Error('Real execution chain operations must be unique');
    }
    for (const operation of chain.operations) {
      if (
        operation !== 'market_swap_quote' &&
        operation !== 'market_swap_submit'
      ) {
        throw new Error('Real execution operation is unsupported');
      }
    }
    if (
      chain.operations.includes('market_swap_submit') &&
      !chain.operations.includes('market_swap_quote')
    ) {
      throw new Error('Real execution submission requires quote capability');
    }
  }
  for (const value of Object.values(snapshot.reads)) {
    if (typeof value !== 'boolean') {
      throw new Error('Real execution read capability must be boolean');
    }
  }
  validateDate(snapshot.observedAt, 'capability observation time');
}

function validateAsset(asset: RealExecutionAsset, field: string): void {
  if (!OPAQUE_ID_PATTERN.test(asset.tokenAddress)) {
    throw new Error(`Real execution ${field} address must be canonical`);
  }
  if (asset.symbol !== null && !ASSET_SYMBOL_PATTERN.test(asset.symbol)) {
    throw new Error(`Real execution ${field} symbol must be canonical`);
  }
}

function validateUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error(`Real execution ${field} must be a canonical UUID`);
  }
}

function validateProviderId(value: string): void {
  if (!PROVIDER_ID_PATTERN.test(value)) {
    throw new Error('Real execution provider id must be canonical');
  }
}

function validateChainId(value: string): void {
  if (!CHAIN_ID_PATTERN.test(value)) {
    throw new Error('Real execution chain id must be canonical');
  }
}

function validateOpaqueId(value: string, field: string): void {
  if (!OPAQUE_ID_PATTERN.test(value)) {
    throw new Error(`Real execution ${field} must be canonical`);
  }
}

function validatePositiveDecimal(value: string, field: string): void {
  if (!POSITIVE_DECIMAL_PATTERN.test(value)) {
    throw new Error(`Real execution ${field} must be positive`);
  }
}

function validateNonNegativeDecimal(value: string, field: string): void {
  if (!NON_NEGATIVE_DECIMAL_PATTERN.test(value)) {
    throw new Error(`Real execution ${field} must be non-negative`);
  }
}

function validateDate(value: Date, field: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error(`Real execution ${field} must be valid`);
  }
}
