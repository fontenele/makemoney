export interface PaperBuyIntent {
  idempotencyKey: string;
  symbol: 'BTC/USDT';
  side: 'buy';
  quantity: string;
}

export interface PaperSellIntent {
  idempotencyKey: string;
  symbol: 'BTC/USDT';
  side: 'sell';
  quantity: string;
}

interface PaperExecutionBase {
  id: string;
  symbol: 'BTC/USDT';
  quantity: string;
  price: string;
  notional: string;
  feeRate: string;
  fee: string;
  executedAt: Date;
  replayed: boolean;
}

export interface PaperBuyExecution extends PaperExecutionBase {
  side: 'buy';
  totalCost: string;
}

export interface PaperSellExecution extends PaperExecutionBase {
  side: 'sell';
  netProceeds: string;
}

export type PaperOrderIntent = PaperBuyIntent | PaperSellIntent;
export type PaperExecution = PaperBuyExecution | PaperSellExecution;

export interface TradingExecutor {
  execute(intent: PaperOrderIntent): Promise<PaperExecution>;
}
