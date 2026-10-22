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

@Module({
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
    AgenticWalletFundingConversionPlanService,
  ],
})
export class RealTradingModule {}
