import { ApprovalCleanupWatchService } from './application/approval-cleanup-watch.service';
import { ApprovalCleanupMonitor } from './application/approval-cleanup-monitor';
import { PrismaApprovalCleanupStore } from './infrastructure/prisma-approval-cleanup.store';
import { PrismaApprovalCleanupWatchQueue } from './infrastructure/prisma-approval-cleanup-watch.queue';
import { BscApprovalCleanupReader } from './infrastructure/bsc-approval-cleanup.reader';
import { Module } from '@nestjs/common';
import {
  DiagnosticFinancialReportService,
  DiagnosticFinancialReportStore,
} from './application/diagnostic-financial-report.service';
import { PrismaDiagnosticFinancialReportStore } from './infrastructure/prisma-diagnostic-financial-report.store';
import { BscDiagnosticReceiptsReader } from './infrastructure/bsc-diagnostic-receipts.reader';
import { GasDiagnosticService } from './application/gas-diagnostic.service';
import { GasDiagnosticStore } from './application/gas-diagnostic-store';
import { PrismaGasDiagnosticStore } from './infrastructure/prisma-gas-diagnostic.store';
import { GasDiagnosticCliTransport } from './infrastructure/gas-diagnostic.transport';
import { StrategiesModule } from '../strategies/strategies.module';
import {
  MOVING_AVERAGE_CROSSOVER_STRATEGY,
  Strategy,
} from '../strategies/domain/strategy';
import { BinanceHistoricalCandlesClient } from '../backtesting/infrastructure/binance/binance-historical-candles.client';
import { AutonomousStrategyResearchService } from './application/autonomous-strategy-research.service';
import { randomUUID } from 'node:crypto';
import { RealTradingStatusService } from './application/real-trading-status.service';
import { RealExecutionReadinessService } from './application/real-execution-readiness.service';
import { AgenticWalletMarketCostAnalysisService } from './application/agentic-wallet-market-cost-analysis.service';
import { AgenticWalletMarketCostPreviewService } from './application/agentic-wallet-market-cost-preview.service';
import { AgenticWalletMarketFeeEvidenceAdapter } from './infrastructure/agentic-wallet-market-fee-evidence.adapter';
import { AgenticWalletMarketQuoteService } from './application/agentic-wallet-market-quote.service';
import { AgenticWalletMarketQuoteAdapter } from './infrastructure/agentic-wallet-market-quote.adapter';
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
import { AgenticWalletFundingConversionAccountingSnapshotReader } from './application/agentic-wallet-funding-conversion-accounting-snapshot.reader';
import { AgenticWalletFundingConversionAccountingSyncStore } from './application/agentic-wallet-funding-conversion-accounting-sync.store';
import { AgenticWalletFundingConversionAccountingSyncService } from './application/agentic-wallet-funding-conversion-accounting-sync.service';
import { BscFundingConversionAccountingSnapshotReader } from './infrastructure/bsc-funding-conversion-accounting-snapshot.reader';
import { PrismaAgenticWalletFundingConversionAccountingSyncStore } from './infrastructure/prisma-agentic-wallet-funding-conversion-accounting-sync.store';
import { PrismaAgenticWalletAccountingBalanceInitializationReadStore } from './infrastructure/prisma-agentic-wallet-accounting-balance-initialization-read.store';
import { RealExecutionSubmissionAttemptStore } from './application/real-execution-submission-attempt.store';
import { PrismaRealExecutionSubmissionAttemptStore } from './infrastructure/prisma-real-execution-submission-attempt.store';
import { RealExecutionSubmissionOutcomeStore } from './application/real-execution-submission-outcome.store';
import { PrismaRealExecutionSubmissionOutcomeStore } from './infrastructure/prisma-real-execution-submission-outcome.store';
import { RealExecutionSubmissionService } from './application/real-execution-submission.service';
import { AgenticWalletMarketSwapCliProcessRunner } from './infrastructure/agentic-wallet-market-swap-command-runner';
import {
  RealExecutionOperatorEnvironment,
  RealExecutionOperatorSubmissionService,
} from './application/real-execution-operator-submission.service';
import { AgenticWalletMarketSwapStatusReconciliationAttempt } from './infrastructure/agentic-wallet-market-swap-status-reconciliation-attempt';
import { PrismaAgenticWalletMarketSwapStatusReconciliationContextStore } from './infrastructure/prisma-agentic-wallet-market-swap-status-reconciliation-context.store';
import { PrismaAgenticWalletMarketSwapStatusObservationStore } from './infrastructure/prisma-agentic-wallet-market-swap-status-observation.store';
import { PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore } from './infrastructure/prisma-agentic-wallet-market-swap-financial-reconciliation-evidence.store';
import { RealExecutionFinancialReconciliationService } from './application/real-execution-financial-reconciliation.service';
import { PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore } from './infrastructure/prisma-agentic-wallet-market-swap-accounting-balance-evidence.store';
import { RealExecutionAccountingBalanceEvidenceService } from './application/real-execution-accounting-balance-evidence.service';
import { PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore } from './infrastructure/prisma-agentic-wallet-market-swap-accounting-balance-evidence-read.store';
import { PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore } from './infrastructure/prisma-agentic-wallet-market-swap-accounting-mutation-commitment.store';
import { RealExecutionAccountingMutationCommitmentService } from './application/real-execution-accounting-mutation-commitment.service';
import { PrismaAgenticWalletMarketSwapAccountingMutationCommitmentReadStore } from './infrastructure/prisma-agentic-wallet-market-swap-accounting-mutation-commitment-read.store';
import { PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore } from './infrastructure/prisma-agentic-wallet-market-swap-accounting-mutation-authorization.store';
import { RealExecutionAccountingMutationAuthorizationService } from './application/real-execution-accounting-mutation-authorization.service';
import { PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore } from './infrastructure/prisma-agentic-wallet-market-swap-accounting-mutation-authorization-read.store';
import { PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore } from './infrastructure/prisma-agentic-wallet-market-swap-accounting-mutation-application.store';
import { RealExecutionAccountingMutationApplicationService } from './application/real-execution-accounting-mutation-application.service';
import { AgenticWalletFundingConversionAccountingAbsenceReader } from './application/agentic-wallet-funding-conversion-accounting-absence.reader';
import { AgenticWalletFundingConversionAccountingBootstrapService } from './application/agentic-wallet-funding-conversion-accounting-bootstrap.service';
import { AgenticWalletFundingConversionAccountingBootstrapStore } from './application/agentic-wallet-funding-conversion-accounting-bootstrap.store';
import { AgenticWalletFundingConversionAccountingBootstrapReadinessService } from './application/agentic-wallet-funding-conversion-accounting-bootstrap-readiness.service';
import { PrismaAgenticWalletFundingConversionAccountingAbsenceReader } from './infrastructure/prisma-agentic-wallet-funding-conversion-accounting-absence.reader';
import { PrismaAgenticWalletFundingConversionAccountingBootstrapStore } from './infrastructure/prisma-agentic-wallet-funding-conversion-accounting-bootstrap.store';
import { PrismaAgenticWalletAccountingLedgerSnapshotReadStore } from './infrastructure/prisma-agentic-wallet-accounting-ledger-snapshot.store';
import { AgenticWalletAccountingLedgerReconciliationService } from './infrastructure/agentic-wallet-accounting-ledger-reconciliation.service';
import { AgenticWalletAccountingLedgerReconciliationAttempt } from './infrastructure/agentic-wallet-accounting-ledger-reconciliation-attempt';
import { AgenticWalletAccountingLedgerReconciliationAttemptGuard } from './infrastructure/agentic-wallet-accounting-ledger-reconciliation-attempt.guard';
import { PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore } from './infrastructure/prisma-agentic-wallet-accounting-ledger-reconciliation-commitment.store';
import { AgenticWalletAccountingLedgerReconciliationRecordingService } from './application/agentic-wallet-accounting-ledger-reconciliation-recording.service';
import { PrismaAgenticWalletAccountingLedgerReconciliationCommitmentReadStore } from './infrastructure/prisma-agentic-wallet-accounting-ledger-reconciliation-commitment-read.store';
import { AgenticWalletAccountingLedgerLatestReconciliationFreshnessService } from './infrastructure/agentic-wallet-accounting-ledger-reconciliation-freshness.service';
import { AgenticWalletAccountingLatestReconciledBalanceSnapshotService } from './infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot.service';
import { AgenticWalletAccountingLedgerReconciliationReadinessService } from './application/agentic-wallet-accounting-ledger-reconciliation-readiness.service';

@Module({
  imports: [RiskEngineModule, StrategiesModule],
  controllers: [RealTradingController],
  providers: [
    {
      provide: ApprovalCleanupWatchService,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new ApprovalCleanupWatchService(
          new PrismaApprovalCleanupWatchQueue(prisma),
          new ApprovalCleanupMonitor(
            new PrismaApprovalCleanupStore(prisma),
            new BscApprovalCleanupReader(),
          ),
        ),
    },
    {
      provide: DiagnosticFinancialReportStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaDiagnosticFinancialReportStore(prisma),
    },
    {
      provide: DiagnosticFinancialReportService,
      inject: [GasDiagnosticStore, DiagnosticFinancialReportStore],
      useFactory: (
        diagnostics: GasDiagnosticStore,
        reports: DiagnosticFinancialReportStore,
      ) =>
        new DiagnosticFinancialReportService(
          diagnostics,
          new GasDiagnosticCliTransport(),
          new BscDiagnosticReceiptsReader(),
          reports,
        ),
    },
    {
      provide: GasDiagnosticStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaGasDiagnosticStore(prisma),
    },
    {
      provide: GasDiagnosticService,
      inject: [
        ConfigService,
        RealTradingStatusService,
        AgenticWalletMarketCostPreviewService,
        EmergencyStopService,
        GasDiagnosticStore,
      ],
      useFactory: (
        config: ConfigService,
        wallet: RealTradingStatusService,
        quotes: AgenticWalletMarketCostPreviewService,
        stop: EmergencyStopService,
        store: GasDiagnosticStore,
      ) =>
        new GasDiagnosticService(
          config,
          wallet,
          quotes,
          stop,
          store,
          new GasDiagnosticCliTransport(),
        ),
    },
    {
      provide: AutonomousStrategyResearchService,
      inject: [ConfigService, MOVING_AVERAGE_CROSSOVER_STRATEGY],
      useFactory: (config: ConfigService, strategy: Strategy) =>
        new AutonomousStrategyResearchService(
          new BinanceHistoricalCandlesClient(
            config.getOrThrow<string>('BINANCE_REST_BASE_URL'),
          ),
          strategy,
        ),
    },
    {
      provide: RealExecutionReadinessService,
      inject: [ConfigService, RealTradingStatusService, EmergencyStopService],
      useFactory: (
        config: ConfigService,
        status: RealTradingStatusService,
        stop: EmergencyStopService,
      ) => new RealExecutionReadinessService(config, status, stop),
    },
    {
      provide: AgenticWalletMarketCostAnalysisService,
      inject: [AgenticWalletMarketCostPreviewService, RealTradingStatusService],
      useFactory: (
        previews: AgenticWalletMarketCostPreviewService,
        status: RealTradingStatusService,
      ) => new AgenticWalletMarketCostAnalysisService(previews, status),
    },
    {
      provide: AgenticWalletMarketCostPreviewService,
      inject: [AgenticWalletMarketQuoteService],
      useFactory: (quotes: AgenticWalletMarketQuoteService) =>
        new AgenticWalletMarketCostPreviewService(
          quotes,
          new AgenticWalletMarketFeeEvidenceAdapter(),
        ),
    },
    {
      provide: AgenticWalletMarketQuoteService,
      inject: [RealTradingStatusService],
      useFactory: (status: RealTradingStatusService) =>
        new AgenticWalletMarketQuoteService(
          status,
          new AgenticWalletMarketQuoteAdapter(
            new AgenticWalletQuoteCliProcessRunner(),
          ),
        ),
    },
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
    {
      provide: AgenticWalletFundingConversionAccountingSnapshotReader,
      useClass: BscFundingConversionAccountingSnapshotReader,
    },
    {
      provide: PrismaAgenticWalletAccountingBalanceInitializationReadStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletAccountingBalanceInitializationReadStore(prisma),
    },
    {
      provide: AgenticWalletFundingConversionAccountingSyncStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletFundingConversionAccountingSyncStore(prisma),
    },
    {
      provide: AgenticWalletFundingConversionAccountingSyncService,
      inject: [
        AgenticWalletFundingConversionAccountingSyncStore,
        PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore,
        AgenticWalletFundingConversionFinancialEvidenceContextStore,
        AgenticWalletFundingConversionAccountingSnapshotReader,
        PrismaAgenticWalletAccountingBalanceInitializationReadStore,
      ],
      useFactory: (
        store: AgenticWalletFundingConversionAccountingSyncStore,
        reconciliations: PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore,
        contexts: AgenticWalletFundingConversionFinancialEvidenceContextStore,
        snapshots: AgenticWalletFundingConversionAccountingSnapshotReader,
        initializations: PrismaAgenticWalletAccountingBalanceInitializationReadStore,
      ) =>
        new AgenticWalletFundingConversionAccountingSyncService(
          store,
          reconciliations,
          contexts,
          snapshots,
          initializations,
        ),
    },
    {
      provide: AgenticWalletFundingConversionAccountingAbsenceReader,
      useClass: PrismaAgenticWalletFundingConversionAccountingAbsenceReader,
    },
    {
      provide: AgenticWalletFundingConversionAccountingBootstrapStore,
      useClass: PrismaAgenticWalletFundingConversionAccountingBootstrapStore,
    },
    {
      provide:
        AgenticWalletFundingConversionAccountingBootstrapReadinessService,
      inject: [
        PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore,
        AgenticWalletFundingConversionFinancialEvidenceContextStore,
        AgenticWalletFundingConversionAccountingAbsenceReader,
      ],
      useFactory: (
        reconciliations: PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore,
        contexts: AgenticWalletFundingConversionFinancialEvidenceContextStore,
        absence: AgenticWalletFundingConversionAccountingAbsenceReader,
      ) =>
        new AgenticWalletFundingConversionAccountingBootstrapReadinessService(
          reconciliations,
          contexts,
          absence,
        ),
    },
    {
      provide: AgenticWalletFundingConversionAccountingBootstrapService,
      inject: [
        PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore,
        AgenticWalletFundingConversionFinancialEvidenceContextStore,
        AgenticWalletFundingConversionAccountingAbsenceReader,
        AgenticWalletFundingConversionAccountingSnapshotReader,
        AgenticWalletFundingConversionAccountingBootstrapStore,
      ],
      useFactory: (
        reconciliations: PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore,
        contexts: AgenticWalletFundingConversionFinancialEvidenceContextStore,
        absence: AgenticWalletFundingConversionAccountingAbsenceReader,
        snapshots: AgenticWalletFundingConversionAccountingSnapshotReader,
        store: AgenticWalletFundingConversionAccountingBootstrapStore,
      ) =>
        new AgenticWalletFundingConversionAccountingBootstrapService(
          reconciliations,
          contexts,
          absence,
          snapshots,
          store,
        ),
    },
    {
      provide: PrismaAgenticWalletAccountingLedgerSnapshotReadStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletAccountingLedgerSnapshotReadStore(prisma),
    },
    {
      provide: AgenticWalletAccountingLedgerReconciliationService,
      inject: [PrismaAgenticWalletAccountingLedgerSnapshotReadStore],
      useFactory: (
        snapshots: PrismaAgenticWalletAccountingLedgerSnapshotReadStore,
      ) => new AgenticWalletAccountingLedgerReconciliationService(snapshots),
    },
    {
      provide: AgenticWalletAccountingLedgerReconciliationAttempt,
      inject: [
        AgenticWalletCapabilityAdapter,
        AgenticWalletAccountingLedgerReconciliationService,
      ],
      useFactory: (
        observations: AgenticWalletCapabilityAdapter,
        reconciliation: AgenticWalletAccountingLedgerReconciliationService,
      ) =>
        new AgenticWalletAccountingLedgerReconciliationAttempt(
          observations,
          reconciliation,
        ),
    },
    {
      provide: AgenticWalletAccountingLedgerReconciliationAttemptGuard,
      inject: [AgenticWalletAccountingLedgerReconciliationAttempt],
      useFactory: (
        attempt: AgenticWalletAccountingLedgerReconciliationAttempt,
      ) => new AgenticWalletAccountingLedgerReconciliationAttemptGuard(attempt),
    },
    {
      provide: PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore(
          prisma,
        ),
    },
    {
      provide: AgenticWalletAccountingLedgerReconciliationRecordingService,
      inject: [
        AgenticWalletAccountingLedgerReconciliationAttemptGuard,
        PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore,
      ],
      useFactory: (
        attempt: AgenticWalletAccountingLedgerReconciliationAttemptGuard,
        commitments: PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore,
      ) =>
        new AgenticWalletAccountingLedgerReconciliationRecordingService(
          attempt,
          commitments,
        ),
    },
    {
      provide:
        PrismaAgenticWalletAccountingLedgerReconciliationCommitmentReadStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletAccountingLedgerReconciliationCommitmentReadStore(
          prisma,
        ),
    },
    {
      provide:
        AgenticWalletAccountingLedgerLatestReconciliationFreshnessService,
      inject: [
        PrismaAgenticWalletAccountingLedgerReconciliationCommitmentReadStore,
      ],
      useFactory: (
        reconciliations: PrismaAgenticWalletAccountingLedgerReconciliationCommitmentReadStore,
      ) =>
        new AgenticWalletAccountingLedgerLatestReconciliationFreshnessService(
          reconciliations,
        ),
    },
    {
      provide: AgenticWalletAccountingLatestReconciledBalanceSnapshotService,
      inject: [
        AgenticWalletAccountingLedgerLatestReconciliationFreshnessService,
      ],
      useFactory: (
        freshness: AgenticWalletAccountingLedgerLatestReconciliationFreshnessService,
      ) =>
        new AgenticWalletAccountingLatestReconciledBalanceSnapshotService(
          freshness,
        ),
    },
    {
      provide: AgenticWalletAccountingLedgerReconciliationReadinessService,
      inject: [AgenticWalletAccountingLatestReconciledBalanceSnapshotService],
      useFactory: (
        balances: AgenticWalletAccountingLatestReconciledBalanceSnapshotService,
      ) =>
        new AgenticWalletAccountingLedgerReconciliationReadinessService(
          balances,
        ),
    },
    {
      provide: RealExecutionSubmissionAttemptStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaRealExecutionSubmissionAttemptStore(prisma),
    },
    {
      provide: RealExecutionSubmissionOutcomeStore,
      useClass: PrismaRealExecutionSubmissionOutcomeStore,
    },
    {
      provide: RealExecutionSubmissionService,
      inject: [
        RealExecutionSubmissionAttemptStore,
        RealExecutionSubmissionOutcomeStore,
      ],
      useFactory: (
        attempts: RealExecutionSubmissionAttemptStore,
        outcomes: RealExecutionSubmissionOutcomeStore,
      ) =>
        new RealExecutionSubmissionService(
          attempts,
          new AgenticWalletMarketSwapCliProcessRunner(30000),
          outcomes,
        ),
    },
    {
      provide: RealExecutionOperatorSubmissionService,
      inject: [ConfigService, RealExecutionSubmissionService],
      useFactory: (
        config: ConfigService<RealExecutionOperatorEnvironment, true>,
        submissions: RealExecutionSubmissionService,
      ) => new RealExecutionOperatorSubmissionService(config, submissions),
    },
    {
      provide: PrismaAgenticWalletMarketSwapStatusReconciliationContextStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletMarketSwapStatusReconciliationContextStore(
          prisma,
        ),
    },
    {
      provide: PrismaAgenticWalletMarketSwapStatusObservationStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletMarketSwapStatusObservationStore(prisma),
    },
    {
      provide: AgenticWalletMarketSwapStatusReconciliationAttempt,
      inject: [
        PrismaAgenticWalletMarketSwapStatusReconciliationContextStore,
        PrismaAgenticWalletMarketSwapStatusObservationStore,
      ],
      useFactory: (
        contexts: PrismaAgenticWalletMarketSwapStatusReconciliationContextStore,
        observations: PrismaAgenticWalletMarketSwapStatusObservationStore,
      ) =>
        new AgenticWalletMarketSwapStatusReconciliationAttempt(
          contexts,
          new AgenticWalletMarketSwapStatusLookupCliProcessRunner(10000),
          observations,
          () => new Date(),
          1_000,
        ),
    },
    {
      provide:
        PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore(
          prisma,
        ),
    },
    {
      provide: RealExecutionFinancialReconciliationService,
      inject: [
        PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore,
      ],
      useFactory: (
        evidence: PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore,
      ) => new RealExecutionFinancialReconciliationService(evidence),
    },
    {
      provide: PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore(prisma),
    },
    {
      provide: RealExecutionAccountingBalanceEvidenceService,
      inject: [PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore],
      useFactory: (
        evidence: PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore,
      ) => new RealExecutionAccountingBalanceEvidenceService(evidence),
    },
    {
      provide: PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore(
          prisma,
        ),
    },
    {
      provide: PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore(
          prisma,
        ),
    },
    {
      provide: RealExecutionAccountingMutationCommitmentService,
      inject: [
        PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore,
        PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore,
      ],
      useFactory: (
        evidence: PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore,
        commitments: PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore,
      ) =>
        new RealExecutionAccountingMutationCommitmentService(
          evidence,
          commitments,
          () => new Date(),
        ),
    },
    {
      provide:
        PrismaAgenticWalletMarketSwapAccountingMutationCommitmentReadStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletMarketSwapAccountingMutationCommitmentReadStore(
          prisma,
        ),
    },
    {
      provide:
        PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore(
          prisma,
        ),
    },
    {
      provide: RealExecutionAccountingMutationAuthorizationService,
      inject: [
        PrismaAgenticWalletMarketSwapAccountingMutationCommitmentReadStore,
        PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore,
      ],
      useFactory: (
        commitments: PrismaAgenticWalletMarketSwapAccountingMutationCommitmentReadStore,
        authorizations: PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore,
      ) =>
        new RealExecutionAccountingMutationAuthorizationService(
          commitments,
          authorizations,
          () => new Date(),
        ),
    },
    {
      provide:
        PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore(
          prisma,
        ),
    },
    {
      provide: PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore(
          prisma,
        ),
    },
    {
      provide: RealExecutionAccountingMutationApplicationService,
      inject: [
        PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore,
        PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore,
      ],
      useFactory: (
        authorizations: PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore,
        applications: PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore,
      ) =>
        new RealExecutionAccountingMutationApplicationService(
          authorizations,
          applications,
          () => new Date(),
        ),
    },
  ],
})
export class RealTradingModule {}
