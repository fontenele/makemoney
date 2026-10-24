import { Module } from '@nestjs/common';
import { RealTradingStatusService } from './application/real-trading-status.service';
import { AgenticWalletCapabilityAdapter } from './infrastructure/agentic-wallet-capability.adapter';
import { AgenticWalletCliProcessRunner } from './infrastructure/agentic-wallet-cli-process-runner';
import { RealTradingController } from './presentation/real-trading.controller';
import { AgenticWalletAuthenticationService } from './application/agentic-wallet-authentication.service';
import {
  AgenticWalletAuthenticationAdapter,
  AgenticWalletAuthenticationCliProcessRunner,
} from './infrastructure/agentic-wallet-authentication.adapter';
import { ConfigService } from '@nestjs/config';
import { BinanceFundingValuationPriceClient } from './infrastructure/binance-funding-valuation-price.client';
import { AgenticWalletFundingConversionQuoteService } from './application/agentic-wallet-funding-conversion-quote.service';
import { AgenticWalletFundingConversionQuoteAdapter } from './infrastructure/agentic-wallet-funding-conversion-quote.adapter';
import { AgenticWalletQuoteCliProcessRunner } from './infrastructure/agentic-wallet-quote-cli-process-runner';
import { AgenticWalletFundingConversionPlanService } from './application/agentic-wallet-funding-conversion-plan.service';
import { AgenticWalletFundingConversionPlanStore } from './application/agentic-wallet-funding-conversion-plan.store';
import { PrismaAgenticWalletFundingConversionPlanStore } from './infrastructure/prisma-agentic-wallet-funding-conversion-plan.store';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { EmergencyStopService } from '../risk-engine/application/emergency-stop.service';
import {
  AgenticWalletFundingConversionSubmissionService,
  FundingConversionSubmissionEnvironment,
} from './application/agentic-wallet-funding-conversion-submission.service';
import { AgenticWalletFundingConversionPreBalanceReader } from './application/agentic-wallet-funding-conversion-pre-balance.reader';
import { BscFundingConversionPreBalanceReader } from './infrastructure/bsc-funding-conversion-pre-balance.reader';
import { AgenticWalletFundingConversionFeeEvidenceReader } from './application/agentic-wallet-funding-conversion-fee-evidence.reader';
import { AgenticWalletFundingConversionFeeEvidenceAdapter } from './infrastructure/agentic-wallet-funding-conversion-fee-evidence.adapter';
import { AgenticWalletFundingConversionSubmissionAttemptStore } from './application/agentic-wallet-funding-conversion-submission-attempt.store';
import { PrismaAgenticWalletFundingConversionSubmissionAttemptStore } from './infrastructure/prisma-agentic-wallet-funding-conversion-submission-attempt.store';
import { AgenticWalletFundingConversionSubmissionOutcomeStore } from './application/agentic-wallet-funding-conversion-submission-outcome.store';
import { PrismaAgenticWalletFundingConversionSubmissionOutcomeStore } from './infrastructure/prisma-agentic-wallet-funding-conversion-submission-outcome.store';
import { AgenticWalletFundingConversionSwapCliProcessRunner } from './infrastructure/agentic-wallet-funding-conversion-swap-command-runner';

@Module({
  imports: [RiskEngineModule],
  controllers: [RealTradingController],
  providers: [
    {
      provide: AgenticWalletCapabilityAdapter,
      useFactory: () =>
        new AgenticWalletCapabilityAdapter(
          new AgenticWalletCliProcessRunner(30000),
        ),
    },
    {
      provide: AgenticWalletAuthenticationAdapter,
      useFactory: () =>
        new AgenticWalletAuthenticationAdapter(
          new AgenticWalletAuthenticationCliProcessRunner(),
        ),
    },
    AgenticWalletAuthenticationService,
    {
      provide: BinanceFundingValuationPriceClient,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new BinanceFundingValuationPriceClient(
          config.getOrThrow<string>('BINANCE_REST_BASE_URL'),
        ),
    },
    RealTradingStatusService,
    {
      provide: AgenticWalletFundingConversionQuoteAdapter,
      useFactory: () =>
        new AgenticWalletFundingConversionQuoteAdapter(
          new AgenticWalletQuoteCliProcessRunner(10000),
        ),
    },
    AgenticWalletFundingConversionQuoteService,
    {
      provide: AgenticWalletFundingConversionPlanStore,
      useClass: PrismaAgenticWalletFundingConversionPlanStore,
    },
    AgenticWalletFundingConversionPlanService,
    {
      provide: AgenticWalletFundingConversionPreBalanceReader,
      useClass: BscFundingConversionPreBalanceReader,
    },
    {
      provide: AgenticWalletFundingConversionFeeEvidenceReader,
      useClass: AgenticWalletFundingConversionFeeEvidenceAdapter,
    },
    {
      provide: AgenticWalletFundingConversionSubmissionAttemptStore,
      useClass: PrismaAgenticWalletFundingConversionSubmissionAttemptStore,
    },
    {
      provide: AgenticWalletFundingConversionSubmissionOutcomeStore,
      useClass: PrismaAgenticWalletFundingConversionSubmissionOutcomeStore,
    },
    {
      provide: AgenticWalletFundingConversionSubmissionService,
      inject: [
        AgenticWalletFundingConversionQuoteService,
        ConfigService,
        EmergencyStopService,
        AgenticWalletFundingConversionPreBalanceReader,
        AgenticWalletFundingConversionFeeEvidenceReader,
        AgenticWalletFundingConversionSubmissionAttemptStore,
        AgenticWalletFundingConversionSubmissionOutcomeStore,
      ],
      useFactory: (
        quotes: AgenticWalletFundingConversionQuoteService,
        config: ConfigService<FundingConversionSubmissionEnvironment, true>,
        emergencyStop: EmergencyStopService,
        preBalances: AgenticWalletFundingConversionPreBalanceReader,
        feeEvidence: AgenticWalletFundingConversionFeeEvidenceReader,
        attempts: AgenticWalletFundingConversionSubmissionAttemptStore,
        outcomes: AgenticWalletFundingConversionSubmissionOutcomeStore,
      ) =>
        new AgenticWalletFundingConversionSubmissionService(
          quotes,
          config,
          emergencyStop,
          preBalances,
          feeEvidence,
          attempts,
          new AgenticWalletFundingConversionSwapCliProcessRunner(30000),
          outcomes,
        ),
    },
  ],
})
export class RealTradingModule {}
