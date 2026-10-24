import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { RealTradingStatusService } from './real-trading-status.service';
import {
  AgenticWalletCapabilityAdapter,
  AgenticWalletCapabilityObservation,
} from '../infrastructure/agentic-wallet-capability.adapter';
import { BinanceFundingValuationPriceClient } from '../infrastructure/binance-funding-valuation-price.client';

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
      fundingPrices(),
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
      walletObservationMode: 'manual_and_dashboard_automatic_read_only',
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
      fundingPrices(),
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

  it('reveals the exact BSC address only for an explicit ready deposit review', async () => {
    const observation = connectedObservation();
    observation.addresses = [
      { chainId: '56', address: '0x1234567890abcdef1234567890abcdef12345678' },
    ];
    const wallet = { load: jest.fn(() => Promise.resolve(observation)) };
    const service = new RealTradingStatusService(
      config({
        TRADING_MODE: 'paper',
        REAL_EXECUTION_ENABLED: false,
        REAL_RISK_MAX_ORDER_NOTIONAL_USDT: '1',
        REAL_RISK_MAX_DAILY_SPEND_USDT: '2',
        REAL_RISK_MAX_BANKROLL_USDT: '12',
        REAL_RISK_MAX_PROVIDER_FEE_RATE: '0.005',
        REAL_RISK_MAX_NETWORK_FEE_USDT: '0.5',
        REAL_RISK_MAX_SLIPPAGE_RATE: '0.005',
      }),
      wallet as unknown as AgenticWalletCapabilityAdapter,
      fundingPrices(),
    );

    await expect(service.prepareFundingReadiness()).resolves.toMatchObject({
      scope: 'agentic_wallet_funding_readiness',
      status: 'ready_for_operator_deposit',
      blockers: [],
      destination: {
        network: 'BNB Smart Chain',
        chainId: '56',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      },
      walletReportedEmpty: true,
      operatorTransferRequired: true,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(wallet.load).toHaveBeenCalledTimes(1);
  });

  it('withholds the address when deposit readiness is blocked', async () => {
    const observation = connectedObservation();
    observation.addresses = [
      { chainId: '56', address: '0x1234567890abcdef1234567890abcdef12345678' },
    ];
    observation.balances = [
      {
        chainId: '56',
        tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
        symbol: 'USDT',
        quantity: '1',
      },
    ];
    const wallet = { load: jest.fn(() => Promise.resolve(observation)) };
    const service = new RealTradingStatusService(
      config({ TRADING_MODE: 'paper', REAL_EXECUTION_ENABLED: false }),
      wallet as unknown as AgenticWalletCapabilityAdapter,
      fundingPrices(),
    );

    await expect(service.prepareFundingReadiness()).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['local_risk_limits_blocked', 'wallet_not_empty'],
      destination: null,
      fundingAuthorized: false,
    });
  });

  it('reports exact approved holdings after manual funding without authorizing use', async () => {
    const observation = connectedObservation();
    observation.addresses = [
      { chainId: '56', address: '0x1234567890abcdef1234567890abcdef12345678' },
    ];
    observation.balances = [
      {
        chainId: '56',
        tokenAddress: 'native-bnb',
        symbol: 'BNB',
        quantity: '0.00975323',
      },
    ];
    const wallet = { load: jest.fn(() => Promise.resolve(observation)) };
    const service = new RealTradingStatusService(
      config({ TRADING_MODE: 'paper', REAL_EXECUTION_ENABLED: false }),
      wallet as unknown as AgenticWalletCapabilityAdapter,
      fundingPrices(),
    );

    await expect(service.verifyFunding()).resolves.toEqual({
      scope: 'agentic_wallet_funding_verification',
      status: 'funds_observed',
      blockers: [],
      observedAt: new Date('2026-10-01T12:00:00.000Z'),
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      assets: [
        {
          symbol: 'BNB',
          role: 'network_gas',
          reportStatus: 'reported',
          quantity: '0.00975323',
        },
        {
          symbol: 'USDT',
          role: 'strategy_quote_asset',
          reportStatus: 'not_reported',
          quantity: null,
        },
        {
          symbol: 'BTCB',
          role: 'strategy_base_asset',
          reportStatus: 'not_reported',
          quantity: null,
        },
      ],
      unsupportedAssetCount: 0,
      strategyQuoteAssetReported: false,
      conversionRequiredForBuyCapital: true,
      additionalFundingRequired: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('blocks funding verification when an unsupported asset is reported', async () => {
    const observation = connectedObservation();
    observation.balances = [
      {
        chainId: '56',
        tokenAddress: '0x1111111111111111111111111111111111111111',
        symbol: 'OTHER',
        quantity: '1',
      },
    ];
    const wallet = { load: jest.fn(() => Promise.resolve(observation)) };
    const service = new RealTradingStatusService(
      config({ TRADING_MODE: 'paper', REAL_EXECUTION_ENABLED: false }),
      wallet as unknown as AgenticWalletCapabilityAdapter,
      fundingPrices(),
    );

    await expect(service.verifyFunding()).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['unsupported_asset_reported'],
      unsupportedAssetCount: 1,
      strategyQuoteAssetReported: false,
      conversionRequiredForBuyCapital: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('values the automatically observed BNB balance in USDT and BRL exactly', async () => {
    const observation = connectedObservation();
    observation.addresses = [
      { chainId: '56', address: '0x1234567890abcdef1234567890abcdef12345678' },
    ];
    observation.balances = [
      {
        chainId: '56',
        tokenAddress: 'native-bnb',
        symbol: 'BNB',
        quantity: '0.00975323',
      },
    ];
    const wallet = { load: jest.fn(() => Promise.resolve(observation)) };
    const { client: prices, load: loadPrices } = fundingPricesMock();
    const service = new RealTradingStatusService(
      config({ TRADING_MODE: 'paper', REAL_EXECUTION_ENABLED: false }),
      wallet as unknown as AgenticWalletCapabilityAdapter,
      prices,
    );

    await expect(service.loadFundingValuation()).resolves.toEqual({
      scope: 'agentic_wallet_funding_valuation',
      status: 'available',
      blockers: [],
      balanceObservedAt: new Date('2026-10-01T12:00:00.000Z'),
      pricesObservedAt: new Date('2026-10-01T12:00:00.000Z'),
      balance: {
        quantityBnb: '0.00975323',
        valueUsdt: '7.2387497737',
        valueBrl: '36.51587323342965',
      },
      prices: {
        provider: 'binance',
        bnbUsdt: '742.19',
        usdtBrl: '5.0445',
      },
      refreshMode: 'initial_and_manual',
      valuationOnly: true,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(loadPrices).toHaveBeenCalledTimes(1);
  });

  it('does not request Binance prices when BNB is not reported', async () => {
    const observation = connectedObservation();
    observation.balances = [
      {
        chainId: '56',
        tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
        symbol: 'USDT',
        quantity: '1',
      },
    ];
    const wallet = { load: jest.fn(() => Promise.resolve(observation)) };
    const { client: prices, load: loadPrices } = fundingPricesMock();
    const service = new RealTradingStatusService(
      config({ TRADING_MODE: 'paper', REAL_EXECUTION_ENABLED: false }),
      wallet as unknown as AgenticWalletCapabilityAdapter,
      prices,
    );

    await expect(service.loadFundingValuation()).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['bnb_not_reported'],
      balance: null,
      prices: null,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(loadPrices).not.toHaveBeenCalled();
  });
});

function config(values: {
  TRADING_MODE: 'paper' | 'real';
  REAL_EXECUTION_ENABLED: boolean;
  REAL_RISK_MAX_ORDER_NOTIONAL_USDT?: string;
  REAL_RISK_MAX_DAILY_SPEND_USDT?: string;
  REAL_RISK_MAX_BANKROLL_USDT?: string;
  REAL_RISK_MAX_PROVIDER_FEE_RATE?: string;
  REAL_RISK_MAX_NETWORK_FEE_USDT?: string;
  REAL_RISK_MAX_SLIPPAGE_RATE?: string;
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

function fundingPrices(): BinanceFundingValuationPriceClient {
  return {
    load: jest.fn(() =>
      Promise.resolve({
        provider: 'binance' as const,
        bnbUsdtPrice: '742.19',
        usdtBrlPrice: '5.0445',
        observedAt: new Date('2026-10-01T12:00:00.000Z'),
      }),
    ),
  } as unknown as BinanceFundingValuationPriceClient;
}

function fundingPricesMock() {
  const load = jest.fn(() =>
    Promise.resolve({
      provider: 'binance' as const,
      bnbUsdtPrice: '742.19',
      usdtBrlPrice: '5.0445',
      observedAt: new Date('2026-10-01T12:00:00.000Z'),
    }),
  );
  return {
    client: { load } as unknown as BinanceFundingValuationPriceClient,
    load,
  };
}
