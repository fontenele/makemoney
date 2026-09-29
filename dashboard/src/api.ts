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

export interface BacktestEquityPoint {
  markedAt: string;
  equityUsdt: string;
  drawdownRate: string;
}

export interface StoredBacktestRun {
  id: string;
  createdAt: string;
  request: {
    symbol: 'BTC/USDT';
    interval: '1m';
    startTime: string;
    endTime: string;
    limit: number;
  };
  result: {
    replay: {
      candleCount: number;
      startedAt: string | null;
      endedAt: string | null;
    };
    simulation: {
      capital: {
        initialCapitalUsdt: string;
        finalEquityUsdt: string;
        totalNetReturnUsdt: string;
        totalRoi: string;
      };
      equity: {
        curve: BacktestEquityPoint[];
        maximumPercentageDrawdown: {
          rate: string;
        };
      };
      performance: {
        closedTradeCount: number;
        winRate: string | null;
        totalFees: string;
      };
    };
  };
}

export interface PolymarketMarketSummary {
  provider: 'polymarket';
  id: string;
  slug: string | null;
  question: string | null;
  conditionId: string | null;
  closed: false;
}

export interface PolymarketMarketPage {
  markets: PolymarketMarketSummary[];
  nextCursor: string | null;
  receivedAt: string;
}

export interface PolymarketMarketDetails {
  provider: 'polymarket';
  id: string;
  slug: string | null;
  question: string | null;
  conditionId: string | null;
  outcomes: {
    yes: { label: string; tokenId: string | null };
    no: { label: string; tokenId: string | null };
  };
  receivedAt: string;
}

export interface PolymarketMarketOpenInterest {
  provider: 'polymarket';
  conditionId: string;
  openInterestUsdc: string;
  receivedAt: string;
  executable: false;
}

export interface PolymarketMidpointComplement {
  provider: 'polymarket';
  outcomes: {
    yes: { price: string; receivedAt: string };
    no: { price: string; receivedAt: string };
  };
  midpointSum: string;
  deviationFromOne: string;
  status: 'balanced' | 'below_one' | 'above_one';
  atomicSnapshot: false;
  executable: false;
}

export interface PolymarketTopOfBook {
  provider: 'polymarket';
  tokenId: string;
  conditionId: string;
  snapshotHash: string;
  bid: { price: string; quantity: string } | null;
  ask: { price: string; quantity: string } | null;
  spread: string | null;
  source: 'clob-order-book';
  executable: false;
  providerTimestamp: string;
  receivedAt: string;
}

export interface PolymarketLastTrade {
  provider: 'polymarket';
  tokenId: string;
  price: string;
  side: 'buy' | 'sell';
  source: 'clob-last-trade';
  executable: false;
  providerTimestamp: null;
  receivedAt: string;
}

export interface PolymarketSettings {
  enabled: boolean;
  startupDefault: boolean;
  source: 'startup' | 'runtime';
  changedAt: string | null;
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
  backtestRuns: Resource<StoredBacktestRun[]>;
  polymarketSettings: Resource<PolymarketSettings>;
  polymarketMarkets: Resource<PolymarketMarketPage>;
  loadedAt: string;
}

export interface PolymarketMarketResearch {
  details: Resource<PolymarketMarketDetails>;
  openInterest: Resource<PolymarketMarketOpenInterest>;
  midpointComplement: Resource<PolymarketMidpointComplement>;
  yesTopOfBook: Resource<PolymarketTopOfBook>;
  noTopOfBook: Resource<PolymarketTopOfBook>;
  yesLastTrade: Resource<PolymarketLastTrade>;
  noLastTrade: Resource<PolymarketLastTrade>;
}

type FetchLike = typeof fetch;

export function dashboardApiPath(
  path: string,
  development = import.meta.env.DEV,
): string {
  return development ? '/api' + path : path;
}

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
    backtestRuns,
    polymarketSettings,
    polymarketMarkets,
  ] = await Promise.all([
    loadResource<HealthResponse>(dashboardApiPath('/health'), request),
    loadResource<PortfolioValuation>(
      dashboardApiPath('/paper-wallet/valuation'),
      request,
    ),
    loadResource<PaperPosition>(
      dashboardApiPath('/paper-trading/position'),
      request,
    ),
    loadResource<PaperTradingPerformance>(
      dashboardApiPath('/paper-trading/performance'),
      request,
    ),
    loadResource<PaperExecution[]>(
      dashboardApiPath('/paper-trading/executions?limit=12'),
      request,
    ),
    loadResource<DetectedSpotSymbol[]>(
      dashboardApiPath('/new-listings?limit=8'),
      request,
    ),
    loadResource<StrategySignal[]>(
      dashboardApiPath('/strategies/signals?limit=20'),
      request,
    ),
    loadResource<StoredBacktestRun[]>(
      dashboardApiPath('/backtesting/runs?limit=1'),
      request,
    ),
    loadResource<PolymarketSettings>(
      dashboardApiPath('/polymarket/settings'),
      request,
    ),
    loadResource<PolymarketMarketPage>(
      dashboardApiPath('/polymarket/markets?limit=8'),
      request,
    ),
  ]);

  return {
    health,
    valuation,
    position,
    performance,
    executions,
    newListings,
    strategySignals,
    backtestRuns,
    polymarketSettings,
    polymarketMarkets,
    loadedAt: new Date().toISOString(),
  };
}

export async function updatePolymarketSettings(
  enabled: boolean,
  accessConfirmed: boolean,
  request: FetchLike = fetch,
): Promise<Resource<PolymarketSettings>> {
  try {
    const response = await request(dashboardApiPath('/polymarket/settings'), {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled, accessConfirmed }),
    });
    if (!response.ok) {
      return {
        status: 'unavailable',
        message:
          (await readProviderErrorMessage(response)) ??
          `Unavailable (${response.status})`,
      };
    }
    return {
      status: 'available',
      data: (await response.json()) as PolymarketSettings,
    };
  } catch {
    return { status: 'unavailable', message: 'Local API is unreachable' };
  }
}

export async function loadPolymarketMarketResearch(
  marketId: string,
  request: FetchLike = fetch,
): Promise<PolymarketMarketResearch> {
  const encodedId = encodeURIComponent(marketId);
  const [details, openInterest, midpointComplement] = await Promise.all([
    loadResource<PolymarketMarketDetails>(
      dashboardApiPath(`/polymarket/markets/${encodedId}`),
      request,
    ),
    loadResource<PolymarketMarketOpenInterest>(
      dashboardApiPath(`/polymarket/markets/${encodedId}/open-interest`),
      request,
    ),
    loadResource<PolymarketMidpointComplement>(
      dashboardApiPath(`/polymarket/markets/${encodedId}/midpoint-complement`),
      request,
    ),
  ]);

  const unavailableIdentity: Resource<PolymarketTopOfBook> = {
    status: 'unavailable',
    message: 'Outcome identity is unavailable',
  };
  if (details.status === 'unavailable') {
    const unavailableLastTrade: Resource<PolymarketLastTrade> = {
      status: 'unavailable',
      message: 'Outcome identity is unavailable',
    };
    return {
      details,
      openInterest,
      midpointComplement,
      yesTopOfBook: unavailableIdentity,
      noTopOfBook: unavailableIdentity,
      yesLastTrade: unavailableLastTrade,
      noLastTrade: unavailableLastTrade,
    };
  }

  const [yesTopOfBook, noTopOfBook, yesLastTrade, noLastTrade] =
    await Promise.all([
      loadOutcomeTopOfBook(details.data.outcomes.yes.tokenId, request),
      loadOutcomeTopOfBook(details.data.outcomes.no.tokenId, request),
      loadOutcomeLastTrade(details.data.outcomes.yes.tokenId, request),
      loadOutcomeLastTrade(details.data.outcomes.no.tokenId, request),
    ]);
  return {
    details,
    openInterest,
    midpointComplement,
    yesTopOfBook,
    noTopOfBook,
    yesLastTrade,
    noLastTrade,
  };
}

function loadOutcomeTopOfBook(
  tokenId: string | null,
  request: FetchLike,
): Promise<Resource<PolymarketTopOfBook>> {
  if (tokenId === null) {
    return Promise.resolve({
      status: 'unavailable',
      message: 'Outcome token is unavailable',
    });
  }
  return loadResource<PolymarketTopOfBook>(
    dashboardApiPath(
      `/polymarket/outcomes/${encodeURIComponent(tokenId)}/top-of-book`,
    ),
    request,
  );
}

function loadOutcomeLastTrade(
  tokenId: string | null,
  request: FetchLike,
): Promise<Resource<PolymarketLastTrade>> {
  if (tokenId === null) {
    return Promise.resolve({
      status: 'unavailable',
      message: 'Outcome token is unavailable',
    });
  }
  return loadResource<PolymarketLastTrade>(
    dashboardApiPath(
      `/polymarket/outcomes/${encodeURIComponent(tokenId)}/last-trade`,
    ),
    request,
  );
}

export function loadListingPerformance(
  provider: DetectedSpotSymbol['provider'],
  symbol: string,
  request: FetchLike = fetch,
): Promise<Resource<ListingPerformance>> {
  return loadResource<ListingPerformance>(
    dashboardApiPath(
      '/new-listings/' +
        encodeURIComponent(provider) +
        '/' +
        encodeURIComponent(symbol) +
        '/performance',
    ),
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
        message:
          (await readProviderErrorMessage(response)) ??
          `Unavailable (${response.status})`,
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

async function readProviderErrorMessage(
  response: Response,
): Promise<string | null> {
  try {
    const payload = (await response.json()) as unknown;
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string' &&
      payload.message.length > 0 &&
      payload.message.length <= 300
    ) {
      return payload.message;
    }
  } catch {
    // A non-JSON error response still has a useful HTTP status fallback.
  }
  return null;
}
