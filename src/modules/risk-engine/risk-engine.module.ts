import { Module } from '@nestjs/common';
import { RiskAssessmentService } from './application/risk-assessment.service';
import { EmergencyStopService } from './application/emergency-stop.service';
import { EMERGENCY_STOP_REPOSITORY } from './domain/emergency-stop';
import { RISK_ENGINE } from './domain/risk-engine';
import { PrismaEmergencyStopRepository } from './infrastructure/prisma-emergency-stop.repository';
import { RiskControlController } from './presentation/risk-control.controller';
import { RiskControlAuthGuard } from './presentation/risk-control-auth.guard';

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
  ],
  exports: [RISK_ENGINE, EmergencyStopService],
})
export class RiskEngineModule {}
