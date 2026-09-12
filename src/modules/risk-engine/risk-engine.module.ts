import { Module } from '@nestjs/common';
import { RiskAssessmentService } from './application/risk-assessment.service';
import { EmergencyStopService } from './application/emergency-stop.service';
import { EMERGENCY_STOP_REPOSITORY } from './domain/emergency-stop';
import { RISK_ENGINE } from './domain/risk-engine';
import { PrismaEmergencyStopRepository } from './infrastructure/prisma-emergency-stop.repository';
import { RiskControlController } from './presentation/risk-control.controller';
import { RiskControlAuthGuard } from './presentation/risk-control-auth.guard';
import { EXECUTION_RATE_LIMITER } from './domain/execution-rate-limiter';
import { RedisExecutionRateLimiterService } from './application/redis-execution-rate-limiter.service';

@Module({
  controllers: [RiskControlController],
  providers: [
    EmergencyStopService,
    RiskControlAuthGuard,
    {
      provide: EMERGENCY_STOP_REPOSITORY,
      useClass: PrismaEmergencyStopRepository,
    },
    RiskAssessmentService,
    { provide: RISK_ENGINE, useExisting: RiskAssessmentService },
    RedisExecutionRateLimiterService,
    {
      provide: EXECUTION_RATE_LIMITER,
      useExisting: RedisExecutionRateLimiterService,
    },
  ],
  exports: [RISK_ENGINE, EXECUTION_RATE_LIMITER, EmergencyStopService],
})
export class RiskEngineModule {}
