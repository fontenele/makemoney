import { Module } from '@nestjs/common';
import { RiskAssessmentService } from './application/risk-assessment.service';
import { RISK_ENGINE } from './domain/risk-engine';

@Module({
  providers: [
    RiskAssessmentService,
    { provide: RISK_ENGINE, useExisting: RiskAssessmentService },
  ],
  exports: [RISK_ENGINE],
})
export class RiskEngineModule {}
