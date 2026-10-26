import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import {
  AgenticWalletCapabilityAdapter,
  AgenticWalletCapabilityObservation,
} from '../infrastructure/agentic-wallet-capability.adapter';
import {
  AgenticWalletSecurityAssessment,
  assessAgenticWalletSecurity,
} from './agentic-wallet-security-policy';
import {
  assessRealExecutionLocalRiskLimits,
  RealExecutionLocalRiskLimitAssessment,
} from './real-execution-local-risk-limits';
import {
  BinanceFundingValuationPriceClient,
  BinanceFundingValuationPrices,
} from '../infrastructure/binance-funding-valuation-price.client';

export interface RealTradingLocalStatus {
  readonly scope: 'real_trading_local_status';
  readonly tradingMode: 'paper' | 'real';
  readonly realExecutionEnabled: boolean;
  readonly operatorSubmissionEnabled: boolean;
  readonly runtimeExecutionAvailable: boolean;
  readonly instrument: typeof APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  readonly walletObservationMode: 'manual_and_dashboard_automatic_read_only';
  readonly localRiskLimits: RealExecutionLocalRiskLimitAssessment;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

interface RealTradingEnvironment {
  readonly TRADING_MODE: 'paper' | 'real';
  readonly REAL_EXECUTION_ENABLED: boolean;
  readonly REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED: boolean;
  readonly REAL_RISK_MAX_ORDER_NOTIONAL_USDT: string | null;
  readonly REAL_RISK_MAX_DAILY_SPEND_USDT: string | null;
  readonly REAL_RISK_MAX_BANKROLL_USDT: string | null;
  readonly REAL_RISK_MAX_PROVIDER_FEE_RATE: string | null;
  readonly REAL_RISK_MAX_NETWORK_FEE_USDT: string | null;
  readonly REAL_RISK_MAX_SLIPPAGE_RATE: string | null;
}

export interface RealTradingWalletObservation {
  readonly providerId: 'agentic_wallet';
  readonly connection: 'connected' | 'disconnected';
  readonly observedAt: Date;
  readonly cliVersion: string;
  readonly requiredCliVersion: string;
  readonly approvedChain: {
    readonly chainId: '56';
    readonly available: boolean;
    readonly addressAvailable: boolean;
  };
  readonly security: {
    readonly dailyLimitUsd: string;
    readonly abnormalTransactionHandling: 'AutoReject' | 'NeedConfirmation';
    readonly tradeAllTokens: boolean;
    readonly predictionTradingEnabled: boolean;
    readonly developerModeEnabled: boolean;
    readonly sessionExpiresAt: Date;
    readonly signInMaximumAt: Date;
    readonly inactivitySignOutAt: Date;
  } | null;
  readonly securityAssessment: AgenticWalletSecurityAssessment;
  readonly quota: AgenticWalletCapabilityObservation['quota'];
  readonly balance: {
    readonly available: boolean;
    readonly assetCount: number;
    readonly empty: boolean;
  };
  readonly gasAvailable: boolean;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export type AgenticWalletFundingReadinessBlocker =
  | 'wallet_disconnected'
  | 'approved_chain_unavailable'
  | 'approved_chain_address_unavailable'
  | 'approved_chain_address_invalid'
  | 'security_posture_blocked'
  | 'local_risk_limits_blocked'
  | 'balance_read_unavailable'
  | 'wallet_not_empty'
  | 'gas_read_unavailable';

export interface AgenticWalletFundingReadiness {
  readonly scope: 'agentic_wallet_funding_readiness';
  readonly status: 'ready_for_operator_deposit' | 'blocked';
  readonly blockers: readonly AgenticWalletFundingReadinessBlocker[];
  readonly observedAt: Date;
  readonly destination: {
    readonly network: 'BNB Smart Chain';
    readonly chainId: '56';
    readonly address: string;
  } | null;
  readonly walletReportedEmpty: boolean;
  readonly operatorTransferRequired: true;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export type AgenticWalletFundingVerificationBlocker =
  | 'wallet_disconnected'
  | 'approved_chain_unavailable'
  | 'approved_chain_address_unavailable'
  | 'balance_read_unavailable'
  | 'wallet_empty'
  | 'approved_asset_identity_invalid'
  | 'unsupported_asset_reported'
  | 'gas_read_unavailable';

export interface AgenticWalletFundingVerification {
  readonly scope: 'agentic_wallet_funding_verification';
  readonly status: 'funds_observed' | 'blocked';
  readonly blockers: readonly AgenticWalletFundingVerificationBlocker[];
  readonly observedAt: Date;
  readonly walletAddress: string | null;
  readonly assets: readonly {
    readonly symbol: 'BNB' | 'USDT' | 'BTCB';
    readonly role:
      'network_gas' | 'strategy_quote_asset' | 'strategy_base_asset';
    readonly reportStatus: 'reported' | 'not_reported';
    readonly quantity: string | null;
  }[];
  readonly unsupportedAssetCount: number;
  readonly strategyQuoteAssetReported: boolean;
  readonly conversionRequiredForBuyCapital: boolean;
  readonly additionalFundingRequired: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export interface AgenticWalletFundingValuation {
  readonly scope: 'agentic_wallet_funding_valuation';
  readonly status: 'available' | 'blocked';
  readonly blockers: readonly (
    AgenticWalletFundingVerificationBlocker | 'bnb_not_reported'
  )[];
  readonly balanceObservedAt: Date;
  readonly pricesObservedAt: Date | null;
  readonly balance: {
    readonly quantityBnb: string;
    readonly valueUsdt: string;
    readonly valueBrl: string;
  } | null;
  readonly prices: {
    readonly provider: 'binance';
    readonly bnbUsdt: string;
    readonly usdtBrl: string;
  } | null;
  readonly refreshMode: 'initial_and_manual';
  readonly valuationOnly: true;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const ExactDecimal = Decimal.clone({ precision: 40 });

@Injectable()
export class RealTradingStatusService {
  private observationInFlight: Promise<RealTradingWalletObservation> | null =
    null;

  constructor(
    private readonly config: ConfigService<RealTradingEnvironment, true>,
    private readonly wallet: AgenticWalletCapabilityAdapter,
    private readonly fundingPrices: BinanceFundingValuationPriceClient,
  ) {}

  getLocalStatus(): RealTradingLocalStatus {
    const operatorSubmissionEnabled = this.config.get(
      'REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED',
      { infer: true },
    );
    return {
      scope: 'real_trading_local_status',
      tradingMode: this.config.get('TRADING_MODE', { infer: true }),
      realExecutionEnabled: this.config.get('REAL_EXECUTION_ENABLED', {
        infer: true,
      }),
      operatorSubmissionEnabled,
      runtimeExecutionAvailable: operatorSubmissionEnabled,
      instrument: APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
      walletObservationMode: 'manual_and_dashboard_automatic_read_only',
      localRiskLimits: assessRealExecutionLocalRiskLimits({
        maximumOrderNotionalUsdt: this.config.get(
          'REAL_RISK_MAX_ORDER_NOTIONAL_USDT',
          { infer: true },
        ),
        maximumDailySpendUsdt: this.config.get(
          'REAL_RISK_MAX_DAILY_SPEND_USDT',
          { infer: true },
        ),
        maximumBankrollUsdt: this.config.get('REAL_RISK_MAX_BANKROLL_USDT', {
          infer: true,
        }),
        maximumProviderFeeRate: this.config.get(
          'REAL_RISK_MAX_PROVIDER_FEE_RATE',
          { infer: true },
        ),
        maximumNetworkFeeUsdt: this.config.get(
          'REAL_RISK_MAX_NETWORK_FEE_USDT',
          { infer: true },
        ),
        maximumSlippageRate: this.config.get('REAL_RISK_MAX_SLIPPAGE_RATE', {
          infer: true,
        }),
      }),
      quoteAuthorized: false,
      submissionAuthorized: false,
    };
  }

  observeWallet(): Promise<RealTradingWalletObservation> {
    if (this.observationInFlight) return this.observationInFlight;

    const operation = this.loadWalletObservation();
    this.observationInFlight = operation;
    const clear = (): void => {
      if (this.observationInFlight === operation) {
        this.observationInFlight = null;
      }
    };
    void operation.then(clear, clear);
    return operation;
  }

  async prepareFundingReadiness(): Promise<AgenticWalletFundingReadiness> {
    const observedAt = new Date();
    const observation = await this.wallet.load('56', observedAt);
    const security = assessAgenticWalletSecurity(
      observation.settings,
      observation.quota,
      observedAt,
    );
    const localRiskLimits = this.getLocalRiskLimits();
    const approvedAddresses = observation.addresses.filter(
      (address) => address.chainId === '56',
    );
    const approvedAddress =
      approvedAddresses.length === 1 ? approvedAddresses[0].address : null;
    const blockers: AgenticWalletFundingReadinessBlocker[] = [];

    addFundingBlocker(
      blockers,
      !observation.capabilities.connected,
      'wallet_disconnected',
    );
    addFundingBlocker(
      blockers,
      !observation.capabilities.chains.some((chain) => chain.chainId === '56'),
      'approved_chain_unavailable',
    );
    addFundingBlocker(
      blockers,
      approvedAddress === null,
      'approved_chain_address_unavailable',
    );
    addFundingBlocker(
      blockers,
      approvedAddress !== null && !EVM_ADDRESS_PATTERN.test(approvedAddress),
      'approved_chain_address_invalid',
    );
    addFundingBlocker(
      blockers,
      security.status !== 'restrictive',
      'security_posture_blocked',
    );
    addFundingBlocker(
      blockers,
      localRiskLimits.status !== 'defined',
      'local_risk_limits_blocked',
    );
    addFundingBlocker(
      blockers,
      !observation.capabilities.reads.balances,
      'balance_read_unavailable',
    );
    addFundingBlocker(
      blockers,
      observation.balances.length !== 0,
      'wallet_not_empty',
    );
    addFundingBlocker(
      blockers,
      !observation.capabilities.reads.gas || observation.gas === null,
      'gas_read_unavailable',
    );

    const ready = blockers.length === 0 && approvedAddress !== null;
    return {
      scope: 'agentic_wallet_funding_readiness',
      status: ready ? 'ready_for_operator_deposit' : 'blocked',
      blockers,
      observedAt,
      destination: ready
        ? {
            network: 'BNB Smart Chain',
            chainId: '56',
            address: approvedAddress,
          }
        : null,
      walletReportedEmpty: observation.balances.length === 0,
      operatorTransferRequired: true,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    };
  }

  async verifyFunding(): Promise<AgenticWalletFundingVerification> {
    const observedAt = new Date();
    const observation = await this.wallet.load('56', observedAt);
    const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
    const usdt = observation.balances.filter(
      (balance) =>
        balance.tokenAddress.toLowerCase() === instrument.usdt.tokenAddress,
    );
    const btcb = observation.balances.filter(
      (balance) =>
        balance.tokenAddress.toLowerCase() === instrument.btc.tokenAddress,
    );
    const bnb = observation.balances.filter(
      (balance) =>
        balance.symbol === 'BNB' &&
        balance.tokenAddress.toLowerCase() !== instrument.usdt.tokenAddress &&
        balance.tokenAddress.toLowerCase() !== instrument.btc.tokenAddress,
    );
    const approved = new Set([...usdt, ...btcb, ...bnb]);
    const unsupportedAssetCount = observation.balances.filter(
      (balance) => !approved.has(balance),
    ).length;
    const identityInvalid =
      usdt.length > 1 ||
      btcb.length > 1 ||
      bnb.length > 1 ||
      (usdt.length === 1 && usdt[0].symbol !== 'USDT') ||
      (btcb.length === 1 && btcb[0].symbol !== 'BTCB');
    const blockers: AgenticWalletFundingVerificationBlocker[] = [];

    addFundingVerificationBlocker(
      blockers,
      !observation.capabilities.connected,
      'wallet_disconnected',
    );
    addFundingVerificationBlocker(
      blockers,
      !observation.capabilities.chains.some((chain) => chain.chainId === '56'),
      'approved_chain_unavailable',
    );
    addFundingVerificationBlocker(
      blockers,
      !observation.addresses.some((address) => address.chainId === '56'),
      'approved_chain_address_unavailable',
    );
    addFundingVerificationBlocker(
      blockers,
      !observation.capabilities.reads.balances,
      'balance_read_unavailable',
    );
    addFundingVerificationBlocker(
      blockers,
      observation.balances.length === 0,
      'wallet_empty',
    );
    addFundingVerificationBlocker(
      blockers,
      identityInvalid,
      'approved_asset_identity_invalid',
    );
    addFundingVerificationBlocker(
      blockers,
      unsupportedAssetCount !== 0,
      'unsupported_asset_reported',
    );
    addFundingVerificationBlocker(
      blockers,
      !observation.capabilities.reads.gas || observation.gas === null,
      'gas_read_unavailable',
    );

    const assets = [
      fundingAsset('BNB', 'network_gas', identityInvalid ? [] : bnb),
      fundingAsset('USDT', 'strategy_quote_asset', identityInvalid ? [] : usdt),
      fundingAsset('BTCB', 'strategy_base_asset', identityInvalid ? [] : btcb),
    ] as const;
    const strategyQuoteAssetReported =
      assets[1].quantity !== null &&
      new ExactDecimal(assets[1].quantity).greaterThan(0);
    const bnbReported =
      assets[0].quantity !== null &&
      new ExactDecimal(assets[0].quantity).greaterThan(0);

    return {
      scope: 'agentic_wallet_funding_verification',
      status: blockers.length === 0 ? 'funds_observed' : 'blocked',
      blockers,
      observedAt,
      walletAddress:
        observation.addresses.filter((address) => address.chainId === '56')
          .length === 1
          ? observation.addresses.find((address) => address.chainId === '56')!
              .address
          : null,
      assets,
      unsupportedAssetCount,
      strategyQuoteAssetReported,
      conversionRequiredForBuyCapital:
        bnbReported && !strategyQuoteAssetReported,
      additionalFundingRequired: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    };
  }

  async loadFundingValuation(): Promise<AgenticWalletFundingValuation> {
    const verification = await this.verifyFunding();
    const bnb = verification.assets.find((asset) => asset.symbol === 'BNB');
    const blockers: Array<
      AgenticWalletFundingVerificationBlocker | 'bnb_not_reported'
    > = [...verification.blockers];
    if (bnb?.quantity === null || bnb?.quantity === undefined) {
      blockers.push('bnb_not_reported');
    }
    if (blockers.length !== 0 || bnb?.quantity === null || bnb === undefined) {
      return blockedFundingValuation(verification.observedAt, blockers);
    }

    const prices = await this.fundingPrices.load();
    return availableFundingValuation(
      verification.observedAt,
      bnb.quantity,
      prices,
    );
  }

  private async loadWalletObservation(): Promise<RealTradingWalletObservation> {
    const observedAt = new Date();
    const observation = await this.wallet.load('56', observedAt);
    const connected = observation.capabilities.connected;

    return {
      providerId: 'agentic_wallet',
      connection: connected ? 'connected' : 'disconnected',
      observedAt,
      cliVersion: observation.cliVersion,
      requiredCliVersion: observation.requiredCliVersion,
      approvedChain: {
        chainId: '56',
        available: observation.capabilities.chains.some(
          (chain) => chain.chainId === '56',
        ),
        addressAvailable: observation.addresses.some(
          (address) => address.chainId === '56',
        ),
      },
      security: observation.settings,
      securityAssessment: assessAgenticWalletSecurity(
        observation.settings,
        observation.quota,
        observedAt,
      ),
      quota: observation.quota,
      balance: {
        available: observation.capabilities.reads.balances,
        assetCount: observation.balances.length,
        empty: observation.balances.length === 0,
      },
      gasAvailable: observation.gas !== null,
      quoteAuthorized: false,
      submissionAuthorized: false,
    };
  }

  private getLocalRiskLimits(): RealExecutionLocalRiskLimitAssessment {
    return this.getLocalStatus().localRiskLimits;
  }
}

function addFundingBlocker(
  blockers: AgenticWalletFundingReadinessBlocker[],
  condition: boolean,
  blocker: AgenticWalletFundingReadinessBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}

function addFundingVerificationBlocker(
  blockers: AgenticWalletFundingVerificationBlocker[],
  condition: boolean,
  blocker: AgenticWalletFundingVerificationBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}

function fundingAsset(
  symbol: 'BNB' | 'USDT' | 'BTCB',
  role: 'network_gas' | 'strategy_quote_asset' | 'strategy_base_asset',
  balances: readonly AgenticWalletCapabilityObservation['balances'][number][],
) {
  const balance = balances.length === 1 ? balances[0] : null;
  return {
    symbol,
    role,
    reportStatus:
      balance === null ? ('not_reported' as const) : ('reported' as const),
    quantity: balance?.quantity ?? null,
  };
}

function blockedFundingValuation(
  balanceObservedAt: Date,
  blockers: AgenticWalletFundingValuation['blockers'],
): AgenticWalletFundingValuation {
  return {
    scope: 'agentic_wallet_funding_valuation',
    status: 'blocked',
    blockers,
    balanceObservedAt,
    pricesObservedAt: null,
    balance: null,
    prices: null,
    refreshMode: 'initial_and_manual',
    valuationOnly: true,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function availableFundingValuation(
  balanceObservedAt: Date,
  quantityBnb: string,
  prices: BinanceFundingValuationPrices,
): AgenticWalletFundingValuation {
  const valueUsdt = new ExactDecimal(quantityBnb).times(prices.bnbUsdtPrice);
  const valueBrl = valueUsdt.times(prices.usdtBrlPrice);
  return {
    scope: 'agentic_wallet_funding_valuation',
    status: 'available',
    blockers: [],
    balanceObservedAt,
    pricesObservedAt: new Date(prices.observedAt),
    balance: {
      quantityBnb,
      valueUsdt: valueUsdt.toFixed(),
      valueBrl: valueBrl.toFixed(),
    },
    prices: {
      provider: 'binance',
      bnbUsdt: prices.bnbUsdtPrice,
      usdtBrl: prices.usdtBrlPrice,
    },
    refreshMode: 'initial_and_manual',
    valuationOnly: true,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}
