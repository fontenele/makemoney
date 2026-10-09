import { RealExecutionCapabilitySnapshot } from '../domain/real-execution';
import { AgenticWalletReadCommandRunner } from './agentic-wallet-read-command-runner';

const PROVIDER_ID = 'agentic_wallet';
const REQUIRED_CLI_VERSION = '1.10.0';
const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const OPAQUE_ID_PATTERN = /^\S{1,256}$/;
const SYMBOL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export interface AgenticWalletSecuritySettings {
  readonly dailyLimitUsd: string;
  readonly abnormalTransactionHandling: 'AutoReject' | 'NeedConfirmation';
  readonly tradeAllTokens: boolean;
  readonly predictionTradingEnabled: boolean;
  readonly developerModeEnabled: boolean;
  readonly sessionExpiresAt: Date;
  readonly signInMaximumAt: Date;
  readonly inactivitySignOutAt: Date;
}

export interface AgenticWalletQuota {
  readonly usedUsd: string;
  readonly remainingUsd: string;
  readonly date: string;
}

export interface AgenticWalletAddress {
  readonly chainId: string;
  readonly address: string;
}

export interface AgenticWalletBalance {
  readonly chainId: string;
  readonly tokenAddress: string;
  readonly symbol: string;
  readonly quantity: string;
}

export interface AgenticWalletGasLevel {
  readonly gasPrice: string;
  readonly maxFeePerGas: string | null;
  readonly maxPriorityFeePerGas: string | null;
  readonly tipAmount: string | null;
  readonly waitTimeEstimateMs: number | null;
}

export interface AgenticWalletGasSnapshot {
  readonly chainId: string;
  readonly baseFeePerGas: string | null;
  readonly low: AgenticWalletGasLevel;
  readonly medium: AgenticWalletGasLevel;
  readonly high: AgenticWalletGasLevel;
}

export interface AgenticWalletCapabilityObservation {
  readonly cliVersion: string;
  readonly requiredCliVersion: typeof REQUIRED_CLI_VERSION;
  readonly capabilities: RealExecutionCapabilitySnapshot;
  readonly settings: AgenticWalletSecuritySettings | null;
  readonly quota: AgenticWalletQuota | null;
  readonly addresses: readonly AgenticWalletAddress[];
  readonly balances: readonly AgenticWalletBalance[];
  readonly gas: AgenticWalletGasSnapshot | null;
}

export class AgenticWalletCapabilityAdapter {
  constructor(private readonly runner: AgenticWalletReadCommandRunner) {}

  async load(
    chainId: string,
    observedAt: Date,
    signal?: AbortSignal,
  ): Promise<AgenticWalletCapabilityObservation> {
    validateChainId(chainId);
    validateDate(observedAt);

    const version = parseCliVersion(
      await this.runner.run({ kind: 'cli_version' }, signal),
    );
    const status = parseStatus(
      await this.runner.run({ kind: 'wallet_status' }, signal),
    );
    if (status !== 'CONNECTED') {
      return disconnectedObservation(version, observedAt);
    }

    const chains = parseChains(
      await this.runner.run({ kind: 'wallet_chains' }, signal),
    );
    if (!chains.includes(chainId)) {
      throw new Error('Agentic Wallet approved chain is unavailable');
    }
    const addresses = parseAddresses(
      await this.runner.run({ kind: 'wallet_address' }, signal),
    );
    if (!addresses.some((address) => address.chainId === chainId)) {
      throw new Error('Agentic Wallet approved chain address is unavailable');
    }
    const balances = parseBalances(
      await this.runner.run({ kind: 'wallet_balance', chainId }, signal),
      chainId,
    );
    const gas = parseGas(
      await this.runner.run({ kind: 'wallet_gas_price', chainId }, signal),
      chainId,
    );
    // Keep settings last: the provider's inactivity deadline reflects the
    // preceding authenticated token use, so this produces the freshest
    // provider-owned deadline without inventing a local renewal.
    const settings = parseSettings(
      await this.runner.run({ kind: 'wallet_settings' }, signal),
    );

    return {
      cliVersion: version,
      requiredCliVersion: REQUIRED_CLI_VERSION,
      capabilities: {
        providerId: PROVIDER_ID,
        connected: true,
        chains: chains.map((supportedChainId) => ({
          chainId: supportedChainId,
          operations: [],
        })),
        reads: {
          securitySettings: true,
          quota: true,
          balances: true,
          gas: true,
        },
        observedAt: new Date(observedAt),
      },
      settings: settings.security,
      quota: settings.quota,
      addresses,
      balances,
      gas,
    };
  }
}

function disconnectedObservation(
  cliVersion: string,
  observedAt: Date,
): AgenticWalletCapabilityObservation {
  return {
    cliVersion,
    requiredCliVersion: REQUIRED_CLI_VERSION,
    capabilities: {
      providerId: PROVIDER_ID,
      connected: false,
      chains: [],
      reads: {
        securitySettings: false,
        quota: false,
        balances: false,
        gas: false,
      },
      observedAt: new Date(observedAt),
    },
    settings: null,
    quota: null,
    addresses: [],
    balances: [],
    gas: null,
  };
}

function parseCliVersion(value: unknown): string {
  const data = envelopeData(value);
  const version = requiredString(record(data).currentCliVersion, 'CLI version');
  if (!VERSION_PATTERN.test(version)) {
    throw new Error('Agentic Wallet CLI version is invalid');
  }
  if (
    record(data).needUpdateCli !== false ||
    version !== REQUIRED_CLI_VERSION
  ) {
    throw new Error(
      'Agentic Wallet CLI version does not match the pinned version',
    );
  }
  return version;
}

function parseStatus(value: unknown): 'CONNECTED' | 'CREATING' | 'UNCONNECTED' {
  const status = requiredString(record(envelopeData(value)).status, 'status');
  if (!['CONNECTED', 'CREATING', 'UNCONNECTED'].includes(status)) {
    throw new Error('Agentic Wallet connection status is invalid');
  }
  return status as 'CONNECTED' | 'CREATING' | 'UNCONNECTED';
}

function parseChains(value: unknown): string[] {
  const data = boundedArray(envelopeData(value), 32, 'chains');
  const chains = data.map((item) => {
    const chainId = requiredString(record(item).binanceChainId, 'chain id');
    validateChainId(chainId);
    return chainId;
  });
  requireUnique(chains, 'Agentic Wallet chains');
  return chains;
}

function parseSettings(value: unknown): {
  security: AgenticWalletSecuritySettings;
  quota: AgenticWalletQuota;
} {
  const data = record(envelopeData(value));
  const handling = requiredString(
    data.abnormalTxnHandling,
    'abnormal transaction handling',
  );
  if (handling !== 'AutoReject' && handling !== 'NeedConfirmation') {
    throw new Error('Agentic Wallet abnormal transaction handling is invalid');
  }
  if (typeof data.tradeAllTokens !== 'boolean') {
    throw new Error('Agentic Wallet token-scope setting is invalid');
  }
  if (typeof data.predictionEnabled !== 'boolean') {
    throw new Error('Agentic Wallet prediction setting is invalid');
  }
  const developerMode = record(data.devMode);
  if (typeof developerMode.enabled !== 'boolean') {
    throw new Error('Agentic Wallet developer-mode setting is invalid');
  }
  const sessionExpiresAt = new Date(
    requiredString(data.sessionExpireTime, 'session expiry'),
  );
  const signInMaximumAt = new Date(
    requiredString(data.signInMaxTime, 'sign-in maximum'),
  );
  const inactivitySignOutAt = new Date(
    requiredString(data.inactiveSignOutTime, 'inactivity sign-out'),
  );
  validateDate(sessionExpiresAt);
  validateDate(signInMaximumAt);
  validateDate(inactivitySignOutAt);
  return {
    security: {
      dailyLimitUsd: decimal(data.dailyLimit, 'daily limit'),
      abnormalTransactionHandling: handling,
      tradeAllTokens: data.tradeAllTokens,
      predictionTradingEnabled: data.predictionEnabled,
      developerModeEnabled: developerMode.enabled,
      sessionExpiresAt,
      signInMaximumAt,
      inactivitySignOutAt,
    },
    quota: {
      usedUsd: decimal(data.quotaUsed, 'quota used'),
      remainingUsd: decimal(data.quotaLeft, 'quota left'),
      date: canonicalDate(data.quotaDate),
    },
  };
}

function parseAddresses(value: unknown): AgenticWalletAddress[] {
  const data = record(envelopeData(value));
  const addresses = boundedArray(data.addresses, 32, 'addresses').map(
    (item) => {
      const itemRecord = record(item);
      const chainId = requiredString(
        itemRecord.binanceChainId,
        'address chain id',
      );
      const address = requiredString(itemRecord.address, 'wallet address');
      validateChainId(chainId);
      validateOpaque(address, 'wallet address');
      return { chainId, address };
    },
  );
  requireUnique(
    addresses.map((address) => address.chainId),
    'Agentic Wallet address chains',
  );
  return addresses;
}

function parseBalances(
  value: unknown,
  requestedChainId: string,
): AgenticWalletBalance[] {
  const balances = boundedArray(envelopeData(value), 256, 'balances').map(
    (item) => {
      const itemRecord = record(item);
      const chainId = requiredString(
        itemRecord.binanceChainId,
        'balance chain id',
      );
      const tokenAddress = requiredString(itemRecord.address, 'token address');
      const symbol = requiredString(itemRecord.symbol, 'token symbol');
      validateChainId(chainId);
      validateOpaque(tokenAddress, 'token address');
      if (!SYMBOL_PATTERN.test(symbol)) {
        throw new Error('Agentic Wallet token symbol is invalid');
      }
      if (chainId !== requestedChainId) {
        throw new Error(
          'Agentic Wallet balance chain does not match the request',
        );
      }
      return {
        chainId,
        tokenAddress,
        symbol,
        quantity: decimal(itemRecord.balance, 'balance'),
      };
    },
  );
  requireUnique(
    balances.map((balance) => `${balance.chainId}:${balance.tokenAddress}`),
    'Agentic Wallet balances',
  );
  return balances;
}

function parseGas(value: unknown, chainId: string): AgenticWalletGasSnapshot {
  const data = record(envelopeData(value));
  return {
    chainId,
    baseFeePerGas: nullableDecimal(data.baseFeePerGas, 'base fee'),
    low: gasLevel(data.low),
    medium: gasLevel(data.medium),
    high: gasLevel(data.high),
  };
}

function gasLevel(value: unknown): AgenticWalletGasLevel {
  const data = record(value);
  const wait = data.waitTimeEstimate;
  if (wait !== null && (!Number.isSafeInteger(wait) || (wait as number) < 0)) {
    throw new Error('Agentic Wallet gas wait estimate is invalid');
  }
  return {
    gasPrice: decimal(data.gasPrice, 'gas price'),
    maxFeePerGas: nullableDecimal(data.maxFeePerGas, 'maximum gas fee'),
    maxPriorityFeePerGas: nullableDecimal(
      data.maxPriorityFeePerGas,
      'maximum priority gas fee',
    ),
    tipAmount: nullableDecimal(data.tipAmount, 'gas tip'),
    waitTimeEstimateMs: wait as number | null,
  };
}

function envelopeData(value: unknown): unknown {
  const envelope = record(value);
  if (envelope.success !== true || !('data' in envelope)) {
    throw new Error('Agentic Wallet read command was unsuccessful');
  }
  return envelope.data;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Agentic Wallet response object is invalid');
  }
  return value as Record<string, unknown>;
}

function boundedArray(value: unknown, limit: number, field: string): unknown[] {
  if (!Array.isArray(value) || value.length > limit) {
    throw new Error(`Agentic Wallet ${field} are invalid or unbounded`);
  }
  return value;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Agentic Wallet ${field} is invalid`);
  }
  return value;
}

function decimal(value: unknown, field: string): string {
  const normalized =
    typeof value === 'number' && Number.isSafeInteger(value)
      ? value.toString()
      : value;
  if (typeof normalized !== 'string' || !DECIMAL_PATTERN.test(normalized)) {
    throw new Error(`Agentic Wallet ${field} is invalid`);
  }
  return normalized;
}

function nullableDecimal(value: unknown, field: string): string | null {
  return value === null ? null : decimal(value, field);
}

function canonicalDate(value: unknown): string {
  const date = requiredString(value, 'quota date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Agentic Wallet quota date is invalid');
  }
  return date;
}

function validateChainId(value: string): void {
  if (!CHAIN_ID_PATTERN.test(value)) {
    throw new Error('Agentic Wallet chain id is invalid');
  }
}

function validateOpaque(value: string, field: string): void {
  if (!OPAQUE_ID_PATTERN.test(value)) {
    throw new Error(`Agentic Wallet ${field} is invalid`);
  }
}

function validateDate(value: Date): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('Agentic Wallet observation date is invalid');
  }
}

function requireUnique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`${field} must be unique`);
  }
}
