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

interface PaperExecutionBase {
  id: string;
  symbol: 'BTC/USDT';
  quantity: string;
  price: string;
  notional: string;
  feeRate: string;
  fee: string;
  quotedAt: string;
  marketDataReceivedAt: string;
  executedAt: string;
  replayed: false;
}

export interface PaperBuyExecution extends PaperExecutionBase {
  side: 'buy';
  totalCost: string;
}

export interface PaperSellExecution extends PaperExecutionBase {
  side: 'sell';
  netProceeds: string;
}

export type PaperExecution = PaperBuyExecution | PaperSellExecution;

export interface DetectedSpotSymbol {
  provider: 'binance';
  symbol: string;
  baseAsset: string;
  quoteAsset: 'USDT';
  status: string;
  spotTradingAllowed: boolean;
  detectedAt: string;
  lastObservedAt: string;
}

export interface ListingPerformancePoint {
  label: string;
  offsetMs: number;
  targetAt: string;
  completedAt: string;
  lastPrice: string;
  absolutePriceChange: string;
  priceReturnRate: string;
}

export interface ListingPerformance {
  provider: 'binance';
  symbol: string;
  baselineLabel: 'T+0';
  baselinePrice: string;
  points: ListingPerformancePoint[];
}

export interface StrategySignal {
  strategy: 'moving_average_crossover';
  symbol: 'BTC/USDT';
  action: 'buy' | 'sell' | 'hold';
  reason:
    | 'bullish_moving_average_crossover'
    | 'bearish_moving_average_crossover'
    | 'no_moving_average_crossover'
    | 'insufficient_closed_candles';
  shortPeriod: number;
  longPeriod: number;
  previousShortAverage: string | null;
  previousLongAverage: string | null;
  currentShortAverage: string | null;
  currentLongAverage: string | null;
  latestCandleCloseTime: string | null;
  evaluatedAt: string;
}

export type Resource<T> =
  { status: 'available'; data: T } | { status: 'unavailable'; message: string };

export interface DashboardSnapshot {
  health: Resource<HealthResponse>;
  valuation: Resource<PortfolioValuation>;
  position: Resource<PaperPosition>;
  performance: Resource<PaperTradingPerformance>;
  executions: Resource<PaperExecution[]>;
  newListings: Resource<DetectedSpotSymbol[]>;
  strategySignals: Resource<StrategySignal[]>;
  loadedAt: string;
}

type FetchLike = typeof fetch;

export async function loadDashboard(
  request: FetchLike = fetch,
): Promise<DashboardSnapshot> {
  const [
    health,
    valuation,
    position,
    performance,
    executions,
    newListings,
    strategySignals,
  ] = await Promise.all([
    loadResource<HealthResponse>('/api/health', request),
    loadResource<PortfolioValuation>('/api/paper-wallet/valuation', request),
    loadResource<PaperPosition>('/api/paper-trading/position', request),
    loadResource<PaperTradingPerformance>(
      '/api/paper-trading/performance',
      request,
    ),
    loadResource<PaperExecution[]>(
      '/api/paper-trading/executions?limit=12',
      request,
    ),
    loadResource<DetectedSpotSymbol[]>('/api/new-listings?limit=8', request),
    loadResource<StrategySignal[]>('/api/strategies/signals?limit=20', request),
  ]);

  return {
    health,
    valuation,
    position,
    performance,
    executions,
    newListings,
    strategySignals,
    loadedAt: new Date().toISOString(),
  };
}

export function loadListingPerformance(
  provider: DetectedSpotSymbol['provider'],
  symbol: string,
  request: FetchLike = fetch,
): Promise<Resource<ListingPerformance>> {
  return loadResource<ListingPerformance>(
    `/api/new-listings/${encodeURIComponent(provider)}/${encodeURIComponent(symbol)}/performance`,
    request,
  );
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
