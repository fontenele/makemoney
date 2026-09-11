import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { PaperWalletModule } from './modules/paper-wallet/paper-wallet.module';
import { PaperTradingModule } from './modules/paper-trading/paper-trading.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    RedisModule,
    HealthModule,
    MarketDataModule,
    PaperWalletModule,
    PaperTradingModule,
  ],
})
export class AppModule {}
