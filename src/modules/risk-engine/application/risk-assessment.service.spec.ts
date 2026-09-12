import { ConfigService } from '@nestjs/config';
import { RiskAssessmentService } from './risk-assessment.service';

describe('RiskAssessmentService', () => {
  const candidate = {
    id: 'order-1',
    symbol: 'BTC/USDT' as const,
    side: 'buy' as const,
    quantity: '0.002',
    notional: '100',
    currentPositionQuantity: '0.003',
  };

  it('approves an order exactly at the configured limit', () => {
    expect(service('100', false, '0.005').assess(candidate)).toEqual({
      decision: 'approved',
      rule: 'max_btc_position_quantity',
      currentQuantity: '0.003',
      projectedQuantity: '0.005',
      limit: '0.005',
    });
  });

  it.each(['buy', 'sell'] as const)(
    'rejects a %s order above the configured limit',
    (side) => {
      expect(
        service('100', false, '1').assess({
          ...candidate,
          side,
          notional: '100.0001',
        }),
      ).toEqual({
        decision: 'rejected',
        rule: 'max_order_notional_usdt',
        reason: 'max_order_notional_exceeded',
        notional: '100.0001',
        limit: '100',
      });
    },
  );

  it('rejects an invalid candidate notional', () => {
    expect(() =>
      service('100', false, '1').assess({ ...candidate, notional: 'NaN' }),
    ).toThrow('Invalid candidate notional');
  });

  it.each(['buy', 'sell'] as const)(
    'rejects a %s order while the emergency stop is active',
    (side) => {
      expect(service('100', true, '1').assess({ ...candidate, side })).toEqual({
        decision: 'rejected',
        rule: 'emergency_stop',
        reason: 'emergency_stop_active',
      });
    },
  );

  it('evaluates emergency stop before validating notional', () => {
    expect(
      service('100', true, '1').assess({ ...candidate, notional: 'invalid' }),
    ).toMatchObject({ rule: 'emergency_stop', decision: 'rejected' });
  });

  it('rejects a buy whose projected BTC position exceeds the limit', () => {
    expect(service('1000', false, '0.004').assess(candidate)).toEqual({
      decision: 'rejected',
      rule: 'max_btc_position_quantity',
      reason: 'max_btc_position_quantity_exceeded',
      currentQuantity: '0.003',
      projectedQuantity: '0.005',
      limit: '0.004',
    });
  });

  it('does not apply the BTC position limit to a sell', () => {
    expect(
      service('1000', false, '0.001').assess({ ...candidate, side: 'sell' }),
    ).toMatchObject({
      decision: 'approved',
      rule: 'max_order_notional_usdt',
    });
  });

  it('evaluates maximum order notional before BTC position quantity', () => {
    expect(
      service('99', false, '0.001').assess({
        ...candidate,
        currentPositionQuantity: 'invalid',
      }),
    ).toMatchObject({
      decision: 'rejected',
      rule: 'max_order_notional_usdt',
    });
  });
});

function service(
  limit: string,
  emergencyStop: boolean,
  positionLimit: string,
): RiskAssessmentService {
  return new RiskAssessmentService({
    getOrThrow: (key: string) => {
      if (key === 'RISK_EMERGENCY_STOP') return emergencyStop;
      if (key === 'RISK_MAX_BTC_POSITION_QUANTITY') return positionLimit;
      return limit;
    },
  } as unknown as ConfigService);
}
