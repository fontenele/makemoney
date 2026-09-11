export interface PaperBuyIntent {
  idempotencyKey: string;
  symbol: 'BTC/USDT';
  side: 'buy';
  quantity: string;
}

export interface PaperExecution {
  id: string;
  symbol: 'BTC/USDT';
  side: 'buy';
  quantity: string;
  price: string;
  notional: string;
  feeRate: string;
  fee: string;
  totalCost: string;
  executedAt: Date;
  replayed: boolean;
}

export interface TradingExecutor {
  execute(intent: PaperBuyIntent): Promise<PaperExecution>;
}
