import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  ServiceUnavailableException,
  ConflictException,
  UseGuards,
} from '@nestjs/common';
import { RealTradingStatusService } from '../application/real-trading-status.service';
import { AgenticWalletAuthenticationService } from '../application/agentic-wallet-authentication.service';
import {
  AgenticWalletFundingConversionQuoteService,
  InvalidFundingConversionQuoteRequestError,
} from '../application/agentic-wallet-funding-conversion-quote.service';
import {
  AgenticWalletFundingConversionPlanService,
  InvalidFundingConversionPlanRequestError,
} from '../application/agentic-wallet-funding-conversion-plan.service';
import {
  AgenticWalletFundingConversionSubmissionService,
  FundingConversionSubmissionBlockedError,
  FundingConversionSubmissionDependencyUnavailableError,
  InvalidFundingConversionSubmissionPreflightRequestError,
  InvalidFundingConversionSubmissionRequestError,
} from '../application/agentic-wallet-funding-conversion-submission.service';
import {
  FundingConversionSubmissionClaimBlockedError,
  FundingConversionSubmissionClaimConflictError,
} from '../application/agentic-wallet-funding-conversion-submission-attempt.store';
import {
  FundingConversionSubmissionOutcomeBlockedError,
  FundingConversionSubmissionOutcomeConflictError,
} from '../application/agentic-wallet-funding-conversion-submission-outcome.store';
import { RiskControlAuthGuard } from '../../risk-engine/presentation/risk-control-auth.guard';
import {
  AgenticWalletFundingConversionStatusService,
  FundingConversionStatusDependencyUnavailableError,
} from '../application/agentic-wallet-funding-conversion-status.service';
import { FundingConversionStatusContextIdentityError } from '../application/agentic-wallet-funding-conversion-status-context.store';
import {
  FundingConversionStatusAttemptNotFoundError,
  FundingConversionStatusObservationBlockedError,
  FundingConversionStatusObservationConflictError,
} from '../application/agentic-wallet-funding-conversion-status-observation.store';
import {
  AgenticWalletFundingConversionFinancialReconciliationService,
  FundingConversionFinancialReconciliationServiceIdentityError,
} from '../application/agentic-wallet-funding-conversion-financial-reconciliation.service';
import {
  FundingConversionFinancialReconciliationBlockedError,
  FundingConversionFinancialReconciliationConflictError,
  FundingConversionFinancialReconciliationContextNotFoundError,
} from '../application/agentic-wallet-funding-conversion-financial-reconciliation.store';
import {
  AgenticWalletFundingConversionAccountingSyncService,
  FundingConversionAccountingSyncRequestError,
} from '../application/agentic-wallet-funding-conversion-accounting-sync.service';
import {
  FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
  FundingConversionAccountingSyncBlockedError,
  FundingConversionAccountingSyncConflictError,
} from '../application/agentic-wallet-funding-conversion-accounting-sync.store';
import {
  InvalidRealExecutionOperatorSubmissionRequestError,
  RealExecutionOperatorSubmissionBlockedError,
  RealExecutionOperatorSubmissionService,
} from '../application/real-execution-operator-submission.service';
import {
  InvalidRealExecutionSubmissionRequestError,
  RealExecutionSubmissionAlreadyClaimedError,
} from '../application/real-execution-submission.service';
import {
  RealExecutionSubmissionAttemptBlockedError,
  RealExecutionSubmissionAttemptConflictError,
} from '../application/real-execution-submission-attempt.store';
import {
  RealExecutionSubmissionAttemptNotFoundError,
  RealExecutionSubmissionOutcomeBlockedError,
  RealExecutionSubmissionOutcomeConflictError,
} from '../application/real-execution-submission-outcome.store';
import { AgenticWalletMarketSwapStatusReconciliationAttempt } from '../infrastructure/agentic-wallet-market-swap-status-reconciliation-attempt';
import { AgenticWalletMarketSwapStatusReconciliationContextIdentityError } from '../infrastructure/agentic-wallet-market-swap-status-reconciliation-context.store';
import {
  AgenticWalletMarketSwapStatusObservationBlockedError,
  AgenticWalletMarketSwapStatusObservationReceiptMismatchError,
  AgenticWalletMarketSwapStatusObservationReceiptNotFoundError,
} from '../infrastructure/agentic-wallet-market-swap-status-observation.store';
import {
  InvalidRealExecutionFinancialReconciliationRequestError,
  RealExecutionFinancialReconciliationService,
} from '../application/real-execution-financial-reconciliation.service';
import {
  AgenticWalletMarketSwapFinancialReconciliationContextNotFoundError,
  AgenticWalletMarketSwapFinancialReconciliationEvidenceBlockedError,
  AgenticWalletMarketSwapFinancialReconciliationEvidenceConflictError,
} from '../infrastructure/agentic-wallet-market-swap-financial-reconciliation-evidence.store';
import {
  InvalidRealExecutionAccountingBalanceEvidenceRequestError,
  RealExecutionAccountingBalanceEvidenceService,
} from '../application/real-execution-accounting-balance-evidence.service';
import {
  AgenticWalletMarketSwapAccountingBalanceCompletionNotFoundError,
  AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError,
  AgenticWalletMarketSwapAccountingBalanceEvidenceConflictError,
} from '../infrastructure/agentic-wallet-market-swap-accounting-balance-evidence.store';
import {
  InvalidRealExecutionAccountingMutationCommitmentRequestError,
  RealExecutionAccountingMutationCommitmentService,
} from '../application/real-execution-accounting-mutation-commitment.service';
import {
  AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError,
  AgenticWalletMarketSwapAccountingMutationCommitmentConflictError,
  AgenticWalletMarketSwapAccountingMutationCommitmentIdentityError,
  AgenticWalletMarketSwapAccountingMutationEvidenceNotFoundError,
} from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-commitment.store';
import {
  InvalidRealExecutionAccountingMutationAuthorizationRequestError,
  RealExecutionAccountingMutationAuthorizationService,
} from '../application/real-execution-accounting-mutation-authorization.service';
import {
  AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError,
  AgenticWalletMarketSwapAccountingMutationAuthorizationConflictError,
  AgenticWalletMarketSwapAccountingMutationAuthorizationIdentityError,
  AgenticWalletMarketSwapAccountingMutationCommitmentNotFoundError,
} from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-authorization.store';
import {
  InvalidRealExecutionAccountingMutationApplicationRequestError,
  RealExecutionAccountingMutationApplicationService,
} from '../application/real-execution-accounting-mutation-application.service';
import {
  AgenticWalletMarketSwapAccountingLedgerMismatchError,
  AgenticWalletMarketSwapAccountingMutationApplicationBlockedError,
  AgenticWalletMarketSwapAccountingMutationApplicationConflictError,
  AgenticWalletMarketSwapAccountingMutationApplicationIdentityError,
  AgenticWalletMarketSwapAccountingMutationAuthorizationNotFoundError,
} from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-application.store';

@Controller('real-trading')
export class RealTradingController {
  constructor(
    private readonly status: RealTradingStatusService,
    private readonly authentication: AgenticWalletAuthenticationService,
    private readonly fundingConversionQuote: AgenticWalletFundingConversionQuoteService,
    private readonly fundingConversionPlan: AgenticWalletFundingConversionPlanService,
    private readonly fundingConversionSubmission: AgenticWalletFundingConversionSubmissionService,
    private readonly fundingConversionStatus: AgenticWalletFundingConversionStatusService,
    private readonly fundingConversionReconciliation: AgenticWalletFundingConversionFinancialReconciliationService,
    private readonly fundingConversionAccountingSync: AgenticWalletFundingConversionAccountingSyncService,
    private readonly realExecutionSubmission: RealExecutionOperatorSubmissionService,
    private readonly realExecutionStatus: AgenticWalletMarketSwapStatusReconciliationAttempt,
    private readonly realExecutionReconciliation: RealExecutionFinancialReconciliationService,
    private readonly realExecutionAccountingEvidence: RealExecutionAccountingBalanceEvidenceService,
    private readonly realExecutionAccountingCommitment: RealExecutionAccountingMutationCommitmentService,
    private readonly realExecutionAccountingAuthorization: RealExecutionAccountingMutationAuthorizationService,
    private readonly realExecutionAccountingApplication: RealExecutionAccountingMutationApplicationService,
  ) {}

  @Get('status')
  getStatus() {
    return this.status.getLocalStatus();
  }

  @Post('wallet-observation')
  @HttpCode(200)
  async observeWallet() {
    try {
      return await this.status.observeWallet();
    } catch {
      throw new ServiceUnavailableException(
        'Agentic Wallet read-only observation is unavailable',
      );
    }
  }

  @Post('funding-readiness')
  @HttpCode(200)
  async prepareFundingReadiness() {
    try {
      return await this.status.prepareFundingReadiness();
    } catch {
      throw new ServiceUnavailableException(
        'Agentic Wallet funding readiness is unavailable',
      );
    }
  }

  @Post('funding-verification')
  @HttpCode(200)
  async verifyFunding() {
    try {
      return await this.status.verifyFunding();
    } catch {
      throw new ServiceUnavailableException(
        'Agentic Wallet funding verification is unavailable',
      );
    }
  }

  @Get('funding-valuation')
  async getFundingValuation() {
    try {
      return await this.status.loadFundingValuation();
    } catch {
      throw new ServiceUnavailableException(
        'Agentic Wallet funding valuation is unavailable',
      );
    }
  }

  @Post('funding-conversion-quote')
  @HttpCode(200)
  async quoteFundingConversion(@Body() body: unknown) {
    try {
      return await this.fundingConversionQuote.load(body);
    } catch (error) {
      if (error instanceof InvalidFundingConversionQuoteRequestError) {
        throw new BadRequestException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet funding conversion quote is unavailable',
      );
    }
  }

  @Post('funding-conversion-plan')
  @HttpCode(200)
  async prepareFundingConversion(@Body() body: unknown) {
    try {
      return await this.fundingConversionPlan.prepare(body);
    } catch (error) {
      if (error instanceof InvalidFundingConversionPlanRequestError) {
        throw new BadRequestException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet funding conversion plan is unavailable',
      );
    }
  }

  @Post('funding-conversion-submission')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async submitFundingConversion(@Body() body: unknown) {
    try {
      return await this.fundingConversionSubmission.submit(body);
    } catch (error) {
      if (error instanceof InvalidFundingConversionSubmissionRequestError) {
        throw new BadRequestException(
          'Invalid funding conversion submission request',
        );
      }
      if (
        error instanceof FundingConversionSubmissionBlockedError ||
        error instanceof FundingConversionSubmissionClaimBlockedError ||
        error instanceof FundingConversionSubmissionClaimConflictError ||
        error instanceof FundingConversionSubmissionOutcomeBlockedError ||
        error instanceof FundingConversionSubmissionOutcomeConflictError
      ) {
        throw new ConflictException(error.message);
      }
      if (
        error instanceof FundingConversionSubmissionDependencyUnavailableError
      ) {
        throw new ServiceUnavailableException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet funding conversion submission is unavailable',
      );
    }
  }

  @Post('funding-conversion-submission-preflight')
  @HttpCode(200)
  async preflightFundingConversionSubmission(@Body() body: unknown) {
    try {
      return await this.fundingConversionSubmission.preflight(body);
    } catch (error) {
      if (
        error instanceof InvalidFundingConversionSubmissionPreflightRequestError
      ) {
        throw new BadRequestException(
          'Invalid funding conversion submission preflight request',
        );
      }
      if (error instanceof FundingConversionSubmissionBlockedError) {
        throw new ConflictException(error.message);
      }
      if (
        error instanceof FundingConversionSubmissionDependencyUnavailableError
      ) {
        throw new ServiceUnavailableException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet funding conversion submission preflight is unavailable',
      );
    }
  }

  @Post('funding-conversion-status')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async reconcileFundingConversionStatus(@Body() body: unknown) {
    try {
      return await this.fundingConversionStatus.reconcileOnce(
        fundingConversionAttemptId(body),
      );
    } catch (error) {
      if (error instanceof FundingConversionStatusContextIdentityError) {
        throw new BadRequestException(
          'Invalid funding conversion status request',
        );
      }
      if (
        error instanceof FundingConversionStatusAttemptNotFoundError ||
        error instanceof FundingConversionStatusObservationBlockedError ||
        error instanceof FundingConversionStatusObservationConflictError
      ) {
        throw new ConflictException(error.message);
      }
      if (error instanceof FundingConversionStatusDependencyUnavailableError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet funding conversion status is unavailable',
      );
    }
  }

  @Post('funding-conversion-reconciliation')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async reconcileFundingConversionFinancials(@Body() body: unknown) {
    try {
      return await this.fundingConversionReconciliation.reconcileOnce(
        fundingConversionAttemptId(body),
      );
    } catch (error) {
      if (
        error instanceof
        FundingConversionFinancialReconciliationServiceIdentityError
      ) {
        throw new BadRequestException(
          'Invalid funding conversion reconciliation request',
        );
      }
      if (
        error instanceof FundingConversionFinancialReconciliationBlockedError ||
        error instanceof
          FundingConversionFinancialReconciliationConflictError ||
        error instanceof
          FundingConversionFinancialReconciliationContextNotFoundError
      ) {
        throw new ConflictException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet funding conversion reconciliation is unavailable',
      );
    }
  }

  @Post('funding-conversion-accounting-sync')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async synchronizeFundingConversionAccounting(@Body() body: unknown) {
    try {
      return await this.fundingConversionAccountingSync.synchronize(
        fundingConversionAccountingSyncCommand(body),
      );
    } catch (error) {
      if (error instanceof FundingConversionAccountingSyncRequestError) {
        throw new BadRequestException(
          'Invalid funding conversion accounting synchronization request',
        );
      }
      if (
        error instanceof FundingConversionAccountingSyncBlockedError ||
        error instanceof FundingConversionAccountingSyncConflictError
      ) {
        throw new ConflictException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet funding conversion accounting synchronization is unavailable',
      );
    }
  }

  @Post('submission')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async submitRealExecution(@Body() body: unknown) {
    try {
      return await this.realExecutionSubmission.submit(body);
    } catch (error) {
      if (
        error instanceof InvalidRealExecutionOperatorSubmissionRequestError ||
        error instanceof InvalidRealExecutionSubmissionRequestError
      ) {
        throw new BadRequestException(
          'Invalid real execution submission request',
        );
      }
      if (
        error instanceof RealExecutionOperatorSubmissionBlockedError ||
        error instanceof RealExecutionSubmissionAttemptBlockedError ||
        error instanceof RealExecutionSubmissionAttemptConflictError ||
        error instanceof RealExecutionSubmissionAlreadyClaimedError ||
        error instanceof RealExecutionSubmissionAttemptNotFoundError ||
        error instanceof RealExecutionSubmissionOutcomeBlockedError ||
        error instanceof RealExecutionSubmissionOutcomeConflictError
      ) {
        throw new ConflictException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet real execution submission is unavailable',
      );
    }
  }

  @Post('submission-status')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async reconcileRealExecutionStatus(@Body() body: unknown) {
    try {
      return await this.realExecutionStatus.reconcileOnce(gateId(body));
    } catch (error) {
      if (
        error instanceof
        AgenticWalletMarketSwapStatusReconciliationContextIdentityError
      ) {
        throw new BadRequestException('Invalid real execution status request');
      }
      if (
        error instanceof AgenticWalletMarketSwapStatusObservationBlockedError ||
        error instanceof
          AgenticWalletMarketSwapStatusObservationReceiptMismatchError ||
        error instanceof
          AgenticWalletMarketSwapStatusObservationReceiptNotFoundError
      ) {
        throw new ConflictException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet real execution status is unavailable',
      );
    }
  }

  @Post('submission-reconciliation')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async reconcileRealExecutionFinancials(@Body() body: unknown) {
    try {
      return await this.realExecutionReconciliation.reconcile(body);
    } catch (error) {
      if (
        error instanceof InvalidRealExecutionFinancialReconciliationRequestError
      ) {
        throw new BadRequestException(
          'Invalid real execution financial reconciliation request',
        );
      }
      if (
        error instanceof
          AgenticWalletMarketSwapFinancialReconciliationContextNotFoundError ||
        error instanceof
          AgenticWalletMarketSwapFinancialReconciliationEvidenceBlockedError ||
        error instanceof
          AgenticWalletMarketSwapFinancialReconciliationEvidenceConflictError
      ) {
        throw new ConflictException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet real execution financial reconciliation is unavailable',
      );
    }
  }

  @Post('submission-accounting-evidence')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async recordRealExecutionAccountingEvidence(@Body() body: unknown) {
    try {
      return await this.realExecutionAccountingEvidence.record(body);
    } catch (error) {
      if (
        error instanceof
        InvalidRealExecutionAccountingBalanceEvidenceRequestError
      ) {
        throw new BadRequestException(
          'Invalid real execution accounting balance evidence request',
        );
      }
      if (
        error instanceof
          AgenticWalletMarketSwapAccountingBalanceCompletionNotFoundError ||
        error instanceof
          AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError ||
        error instanceof
          AgenticWalletMarketSwapAccountingBalanceEvidenceConflictError
      ) {
        throw new ConflictException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet real execution accounting balance evidence is unavailable',
      );
    }
  }

  @Post('submission-accounting-commitment')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async prepareRealExecutionAccountingCommitment(@Body() body: unknown) {
    try {
      return await this.realExecutionAccountingCommitment.prepare(body);
    } catch (error) {
      if (
        error instanceof
        InvalidRealExecutionAccountingMutationCommitmentRequestError
      ) {
        throw new BadRequestException(
          'Invalid real execution accounting mutation commitment request',
        );
      }
      if (
        error instanceof
          AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError ||
        error instanceof
          AgenticWalletMarketSwapAccountingMutationCommitmentConflictError ||
        error instanceof
          AgenticWalletMarketSwapAccountingMutationCommitmentIdentityError ||
        error instanceof
          AgenticWalletMarketSwapAccountingMutationEvidenceNotFoundError
      ) {
        throw new ConflictException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet real execution accounting mutation commitment is unavailable',
      );
    }
  }

  @Post('submission-accounting-authorization')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async authorizeRealExecutionAccountingMutation(@Body() body: unknown) {
    try {
      return await this.realExecutionAccountingAuthorization.authorize(body);
    } catch (error) {
      if (
        error instanceof
        InvalidRealExecutionAccountingMutationAuthorizationRequestError
      ) {
        throw new BadRequestException(
          'Invalid real execution accounting mutation authorization request',
        );
      }
      if (
        error instanceof
          AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError ||
        error instanceof
          AgenticWalletMarketSwapAccountingMutationAuthorizationConflictError ||
        error instanceof
          AgenticWalletMarketSwapAccountingMutationAuthorizationIdentityError ||
        error instanceof
          AgenticWalletMarketSwapAccountingMutationCommitmentNotFoundError
      ) {
        throw new ConflictException(error.message);
      }
      throw new ServiceUnavailableException(
        'Agentic Wallet real execution accounting mutation authorization is unavailable',
      );
    }
  }

  @Post('submission-accounting-application')
  @UseGuards(RiskControlAuthGuard)
  @HttpCode(200)
  async applyRealExecutionAccountingMutation(@Body() body: unknown) {
    try {
      return await this.realExecutionAccountingApplication.apply(body);
    } catch (error) {
      if (
        error instanceof
        InvalidRealExecutionAccountingMutationApplicationRequestError
      )
        throw new BadRequestException(error.message);
      if (
        error instanceof
          AgenticWalletMarketSwapAccountingMutationApplicationBlockedError ||
        error instanceof
          AgenticWalletMarketSwapAccountingMutationApplicationConflictError ||
        error instanceof
          AgenticWalletMarketSwapAccountingMutationApplicationIdentityError ||
        error instanceof
          AgenticWalletMarketSwapAccountingMutationAuthorizationNotFoundError ||
        error instanceof AgenticWalletMarketSwapAccountingLedgerMismatchError
      )
        throw new ConflictException(error.message);
      throw new ServiceUnavailableException(
        'Agentic Wallet real execution accounting mutation application is unavailable',
      );
    }
  }

  @Get('wallet-authentication')
  getWalletAuthentication() {
    return this.authentication.getState();
  }

  @Post('wallet-authentication')
  @HttpCode(200)
  async startWalletAuthentication() {
    try {
      return await this.authentication.start();
    } catch {
      throw new ServiceUnavailableException(
        'Agentic Wallet authentication could not be started',
      );
    }
  }
}

function fundingConversionAttemptId(body: unknown): string {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    typeof (body as Record<string, unknown>).attemptId !== 'string'
  )
    return '';
  return (body as { attemptId: string }).attemptId;
}

function gateId(body: unknown): string {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    typeof (body as Record<string, unknown>).gateId !== 'string'
  )
    return '';
  return (body as { gateId: string }).gateId;
}

function fundingConversionAccountingSyncCommand(body: unknown) {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).length !== 3
  )
    return {
      attemptId: '',
      initializationId: '',
      acknowledgment:
        '' as typeof FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
    };
  const value = body as Record<string, unknown>;
  return {
    attemptId: typeof value.attemptId === 'string' ? value.attemptId : '',
    initializationId:
      typeof value.initializationId === 'string' ? value.initializationId : '',
    acknowledgment:
      typeof value.acknowledgment === 'string'
        ? (value.acknowledgment as typeof FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT)
        : ('' as typeof FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT),
  };
}
