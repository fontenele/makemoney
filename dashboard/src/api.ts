export interface HealthResponse {
  status: 'ok';
  services: {
    api: 'up';
    postgres: 'up';
    redis: 'up';
  };
}

export interface PortfolioValuation {
  quoteAsset: 'USDT';
  btcBalance: string;
  btcPrice: string;
  btcValue: string;
  usdtBalance: string;
  totalValue: string;
  pricedAt: string;
}

export interface PaperPosition {
  symbol: 'BTC/USDT';
  quantity: string;
  costBasis: string;
  averageEntryPrice: string | null;
  realizedPnl: string;
  totalFees: string;
  markPrice: string | null;
  grossMarketValue: string;
  estimatedExitFee: string;
  netLiquidationValue: string;
  unrealizedPnl: string;
  totalPnl: string;
  marketDataReceivedAt: string | null;
}

export interface PaperTradingPerformance {
  symbol: 'BTC/USDT';
  executionCount: number;
  buyExecutionCount: number;
  sellExecutionCount: number;
  profitableSellCount: number;
  losingSellCount: number;
  breakEvenSellCount: number;
  winRate: string | null;
  realizedPnl: string;
  totalFees: string;
}

export type Resource<T> =
  { status: 'available'; data: T } | { status: 'unavailable'; message: string };

export interface DashboardSnapshot {
  health: Resource<HealthResponse>;
  valuation: Resource<PortfolioValuation>;
  position: Resource<PaperPosition>;
  performance: Resource<PaperTradingPerformance>;
  loadedAt: string;
}

type FetchLike = typeof fetch;

export async function loadDashboard(
  request: FetchLike = fetch,
): Promise<DashboardSnapshot> {
  const [health, valuation, position, performance] = await Promise.all([
    loadResource<HealthResponse>('/api/health', request),
    loadResource<PortfolioValuation>('/api/paper-wallet/valuation', request),
    loadResource<PaperPosition>('/api/paper-trading/position', request),
    loadResource<PaperTradingPerformance>(
      '/api/paper-trading/performance',
      request,
    ),
  ]);

  return {
    health,
    valuation,
    position,
    performance,
    loadedAt: new Date().toISOString(),
  };
}

async function loadResource<T>(
  path: string,
  request: FetchLike,
): Promise<Resource<T>> {
  try {
    const response = await request(path, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return {
        status: 'unavailable',
        message: `Unavailable (${response.status})`,
      };
    }
    return { status: 'available', data: (await response.json()) as T };
  } catch {
    return {
      status: 'unavailable',
      message: 'Local API is unreachable',
    };
  }
}
