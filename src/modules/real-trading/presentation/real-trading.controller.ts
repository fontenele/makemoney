import {
  Controller,
  Get,
  HttpCode,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RealTradingStatusService } from '../application/real-trading-status.service';

@Controller('real-trading')
export class RealTradingController {
  constructor(private readonly status: RealTradingStatusService) {}

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
}
