import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { RealTradingStatusService } from './real-trading-status.service';
import {
  AgenticWalletCapabilityAdapter,
  AgenticWalletCapabilityObservation,
} from '../infrastructure/agentic-wallet-capability.adapter';

describe('RealTradingStatusService', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-01T12:00:00.000Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports local fail-closed gates without reading the provider', () => {
    const wallet = { load: jest.fn() };
    const service = new RealTradingStatusService(
      config({ TRADING_MODE: 'paper', REAL_EXECUTION_ENABLED: false }),
      wallet as unknown as AgenticWalletCapabilityAdapter,
    );

    expect(service.getLocalStatus()).toMatchObject({
      scope: 'real_trading_local_status',
      tradingMode: 'paper',
      realExecutionEnabled: false,
      runtimeExecutionAvailable: false,
      instrument: {
        providerId: 'agentic_wallet',
        chainId: '56',
        btc: { symbol: 'BTCB' },
        usdt: { symbol: 'USDT' },
      },
      walletObservationMode: 'manual_read_only',
      localRiskLimits: {
        scope: 'real_execution_local_risk_limits',
        status: 'blocked',
        blockers: [
          'maximum_order_notional_unconfigured',
          'maximum_daily_spend_unconfigured',
          'maximum_bankroll_unconfigured',
          'maximum_provider_fee_rate_unconfigured',
          'maximum_network_fee_unconfigured',
          'maximum_slippage_rate_unconfigured',
        ],
        providerDailyLimitUsed: false,
        fundingAuthorized: false,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(wallet.load).not.toHaveBeenCalled();
  });

  it('sanitizes the wallet read and coalesces concurrent observations', async () => {
    let resolveObservation!: (
      value: AgenticWalletCapabilityObservation,
    ) => void;
    const providerResult = new Promise<AgenticWalletCapabilityObservation>(
      (resolve) => {
        resolveObservation = resolve;
      },
    );
    const wallet = { load: jest.fn(() => providerResult) };
    const service = new RealTradingStatusService(
      config({ TRADING_MODE: 'paper', REAL_EXECUTION_ENABLED: false }),
      wallet as unknown as AgenticWalletCapabilityAdapter,
    );

    const first = service.observeWallet();
    const second = service.observeWallet();
    expect(wallet.load).toHaveBeenCalledTimes(1);

    resolveObservation(connectedObservation());
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult).toBe(secondResult);
    expect(firstResult).toMatchObject({
      providerId: 'agentic_wallet',
      connection: 'connected',
      approvedChain: {
        chainId: '56',
        available: true,
        addressAvailable: true,
      },
      security: {
        tradeAllTokens: false,
        predictionTradingEnabled: false,
        developerModeEnabled: false,
      },
      securityAssessment: {
        scope: 'agentic_wallet_security_posture',
        status: 'restrictive',
        blockers: [],
        providerDailyLimitAcceptedAsProjectRiskLimit: false,
        independentProjectLimitsRequired: true,
        fundingAuthorized: false,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
      balance: { available: true, assetCount: 0, empty: true },
      gasAvailable: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(firstResult).not.toHaveProperty('addresses');
    expect(JSON.stringify(firstResult)).not.toContain('0xprivate-address');
  });
});

function config(values: {
  TRADING_MODE: 'paper' | 'real';
  REAL_EXECUTION_ENABLED: boolean;
}): ConfigService<Record<string, unknown>, true> {
  const completeValues = {
    REAL_RISK_MAX_ORDER_NOTIONAL_USDT: null,
    REAL_RISK_MAX_DAILY_SPEND_USDT: null,
    REAL_RISK_MAX_BANKROLL_USDT: null,
    REAL_RISK_MAX_PROVIDER_FEE_RATE: null,
    REAL_RISK_MAX_NETWORK_FEE_USDT: null,
    REAL_RISK_MAX_SLIPPAGE_RATE: null,
    ...values,
  };
  return {
    get: jest.fn((key: keyof typeof completeValues) => completeValues[key]),
  } as unknown as ConfigService<Record<string, unknown>, true>;
}

function connectedObservation(): AgenticWalletCapabilityObservation {
  return {
    cliVersion: '1.10.0',
    requiredCliVersion: '1.10.0',
    capabilities: {
      providerId: 'agentic_wallet',
      connected: true,
      chains: [{ chainId: '56', operations: [] }],
      reads: {
        securitySettings: true,
        quota: true,
        balances: true,
        gas: true,
      },
      observedAt: new Date('2026-09-30T23:48:42.000Z'),
    },
    settings: {
      dailyLimitUsd: '1000',
      abnormalTransactionHandling: 'AutoReject',
      tradeAllTokens: false,
      predictionTradingEnabled: false,
      developerModeEnabled: false,
      sessionExpiresAt: new Date('2026-10-02T23:48:42.000Z'),
      signInMaximumAt: new Date('2027-09-30T23:48:42.000Z'),
      inactivitySignOutAt: new Date('2026-10-02T23:48:42.000Z'),
    },
    quota: {
      usedUsd: '0',
      remainingUsd: '1000',
      date: '2026-09-30',
    },
    addresses: [{ chainId: '56', address: '0xprivate-address' }],
    balances: [],
    gas: {
      chainId: '56',
      baseFeePerGas: '0',
      low: gasLevel(),
      medium: gasLevel(),
      high: gasLevel(),
    },
  };
}

function gasLevel() {
  return {
    gasPrice: '0.05',
    maxFeePerGas: '0.05',
    maxPriorityFeePerGas: '0.05',
    tipAmount: null,
    waitTimeEstimateMs: 1000,
  };
}
