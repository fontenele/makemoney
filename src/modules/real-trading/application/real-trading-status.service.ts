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

export interface RealTradingLocalStatus {
  readonly scope: 'real_trading_local_status';
  readonly tradingMode: 'paper' | 'real';
  readonly realExecutionEnabled: boolean;
  readonly runtimeExecutionAvailable: false;
  readonly instrument: typeof APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  readonly walletObservationMode: 'manual_read_only';
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

interface RealTradingEnvironment {
  readonly TRADING_MODE: 'paper' | 'real';
  readonly REAL_EXECUTION_ENABLED: boolean;
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
}
