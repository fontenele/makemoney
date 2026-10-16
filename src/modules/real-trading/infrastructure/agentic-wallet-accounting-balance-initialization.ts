import Decimal from 'decimal.js';

import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import {
  AgenticWalletBalance,
  AgenticWalletCapabilityObservation,
} from './agentic-wallet-capability.adapter';
import { AgenticWalletMarketSwapLocalAccountingBalance } from './agentic-wallet-market-swap-accounting-mutation-application';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EVM_ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SYMBOL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;
const MAXIMUM_OBSERVATION_AGE_MS = 60_000;

export const ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT =
  'connected_wallet_balances_reviewed_for_local_accounting_initialization' as const;

export interface AgenticWalletAccountingBalanceInitializationRequest {
  readonly initializationId: string;
  readonly acknowledgment: typeof ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT;
  readonly maximumObservationAgeMs: number;
  readonly preparedAt: Date;
}

export interface AgenticWalletAccountingBalanceInitialization {
  readonly scope: 'agentic_wallet_accounting_balance_initialization';
  readonly initializationId: string;
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly acknowledgment: typeof ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT;
  readonly balances: readonly AgenticWalletMarketSwapLocalAccountingBalance[];
  readonly balanceCoverageComplete: true;
  readonly walletObservedAt: Date;
  readonly maximumObservationAgeMs: number;
  readonly preparedAt: Date;
  readonly accountingBalanceInitializationPrepared: true;
  readonly accountingBalancesInitialized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export type AgenticWalletAccountingBalanceInitializationBlocker =
  | 'invalid_wallet_observation'
  | 'invalid_accounting_balance_initialization_request'
  | 'accounting_balance_initialization_acknowledgment_missing'
  | 'wallet_not_connected'
  | 'approved_chain_unavailable'
  | 'approved_chain_address_unavailable'
  | 'wallet_balance_read_unavailable'
  | 'required_accounting_balance_coverage_incomplete'
  | 'required_accounting_balance_identity_mismatch'
  | 'wallet_balance_observation_from_future'
  | 'wallet_balance_observation_stale';

export interface AgenticWalletAccountingBalanceInitializationAssessment {
  readonly scope: 'agentic_wallet_accounting_balance_initialization_assessment';
  readonly status: 'accounting_balance_initialization_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingBalanceInitializationBlocker[];
  readonly initialization: AgenticWalletAccountingBalanceInitialization | null;
  readonly accountingBalanceInitializationPrepared: boolean;
  readonly accountingBalancesInitialized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function prepareAgenticWalletAccountingBalanceInitialization(
  observation: AgenticWalletCapabilityObservation,
  request: AgenticWalletAccountingBalanceInitializationRequest,
): AgenticWalletAccountingBalanceInitializationAssessment {
  const blockers: AgenticWalletAccountingBalanceInitializationBlocker[] = [];
  const observationValid = isValidObservation(observation);
  const requestValid = isValidRequest(request);
  addIf(blockers, !observationValid, 'invalid_wallet_observation');
  addIf(
    blockers,
    !requestValid,
    'invalid_accounting_balance_initialization_request',
  );
  addIf(
    blockers,
    request?.acknowledgment !==
      ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
    'accounting_balance_initialization_acknowledgment_missing',
  );

  let balances: AgenticWalletMarketSwapLocalAccountingBalance[] | null = null;
  if (observationValid) {
    addIf(
      blockers,
      observation.capabilities.connected !== true,
      'wallet_not_connected',
    );
    addIf(
      blockers,
      !observation.capabilities.chains.some((chain) => chain.chainId === '56'),
      'approved_chain_unavailable',
    );
    addIf(
      blockers,
      !observation.addresses.some((address) => address.chainId === '56'),
      'approved_chain_address_unavailable',
    );
    addIf(
      blockers,
      observation.capabilities.reads.balances !== true,
      'wallet_balance_read_unavailable',
    );
    const selected = selectRequiredBalances(observation.balances);
    balances = selected.balances;
    addIf(
      blockers,
      selected.coverageIncomplete,
      'required_accounting_balance_coverage_incomplete',
    );
    addIf(
      blockers,
      selected.identityMismatch,
      'required_accounting_balance_identity_mismatch',
    );
  }

  if (observationValid && requestValid) {
    const ageMs =
      request.preparedAt.getTime() -
      observation.capabilities.observedAt.getTime();
    addIf(blockers, ageMs < 0, 'wallet_balance_observation_from_future');
    addIf(
      blockers,
      ageMs > request.maximumObservationAgeMs,
      'wallet_balance_observation_stale',
    );
  }

  const initialization =
    blockers.length === 0 && balances !== null
      ? buildInitialization(observation, request, balances)
      : null;
  return {
    scope: 'agentic_wallet_accounting_balance_initialization_assessment',
    status:
      initialization === null
        ? 'blocked'
        : 'accounting_balance_initialization_ready',
    blockers,
    initialization,
    accountingBalanceInitializationPrepared: initialization !== null,
    accountingBalancesInitialized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

export function isValidAgenticWalletAccountingBalanceInitialization(
  value: unknown,
): value is AgenticWalletAccountingBalanceInitialization {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const initialization = value as Record<string, unknown>;
  if (
    initialization.scope !==
      'agentic_wallet_accounting_balance_initialization' ||
    typeof initialization.initializationId !== 'string' ||
    !UUID_PATTERN.test(initialization.initializationId) ||
    initialization.providerId !== 'agentic_wallet' ||
    initialization.chainId !== '56' ||
    initialization.acknowledgment !==
      ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT ||
    initialization.balanceCoverageComplete !== true ||
    initialization.accountingBalanceInitializationPrepared !== true ||
    initialization.accountingBalancesInitialized !== false ||
    initialization.quoteAuthorized !== false ||
    initialization.submissionAuthorized !== false ||
    !Number.isSafeInteger(initialization.maximumObservationAgeMs) ||
    (initialization.maximumObservationAgeMs as number) < 1 ||
    (initialization.maximumObservationAgeMs as number) >
      MAXIMUM_OBSERVATION_AGE_MS ||
    !(initialization.walletObservedAt instanceof Date) ||
    !Number.isFinite(initialization.walletObservedAt.getTime()) ||
    !(initialization.preparedAt instanceof Date) ||
    !Number.isFinite(initialization.preparedAt.getTime()) ||
    initialization.preparedAt.getTime() <
      initialization.walletObservedAt.getTime() ||
    initialization.preparedAt.getTime() -
      initialization.walletObservedAt.getTime() >
      (initialization.maximumObservationAgeMs as number) ||
    !Array.isArray(initialization.balances) ||
    initialization.balances.length !== 3
  )
    return false;
  return hasExactInitializationBalances(initialization.balances);
}

function isValidObservation(
  value: unknown,
): value is AgenticWalletCapabilityObservation {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const observation = value as Record<string, unknown>;
  const capabilities = observation.capabilities;
  if (
    observation.cliVersion !== '1.10.0' ||
    observation.requiredCliVersion !== '1.10.0' ||
    typeof capabilities !== 'object' ||
    capabilities === null ||
    Array.isArray(capabilities)
  )
    return false;
  const capabilityRecord = capabilities as Record<string, unknown>;
  const reads = capabilityRecord.reads;
  const chains = capabilityRecord.chains;
  const addresses = observation.addresses;
  const balances = observation.balances;
  if (
    capabilityRecord.providerId !== 'agentic_wallet' ||
    typeof capabilityRecord.connected !== 'boolean' ||
    !Array.isArray(chains) ||
    chains.length > 32 ||
    typeof reads !== 'object' ||
    reads === null ||
    Array.isArray(reads) ||
    typeof (reads as Record<string, unknown>).balances !== 'boolean' ||
    !(capabilityRecord.observedAt instanceof Date) ||
    !Number.isFinite(capabilityRecord.observedAt.getTime()) ||
    !Array.isArray(addresses) ||
    addresses.length > 32 ||
    !Array.isArray(balances) ||
    balances.length > 256
  )
    return false;

  if (
    chains.some(
      (chain) =>
        typeof chain !== 'object' ||
        chain === null ||
        Array.isArray(chain) ||
        typeof (chain as Record<string, unknown>).chainId !== 'string',
    ) ||
    addresses.some(
      (address) =>
        typeof address !== 'object' ||
        address === null ||
        Array.isArray(address) ||
        typeof (address as Record<string, unknown>).chainId !== 'string' ||
        typeof (address as Record<string, unknown>).address !== 'string' ||
        ((address as Record<string, unknown>).address as string).length < 1 ||
        ((address as Record<string, unknown>).address as string).length > 256,
    )
  )
    return false;
  if (!balances.every(isValidProviderBalance)) return false;
  return (
    new Set(
      balances.map((balance) => `${balance.chainId}:${balance.tokenAddress}`),
    ).size === balances.length
  );
}

function isValidProviderBalance(value: unknown): value is AgenticWalletBalance {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const balance = value as Record<string, unknown>;
  return (
    balance.chainId === '56' &&
    typeof balance.tokenAddress === 'string' &&
    balance.tokenAddress.length >= 1 &&
    balance.tokenAddress.length <= 256 &&
    typeof balance.symbol === 'string' &&
    SYMBOL_PATTERN.test(balance.symbol) &&
    typeof balance.quantity === 'string' &&
    DECIMAL_PATTERN.test(balance.quantity)
  );
}

function isValidRequest(
  value: unknown,
): value is AgenticWalletAccountingBalanceInitializationRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const request = value as Record<string, unknown>;
  return (
    typeof request.initializationId === 'string' &&
    UUID_PATTERN.test(request.initializationId) &&
    Number.isSafeInteger(request.maximumObservationAgeMs) &&
    (request.maximumObservationAgeMs as number) >= 1 &&
    (request.maximumObservationAgeMs as number) <= MAXIMUM_OBSERVATION_AGE_MS &&
    request.preparedAt instanceof Date &&
    Number.isFinite(request.preparedAt.getTime())
  );
}

function selectRequiredBalances(balances: readonly AgenticWalletBalance[]): {
  balances: AgenticWalletMarketSwapLocalAccountingBalance[];
  coverageIncomplete: boolean;
  identityMismatch: boolean;
} {
  const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const usdt = balances.filter(
    (balance) =>
      balance.tokenAddress.toLowerCase() === instrument.usdt.tokenAddress,
  );
  const btcb = balances.filter(
    (balance) =>
      balance.tokenAddress.toLowerCase() === instrument.btc.tokenAddress,
  );
  const bnb = balances.filter((balance) => balance.symbol === 'BNB');
  const coverageIncomplete =
    usdt.length !== 1 || btcb.length !== 1 || bnb.length !== 1;
  const identityMismatch =
    (usdt.length === 1 &&
      (usdt[0].symbol !== 'USDT' ||
        !EVM_ADDRESS_PATTERN.test(usdt[0].tokenAddress))) ||
    (btcb.length === 1 &&
      (btcb[0].symbol !== 'BTCB' ||
        !EVM_ADDRESS_PATTERN.test(btcb[0].tokenAddress))) ||
    (bnb.length === 1 &&
      [instrument.usdt.tokenAddress, instrument.btc.tokenAddress].some(
        (address) => address === bnb[0].tokenAddress.toLowerCase(),
      ));
  if (coverageIncomplete || identityMismatch)
    return { balances: [], coverageIncomplete, identityMismatch };

  const selectedBalances: AgenticWalletMarketSwapLocalAccountingBalance[] = [
    {
      assetType: 'token',
      assetAddress: instrument.usdt.tokenAddress,
      currentQuantity: canonicalDecimal(usdt[0].quantity),
    },
    {
      assetType: 'token',
      assetAddress: instrument.btc.tokenAddress,
      currentQuantity: canonicalDecimal(btcb[0].quantity),
    },
    {
      assetType: 'native',
      assetSymbol: 'BNB',
      currentQuantity: canonicalDecimal(bnb[0].quantity),
    },
  ];
  return {
    balances: selectedBalances.sort((left, right) =>
      identity(left).localeCompare(identity(right)),
    ),
    coverageIncomplete: false,
    identityMismatch: false,
  };
}

function buildInitialization(
  observation: AgenticWalletCapabilityObservation,
  request: AgenticWalletAccountingBalanceInitializationRequest,
  balances: readonly AgenticWalletMarketSwapLocalAccountingBalance[],
): AgenticWalletAccountingBalanceInitialization {
  return {
    scope: 'agentic_wallet_accounting_balance_initialization',
    initializationId: request.initializationId,
    providerId: 'agentic_wallet',
    chainId: '56',
    acknowledgment: ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
    balances: balances.map((balance) => ({ ...balance })),
    balanceCoverageComplete: true,
    walletObservedAt: new Date(observation.capabilities.observedAt),
    maximumObservationAgeMs: request.maximumObservationAgeMs,
    preparedAt: new Date(request.preparedAt),
    accountingBalanceInitializationPrepared: true,
    accountingBalancesInitialized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function hasExactInitializationBalances(value: readonly unknown[]): boolean {
  const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const identities = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
      return false;
    const balance = raw as Record<string, unknown>;
    const validAsset =
      balance.assetType === 'token'
        ? (balance.assetAddress === instrument.usdt.tokenAddress ||
            balance.assetAddress === instrument.btc.tokenAddress) &&
          EVM_ADDRESS_PATTERN.test(balance.assetAddress)
        : balance.assetType === 'native' && balance.assetSymbol === 'BNB';
    if (
      !validAsset ||
      typeof balance.currentQuantity !== 'string' ||
      !/^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/.test(balance.currentQuantity)
    )
      return false;
    const key = identity(
      balance as unknown as AgenticWalletMarketSwapLocalAccountingBalance,
    );
    if (identities.has(key)) return false;
    identities.add(key);
  }
  return (
    identities.has(`token:${instrument.usdt.tokenAddress}`) &&
    identities.has(`token:${instrument.btc.tokenAddress}`) &&
    identities.has('native:BNB')
  );
}

function canonicalDecimal(value: string): string {
  return new ExactDecimal(value).toFixed();
}

function identity(
  value: AgenticWalletMarketSwapLocalAccountingBalance,
): string {
  return value.assetType === 'token'
    ? `token:${value.assetAddress}`
    : `native:${value.assetSymbol}`;
}

function addIf(
  blockers: AgenticWalletAccountingBalanceInitializationBlocker[],
  condition: boolean,
  blocker: AgenticWalletAccountingBalanceInitializationBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
