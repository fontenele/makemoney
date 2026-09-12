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
    expect(service('100').assess(candidate)).toEqual({
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
        service('100').assess({ ...candidate, side, notional: '100.0001' }),
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
      service('100').assess({ ...candidate, notional: 'NaN' }),
    ).toThrow('Invalid candidate notional');
  });
});

function service(limit: string): RiskAssessmentService {
  return new RiskAssessmentService({
    getOrThrow: () => limit,
  } as unknown as ConfigService);
}
