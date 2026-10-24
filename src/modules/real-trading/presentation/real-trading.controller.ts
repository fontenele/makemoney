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
import { AgenticWalletFundingConversionPlanService } from '../application/agentic-wallet-funding-conversion-plan.service';
import {
  AgenticWalletFundingConversionSubmissionService,
  FundingConversionSubmissionBlockedError,
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

@Controller('real-trading')
export class RealTradingController {
  constructor(
    private readonly status: RealTradingStatusService,
    private readonly authentication: AgenticWalletAuthenticationService,
    private readonly fundingConversionQuote: AgenticWalletFundingConversionQuoteService,
    private readonly fundingConversionPlan: AgenticWalletFundingConversionPlanService,
    private readonly fundingConversionSubmission: AgenticWalletFundingConversionSubmissionService,
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
      if (error instanceof InvalidFundingConversionQuoteRequestError) {
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
      throw new ServiceUnavailableException(
        'Agentic Wallet funding conversion submission is unavailable',
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
