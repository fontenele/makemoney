export const RISK_ENGINE = Symbol('RISK_ENGINE');

export interface RiskOrderCandidate {
  id: string;
  symbol: 'BTC/USDT';
  side: 'buy' | 'sell';
  quantity: string;
  notional: string;
}

export type RiskAssessment =
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
    };

export interface RiskEngine {
  assess(candidate: RiskOrderCandidate): RiskAssessment;
}
