import {
  Controller,
  Get,
  HttpCode,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RealTradingStatusService } from '../application/real-trading-status.service';
import { AgenticWalletAuthenticationService } from '../application/agentic-wallet-authentication.service';

@Controller('real-trading')
export class RealTradingController {
  constructor(
    private readonly status: RealTradingStatusService,
    private readonly authentication: AgenticWalletAuthenticationService,
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
