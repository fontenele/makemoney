import { ConfigService } from '@nestjs/config';
import { EmergencyStopService } from './emergency-stop.service';
import { RiskAssessmentService } from './risk-assessment.service';

describe('RiskAssessmentService', () => {
  const candidate = {
    id: 'order-1',
    symbol: 'BTC/USDT' as const,
    side: 'buy' as const,
    quantity: '0.002',
    topOfBookAvailableQuantity: '1',
    notional: '100',
    currentPositionQuantity: '0.003',
    dailyRealizedPnl: '0',
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

  it('rejects a buy exactly at the daily realized loss limit', () => {
    expect(
      service('1000', false, '1', '25').assess({
        ...candidate,
        dailyRealizedPnl: '-25',
      }),
    ).toEqual({
      decision: 'rejected',
      rule: 'max_daily_realized_loss_usdt',
      reason: 'max_daily_realized_loss_reached',
      dailyRealizedPnl: '-25',
      limit: '25',
    });
  });

  it.each(['buy', 'sell'] as const)(
    'rejects a %s above the top-of-book participation limit',
    (side) => {
      expect(
        service('1000', false, '1').assess({
          ...candidate,
          side,
          quantity: '0.1001',
          topOfBookAvailableQuantity: '1',
        }),
      ).toEqual({
        decision: 'rejected',
        rule: 'max_top_of_book_participation_rate',
        reason: 'top_of_book_participation_exceeded',
        participationRate: '0.1001',
        limit: '0.1',
      });
    },
  );

  it('allows the exact top-of-book participation boundary', () => {
    expect(
      service('1000', false, '1').assess({
        ...candidate,
        quantity: '0.1',
        topOfBookAvailableQuantity: '1',
      }),
    ).toMatchObject({ decision: 'approved' });
  });

  it('evaluates top-of-book participation before daily loss', () => {
    expect(
      service('1000', false, '1').assess({
        ...candidate,
        quantity: '0.2',
        topOfBookAvailableQuantity: '1',
        dailyRealizedPnl: '-25',
      }),
    ).toMatchObject({
      decision: 'rejected',
      rule: 'max_top_of_book_participation_rate',
    });
  });

  it('allows a buy while net daily PnL remains above the loss limit', () => {
    expect(
      service('1000', false, '1', '25').assess({
        ...candidate,
        dailyRealizedPnl: '-24.999',
      }),
    ).toMatchObject({ decision: 'approved' });
  });

  it('allows sells after the daily realized loss limit is reached', () => {
    expect(
      service('1000', false, '1', '25').assess({
        ...candidate,
        side: 'sell',
        dailyRealizedPnl: '-30',
      }),
    ).toMatchObject({ decision: 'approved' });
  });

  it('evaluates daily loss before BTC position quantity', () => {
    expect(
      service('1000', false, '0.001', '25').assess({
        ...candidate,
        dailyRealizedPnl: '-25',
      }),
    ).toMatchObject({
      decision: 'rejected',
      rule: 'max_daily_realized_loss_usdt',
    });
  });
});

function service(
  limit: string,
  emergencyStop: boolean,
  positionLimit: string,
  dailyLossLimit = '25',
): RiskAssessmentService {
  return new RiskAssessmentService(
    {
      getOrThrow: (key: string) => {
        if (key === 'RISK_MAX_TOP_OF_BOOK_PARTICIPATION_RATE') return '0.1';
        if (key === 'RISK_MAX_BTC_POSITION_QUANTITY') return positionLimit;
        if (key === 'RISK_MAX_DAILY_REALIZED_LOSS_USDT') return dailyLossLimit;
        return limit;
      },
    } as unknown as ConfigService,
    { isActive: () => emergencyStop } as EmergencyStopService,
  );
}
