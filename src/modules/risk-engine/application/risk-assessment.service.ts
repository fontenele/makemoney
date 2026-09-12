import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import {
  RiskAssessment,
  RiskEngine,
  RiskOrderCandidate,
} from '../domain/risk-engine';

const RiskDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const DECIMAL_PATTERN = /^(0|[1-9]\d{0,19})(\.\d{1,18})?$/;

@Injectable()
export class RiskAssessmentService implements RiskEngine {
  private readonly logger = new Logger(RiskAssessmentService.name);

  constructor(private readonly config: ConfigService) {}

  assess(candidate: RiskOrderCandidate): RiskAssessment {
    const notional = positiveDecimal(candidate.notional, 'candidate notional');
    const limitValue = this.config.getOrThrow<string>(
      'RISK_MAX_ORDER_NOTIONAL_USDT',
    );
    const limit = positiveDecimal(limitValue, 'risk limit');
    const common = {
      rule: 'max_order_notional_usdt' as const,
      notional: notional.toFixed(),
      limit: limit.toFixed(),
    };
    const assessment: RiskAssessment = notional.greaterThan(limit)
      ? {
          decision: 'rejected',
          reason: 'max_order_notional_exceeded',
          ...common,
        }
      : { decision: 'approved', ...common };

    this.logger.log({
      event: 'risk.order_assessed',
      candidateId: candidate.id,
      symbol: candidate.symbol,
      side: candidate.side,
      quantity: candidate.quantity,
      ...assessment,
    });
    return assessment;
  }
}

function positiveDecimal(value: string, name: string): Decimal {
  if (!DECIMAL_PATTERN.test(value)) throw new TypeError(`Invalid ${name}`);
  const result = new RiskDecimal(value);
  if (result.lessThanOrEqualTo(0)) throw new TypeError(`Invalid ${name}`);
  return result;
}
