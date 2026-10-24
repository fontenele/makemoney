import { Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AgenticWalletFundingConversionStatusContextStore } from './application/agentic-wallet-funding-conversion-status-context.store';
import { AgenticWalletFundingConversionStatusObservationStore } from './application/agentic-wallet-funding-conversion-status-observation.store';
import { AgenticWalletFundingConversionStatusService } from './application/agentic-wallet-funding-conversion-status.service';
import { PrismaAgenticWalletFundingConversionStatusContextStore } from './infrastructure/prisma-agentic-wallet-funding-conversion-status-context.store';
import { PrismaAgenticWalletFundingConversionStatusObservationStore } from './infrastructure/prisma-agentic-wallet-funding-conversion-status-observation.store';
import { AgenticWalletMarketSwapStatusLookupCliProcessRunner } from './infrastructure/agentic-wallet-market-swap-status-lookup-cli-process-runner';
import { AgenticWalletFundingConversionFinancialEvidenceContextStore } from './application/agentic-wallet-funding-conversion-financial-evidence-context.store';
import { AgenticWalletFundingConversionFinancialEvidenceReader } from './application/agentic-wallet-funding-conversion-financial-evidence.reader';
import { AgenticWalletFundingConversionPostBalanceReader } from './application/agentic-wallet-funding-conversion-post-balance.reader';
import { AgenticWalletFundingConversionTransactionReceiptReader } from './application/agentic-wallet-funding-conversion-transaction-receipt.reader';
import { AgenticWalletFundingConversionFinancialReconciliationStore } from './application/agentic-wallet-funding-conversion-financial-reconciliation.store';
import { AgenticWalletFundingConversionFinancialReconciliationService } from './application/agentic-wallet-funding-conversion-financial-reconciliation.service';
import { PrismaAgenticWalletFundingConversionFinancialEvidenceContextStore } from './infrastructure/prisma-agentic-wallet-funding-conversion-financial-evidence-context.store';
import { AgenticWalletFundingConversionCompleteFinancialEvidenceReader } from './infrastructure/agentic-wallet-funding-conversion-financial-evidence.reader';
import { AgenticWalletFundingConversionTransactionReceiptAdapter } from './infrastructure/agentic-wallet-funding-conversion-transaction-receipt.adapter';
import { BscFundingConversionPostBalanceReader } from './infrastructure/bsc-funding-conversion-post-balance.reader';
import { PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore } from './infrastructure/prisma-agentic-wallet-funding-conversion-financial-reconciliation-read.store';
import { PrismaAgenticWalletFundingConversionFinancialReconciliationStore } from './infrastructure/prisma-agentic-wallet-funding-conversion-financial-reconciliation.store';

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
    {
      provide: AgenticWalletFundingConversionStatusContextStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletFundingConversionStatusContextStore(prisma),
    },
    {
      provide: AgenticWalletFundingConversionStatusObservationStore,
      useClass: PrismaAgenticWalletFundingConversionStatusObservationStore,
    },
    {
      provide: AgenticWalletFundingConversionStatusService,
      inject: [
        AgenticWalletFundingConversionStatusContextStore,
        AgenticWalletFundingConversionStatusObservationStore,
      ],
      useFactory: (
        contexts: AgenticWalletFundingConversionStatusContextStore,
        observations: AgenticWalletFundingConversionStatusObservationStore,
      ) =>
        new AgenticWalletFundingConversionStatusService(
          contexts,
          new AgenticWalletMarketSwapStatusLookupCliProcessRunner(10000),
          observations,
          () => new Date(),
          randomUUID,
        ),
    },
    {
      provide: AgenticWalletFundingConversionFinancialEvidenceContextStore,
      useClass:
        PrismaAgenticWalletFundingConversionFinancialEvidenceContextStore,
    },
    {
      provide: AgenticWalletFundingConversionTransactionReceiptReader,
      useFactory: () =>
        new AgenticWalletFundingConversionTransactionReceiptAdapter(),
    },
    {
      provide: AgenticWalletFundingConversionPostBalanceReader,
      useClass: BscFundingConversionPostBalanceReader,
    },
    {
      provide: AgenticWalletFundingConversionFinancialEvidenceReader,
      inject: [
        AgenticWalletFundingConversionFinancialEvidenceContextStore,
        AgenticWalletFundingConversionTransactionReceiptReader,
        AgenticWalletFundingConversionPostBalanceReader,
      ],
      useFactory: (
        contexts: AgenticWalletFundingConversionFinancialEvidenceContextStore,
        receipts: AgenticWalletFundingConversionTransactionReceiptReader,
        postBalances: AgenticWalletFundingConversionPostBalanceReader,
      ) =>
        new AgenticWalletFundingConversionCompleteFinancialEvidenceReader(
          contexts,
          receipts,
          postBalances,
        ),
    },
    {
      provide:
        PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore(
          prisma,
        ),
    },
    {
      provide: AgenticWalletFundingConversionFinancialReconciliationStore,
      useClass:
        PrismaAgenticWalletFundingConversionFinancialReconciliationStore,
    },
    {
      provide: AgenticWalletFundingConversionFinancialReconciliationService,
      inject: [
        PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore,
        AgenticWalletFundingConversionFinancialEvidenceReader,
        AgenticWalletFundingConversionFinancialReconciliationStore,
      ],
      useFactory: (
        reconciliations: PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore,
        evidence: AgenticWalletFundingConversionFinancialEvidenceReader,
        store: AgenticWalletFundingConversionFinancialReconciliationStore,
      ) =>
        new AgenticWalletFundingConversionFinancialReconciliationService(
          reconciliations,
          evidence,
          store,
        ),
    },
  ],
})
export class RealTradingModule {}
