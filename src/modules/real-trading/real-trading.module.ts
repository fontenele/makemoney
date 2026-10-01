import { Module } from '@nestjs/common';
import { RealTradingStatusService } from './application/real-trading-status.service';
import { AgenticWalletCapabilityAdapter } from './infrastructure/agentic-wallet-capability.adapter';
import { AgenticWalletCliProcessRunner } from './infrastructure/agentic-wallet-cli-process-runner';
import { RealTradingController } from './presentation/real-trading.controller';

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
    RealTradingStatusService,
  ],
})
export class RealTradingModule {}
