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
    if (this.config.getOrThrow<boolean>('RISK_EMERGENCY_STOP')) {
      const assessment: RiskAssessment = {
        decision: 'rejected',
        rule: 'emergency_stop',
        reason: 'emergency_stop_active',
      };
      this.logAssessment(candidate, assessment);
      return assessment;
    }

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
    let assessment: RiskAssessment = notional.greaterThan(limit)
      ? {
          decision: 'rejected',
          reason: 'max_order_notional_exceeded',
          ...common,
        }
      : { decision: 'approved', ...common };

    if (assessment.decision === 'approved' && candidate.side === 'buy') {
      const currentQuantity = nonNegativeDecimal(
        candidate.currentPositionQuantity,
        'current position quantity',
      );
      const orderQuantity = positiveDecimal(
        candidate.quantity,
        'candidate quantity',
      );
      const positionLimit = positiveDecimal(
        this.config.getOrThrow<string>('RISK_MAX_BTC_POSITION_QUANTITY'),
        'position limit',
      );
      const projectedQuantity = currentQuantity.plus(orderQuantity);
      const positionCommon = {
        rule: 'max_btc_position_quantity' as const,
        currentQuantity: currentQuantity.toFixed(),
        projectedQuantity: projectedQuantity.toFixed(),
        limit: positionLimit.toFixed(),
      };
      assessment = projectedQuantity.greaterThan(positionLimit)
        ? {
            decision: 'rejected',
            reason: 'max_btc_position_quantity_exceeded',
            ...positionCommon,
          }
        : { decision: 'approved', ...positionCommon };
    }

    this.logAssessment(candidate, assessment);
    return assessment;
  }

  private logAssessment(
    candidate: RiskOrderCandidate,
    assessment: RiskAssessment,
  ): void {
    this.logger.log({
      event: 'risk.order_assessed',
      candidateId: candidate.id,
      symbol: candidate.symbol,
      side: candidate.side,
      quantity: candidate.quantity,
      ...assessment,
    });
  }
}

function positiveDecimal(value: string, name: string): Decimal {
  if (!DECIMAL_PATTERN.test(value)) throw new TypeError(`Invalid ${name}`);
  const result = new RiskDecimal(value);
  if (result.lessThanOrEqualTo(0)) throw new TypeError(`Invalid ${name}`);
  return result;
}

function nonNegativeDecimal(value: string, name: string): Decimal {
  if (!DECIMAL_PATTERN.test(value)) throw new TypeError(`Invalid ${name}`);
  return new RiskDecimal(value);
}
