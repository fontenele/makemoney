import { ConfigService } from '@nestjs/config';
import { RiskAssessmentService } from './risk-assessment.service';

describe('RiskAssessmentService', () => {
  const candidate = {
    id: 'order-1',
    symbol: 'BTC/USDT' as const,
    side: 'buy' as const,
    quantity: '0.002',
    notional: '100',
  };

  it('approves an order exactly at the configured limit', () => {
    expect(service('100', false).assess(candidate)).toEqual({
      decision: 'approved',
      rule: 'max_order_notional_usdt',
      notional: '100',
      limit: '100',
    });
  });

  it.each(['buy', 'sell'] as const)(
    'rejects a %s order above the configured limit',
    (side) => {
      expect(
        service('100', false).assess({
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
      service('100', false).assess({ ...candidate, notional: 'NaN' }),
    ).toThrow('Invalid candidate notional');
  });

  it.each(['buy', 'sell'] as const)(
    'rejects a %s order while the emergency stop is active',
    (side) => {
      expect(service('100', true).assess({ ...candidate, side })).toEqual({
        decision: 'rejected',
        rule: 'emergency_stop',
        reason: 'emergency_stop_active',
      });
    },
  );

  it('evaluates emergency stop before validating notional', () => {
    expect(
      service('100', true).assess({ ...candidate, notional: 'invalid' }),
    ).toMatchObject({ rule: 'emergency_stop', decision: 'rejected' });
  });
});

function service(limit: string, emergencyStop: boolean): RiskAssessmentService {
  return new RiskAssessmentService({
    getOrThrow: (key: string) =>
      key === 'RISK_EMERGENCY_STOP' ? emergencyStop : limit,
  } as unknown as ConfigService);
}
