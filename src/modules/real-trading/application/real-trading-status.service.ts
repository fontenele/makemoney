import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

export interface RealTradingLocalStatus {
  readonly scope: 'real_trading_local_status';
  readonly tradingMode: 'paper' | 'real';
  readonly realExecutionEnabled: boolean;
  readonly runtimeExecutionAvailable: false;
  readonly instrument: typeof APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  readonly walletObservationMode: 'manual_read_only';
  readonly localRiskLimits: RealExecutionLocalRiskLimitAssessment;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

interface RealTradingEnvironment {
  readonly TRADING_MODE: 'paper' | 'real';
  readonly REAL_EXECUTION_ENABLED: boolean;
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

const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

@Injectable()
export class RealTradingStatusService {
  private observationInFlight: Promise<RealTradingWalletObservation> | null =
    null;

  constructor(
    private readonly config: ConfigService<RealTradingEnvironment, true>,
    private readonly wallet: AgenticWalletCapabilityAdapter,
  ) {}

  getLocalStatus(): RealTradingLocalStatus {
    return {
      scope: 'real_trading_local_status',
      tradingMode: this.config.get('TRADING_MODE', { infer: true }),
      realExecutionEnabled: this.config.get('REAL_EXECUTION_ENABLED', {
        infer: true,
      }),
      runtimeExecutionAvailable: false,
      instrument: APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
      walletObservationMode: 'manual_read_only',
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
