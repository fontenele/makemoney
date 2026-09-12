export const RISK_ENGINE = Symbol('RISK_ENGINE');

export interface RiskOrderCandidate {
  id: string;
  symbol: 'BTC/USDT';
  side: 'buy' | 'sell';
  quantity: string;
  notional: string;
  currentPositionQuantity: string;
  dailyRealizedPnl: string;
}

export type RiskAssessment =
  | {
      decision: 'rejected';
      rule: 'emergency_stop';
      reason: 'emergency_stop_active';
    }
  | {
      decision: 'approved';
      rule: 'max_order_notional_usdt';
      notional: string;
      limit: string;
    }
  | {
      decision: 'rejected';
      rule: 'max_order_notional_usdt';
      reason: 'max_order_notional_exceeded';
      notional: string;
      limit: string;
    }
  | {
      decision: 'rejected';
      rule: 'max_daily_realized_loss_usdt';
      reason: 'max_daily_realized_loss_reached';
      dailyRealizedPnl: string;
      limit: string;
    }
  | {
      decision: 'approved';
      rule: 'max_btc_position_quantity';
      currentQuantity: string;
      projectedQuantity: string;
      limit: string;
    }
  | {
      decision: 'rejected';
      rule: 'max_btc_position_quantity';
      reason: 'max_btc_position_quantity_exceeded';
      currentQuantity: string;
      projectedQuantity: string;
      limit: string;
    };

export interface RiskEngine {
  assess(candidate: RiskOrderCandidate): RiskAssessment;
}
