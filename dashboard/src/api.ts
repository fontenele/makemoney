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

export interface PolymarketEventSummary {
  provider: 'polymarket';
  id: string;
  slug: string | null;
  title: string;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  closed: false;
  archived: boolean;
  restricted: boolean;
}

export interface PolymarketEventPage {
  events: PolymarketEventSummary[];
  nextCursor: string | null;
  receivedAt: string;
}

export interface PolymarketSearchResult {
  query: string;
  page: number;
  events: PolymarketEventSummary[];
  hasMore: boolean;
  totalResults: number;
  receivedAt: string;
}

export interface PolymarketEventDetails {
  provider: 'polymarket';
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  resolutionSource: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  closed: boolean;
  archived: boolean;
  restricted: boolean;
  markets: Array<{
    id: string;
    slug: string | null;
    question: string | null;
    conditionId: string | null;
    closed: boolean;
  }>;
  receivedAt: string;
}

export interface PolymarketEventTags {
  provider: 'polymarket';
  eventId: string;
  tags: PolymarketMarketTag[];
  receivedAt: string;
}

export interface PolymarketEventLiveVolume {
  provider: 'polymarket';
  event: PolymarketEventDetails;
  takerVolumeTotalShares: string;
  markets: Array<{
    conditionId: string | null;
    takerVolumeShares: string;
  }>;
  source: 'data-api-live-volume';
  receivedAt: string;
  executable: false;
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

export interface PolymarketOutcomeParentMarket {
  provider: 'polymarket';
  requestedTokenId: string;
  requestedOutcome: 'yes' | 'no';
  conditionId: string;
  outcomes: {
    yes: { tokenId: string };
    no: { tokenId: string };
  };
  source: 'clob-market-by-token';
  receivedAt: string;
  executable: false;
}

export interface PolymarketBinaryResolution {
  provider: 'polymarket';
  market: PolymarketMarketDetails;
  resolution: {
    provider: 'polymarket';
    conditionId: string;
    status: string;
    extendedReview: boolean;
    wasDisputed: boolean;
    wasArbitrated: boolean;
    resolvedAt: string | null;
    source: 'data-api-resolution';
    receivedAt: string;
  };
  result: 'yes' | 'no' | 'fifty_fifty';
  payouts: {
    yes: {
      label: string;
      tokenId: string;
      payoutRate: '0' | '0.5' | '1';
      status: 'winner' | 'loser' | 'split';
    };
    no: {
      label: string;
      tokenId: string;
      payoutRate: '0' | '0.5' | '1';
      status: 'winner' | 'loser' | 'split';
    };
  };
  executable: false;
}

export interface PolymarketMarketTag {
  id: string;
  label: string | null;
  slug: string | null;
}

export interface PolymarketMarketTags {
  provider: 'polymarket';
  marketId: string;
  tags: PolymarketMarketTag[];
  receivedAt: string;
}

export interface PolymarketRelatedTags {
  provider: 'polymarket';
  tagId: string;
  tags: PolymarketMarketTag[];
  receivedAt: string;
}

export interface PolymarketMarketOpenInterest {
  provider: 'polymarket';
  conditionId: string;
  openInterestUsdc: string;
  receivedAt: string;
  executable: false;
}

export interface PolymarketGlobalOpenInterest {
  provider: 'polymarket';
  openInterestUsdc: string;
  source: 'data-api-open-interest';
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

export interface PolymarketPriceChangeObservation {
  provider: 'polymarket';
  tokenId: string;
  requestedAt: string;
  observedAt: string;
  price: string;
  resolutionSeconds: number;
  exactTimestamp: boolean;
  source: 'data-api-price-history';
  receivedAt: string;
  executable: false;
}

export interface PolymarketOutcomePriceChange {
  provider: 'polymarket';
  tokenId: string;
  requestedFrom: string;
  requestedTo: string;
  observations: {
    from: PolymarketPriceChangeObservation;
    to: PolymarketPriceChangeObservation;
  };
  priceChange: string;
  direction: 'down' | 'unchanged' | 'up';
  sameObservedTimestamp: boolean;
  sameResolution: boolean;
  executable: false;
}

export interface PolymarketBinaryPriceChange {
  provider: 'polymarket';
  requestedFrom: string;
  requestedTo: string;
  outcomes: {
    yes: PolymarketOutcomePriceChange;
    no: PolymarketOutcomePriceChange;
  };
  combinedPriceChange: string;
  combinedDirection: 'down' | 'unchanged' | 'up';
  sameFromObservedTimestamp: boolean;
  sameToObservedTimestamp: boolean;
  sameFromResolution: boolean;
  sameToResolution: boolean;
  atomicSnapshot: false;
  executable: false;
}

export interface PolymarketPriceHistoryPoint {
  timestamp: string;
  price: string;
  resolutionSeconds: number;
}

export interface PolymarketPriceHistoryPage {
  provider: 'polymarket';
  tokenId: string;
  start: string;
  end: string;
  resolution: '1m' | '5m' | '30m' | '3h' | '12h';
  points: PolymarketPriceHistoryPoint[];
  nextCursor: string | null;
  source: 'data-api-price-history';
  receivedAt: string;
  executable: false;
}

export interface PolymarketSettings {
  enabled: boolean;
  startupDefault: boolean;
  source: 'startup' | 'runtime';
  changedAt: string | null;
}

export interface PolymarketDataFreshness {
  provider: 'polymarket';
  snapshotAgeSeconds: number;
  computedAt: string;
  ingestion: {
    chainId: number;
    cursorCount: number;
    lagging: Array<{ behindMax: number; block: number; source: string }>;
    maxSyncedBlock: number;
    minSyncedBlock: number;
    mostLagged: { behindMax: number; block: number; source: string };
    network: string;
  };
  serving: {
    mechanisms: Array<{
      ageSeconds: number;
      name: string;
      blocksBehind: number;
    }>;
    lagSeconds: number;
    worst: string;
  };
  source: 'data-api-status';
  receivedAt: string;
}

export type Resource<T> =
  { status: 'available'; data: T } | { status: 'unavailable'; message: string };

export interface RealTradingStatus {
  scope: 'real_trading_local_status';
  tradingMode: 'paper' | 'real';
  realExecutionEnabled: boolean;
  runtimeExecutionAvailable: false;
  instrument: {
    providerId: 'agentic_wallet';
    chainId: '56';
    btc: {
      symbol: 'BTCB';
      tokenAddress: string;
      representation: 'binance_peg_btc';
    };
    usdt: {
      symbol: 'USDT';
      tokenAddress: string;
      representation: 'bsc_usdt';
    };
    decision: 'approved_candidate';
  };
  walletObservationMode: 'manual_read_only';
  quoteAuthorized: false;
  submissionAuthorized: false;
}

export interface AgenticWalletObservation {
  providerId: 'agentic_wallet';
  connection: 'connected' | 'disconnected';
  observedAt: string;
  cliVersion: string;
  requiredCliVersion: string;
  approvedChain: {
    chainId: '56';
    available: boolean;
    addressAvailable: boolean;
  };
  security: {
    dailyLimitUsd: string;
    abnormalTransactionHandling: 'AutoReject' | 'NeedConfirmation';
    tradeAllTokens: boolean;
    predictionTradingEnabled: boolean;
    developerModeEnabled: boolean;
    sessionExpiresAt: string;
  } | null;
  quota: {
    usedUsd: string;
    remainingUsd: string;
    date: string;
  } | null;
  balance: { available: boolean; assetCount: number; empty: boolean };
  gasAvailable: boolean;
  quoteAuthorized: false;
  submissionAuthorized: false;
}

export interface DashboardSnapshot {
  health: Resource<HealthResponse>;
  valuation: Resource<PortfolioValuation>;
  position: Resource<PaperPosition>;
  performance: Resource<PaperTradingPerformance>;
  executions: Resource<PaperExecution[]>;
  newListings: Resource<DetectedSpotSymbol[]>;
  strategySignals: Resource<StrategySignal[]>;
  backtestRuns: Resource<StoredBacktestRun[]>;
  realTradingStatus: Resource<RealTradingStatus>;
  polymarketSettings: Resource<PolymarketSettings>;
  polymarketDataFreshness: Resource<PolymarketDataFreshness>;
  polymarketGlobalOpenInterest: Resource<PolymarketGlobalOpenInterest>;
  polymarketEvents: Resource<PolymarketEventPage>;
  polymarketMarkets: Resource<PolymarketMarketPage>;
  loadedAt: string;
}

export interface PolymarketMarketResearch {
  details: Resource<PolymarketMarketDetails>;
  yesParentMarket: Resource<PolymarketOutcomeParentMarket>;
  noParentMarket: Resource<PolymarketOutcomeParentMarket>;
  resolution: Resource<PolymarketBinaryResolution>;
  tags: Resource<PolymarketMarketTags>;
  openInterest: Resource<PolymarketMarketOpenInterest>;
  midpointComplement: Resource<PolymarketMidpointComplement>;
  yesTopOfBook: Resource<PolymarketTopOfBook>;
  noTopOfBook: Resource<PolymarketTopOfBook>;
  yesLastTrade: Resource<PolymarketLastTrade>;
  noLastTrade: Resource<PolymarketLastTrade>;
  priceChange24h: Resource<PolymarketBinaryPriceChange>;
  yesPriceHistory24h: Resource<PolymarketPriceHistoryPage>;
  noPriceHistory24h: Resource<PolymarketPriceHistoryPage>;
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
  const polymarketSettingsPromise = loadResource<PolymarketSettings>(
    dashboardApiPath('/polymarket/settings'),
    request,
  );
  const [
    health,
    valuation,
    position,
    performance,
    executions,
    newListings,
    strategySignals,
    backtestRuns,
    realTradingStatus,
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
    loadResource<RealTradingStatus>(
      dashboardApiPath('/real-trading/status'),
      request,
    ),
  ]);
  const polymarketSettings = await polymarketSettingsPromise;
  const polymarketResources =
    polymarketSettings.status === 'available' &&
    polymarketSettings.data.enabled === true
      ? await loadPolymarketDashboardResources(request)
      : unavailablePolymarketDashboardResources(
          polymarketSettings.status === 'available'
            ? 'Polymarket provider access is disabled'
            : 'Polymarket access state is unavailable',
        );

  return {
    health,
    valuation,
    position,
    performance,
    executions,
    newListings,
    strategySignals,
    backtestRuns,
    realTradingStatus,
    polymarketSettings,
    ...polymarketResources,
    loadedAt: new Date().toISOString(),
  };
}

export async function observeAgenticWallet(
  request: FetchLike = fetch,
): Promise<Resource<AgenticWalletObservation>> {
  try {
    const response = await request(
      dashboardApiPath('/real-trading/wallet-observation'),
      { method: 'POST', headers: { Accept: 'application/json' } },
    );
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
      data: (await response.json()) as AgenticWalletObservation,
    };
  } catch {
    return { status: 'unavailable', message: 'Local API is unreachable' };
  }
}

async function loadPolymarketDashboardResources(
  request: FetchLike,
): Promise<
  Pick<
    DashboardSnapshot,
    | 'polymarketDataFreshness'
    | 'polymarketGlobalOpenInterest'
    | 'polymarketEvents'
    | 'polymarketMarkets'
  >
> {
  const [
    polymarketDataFreshness,
    polymarketGlobalOpenInterest,
    polymarketEvents,
    polymarketMarkets,
  ] = await Promise.all([
    loadResource<PolymarketDataFreshness>(
      dashboardApiPath('/polymarket/data-freshness'),
      request,
    ),
    loadResource<PolymarketGlobalOpenInterest>(
      dashboardApiPath('/polymarket/open-interest'),
      request,
    ),
    loadResource<PolymarketEventPage>(
      dashboardApiPath('/polymarket/events?limit=6'),
      request,
    ),
    loadResource<PolymarketMarketPage>(
      dashboardApiPath('/polymarket/markets?limit=8'),
      request,
    ),
  ]);
  return {
    polymarketDataFreshness,
    polymarketGlobalOpenInterest,
    polymarketEvents,
    polymarketMarkets,
  };
}

function unavailablePolymarketDashboardResources(
  message: string,
): Pick<
  DashboardSnapshot,
  | 'polymarketDataFreshness'
  | 'polymarketGlobalOpenInterest'
  | 'polymarketEvents'
  | 'polymarketMarkets'
> {
  return {
    polymarketDataFreshness: { status: 'unavailable', message },
    polymarketGlobalOpenInterest: { status: 'unavailable', message },
    polymarketEvents: { status: 'unavailable', message },
    polymarketMarkets: { status: 'unavailable', message },
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
  now: Date = new Date(),
): Promise<PolymarketMarketResearch> {
  const encodedId = encodeURIComponent(marketId);
  const requestedTo = new Date(now);
  requestedTo.setMilliseconds(0);
  const requestedFrom = new Date(requestedTo.getTime() - 24 * 60 * 60 * 1000);
  const priceChangeQuery = new URLSearchParams({
    from: requestedFrom.toISOString(),
    to: requestedTo.toISOString(),
  });
  const priceHistoryQuery = new URLSearchParams({
    start: requestedFrom.toISOString(),
    end: requestedTo.toISOString(),
    resolution: '30m',
    limit: '100',
  });
  const [
    details,
    resolution,
    tags,
    openInterest,
    midpointComplement,
    priceChange24h,
  ] = await Promise.all([
    loadResource<PolymarketMarketDetails>(
      dashboardApiPath(`/polymarket/markets/${encodedId}`),
      request,
    ),
    loadResource<PolymarketBinaryResolution>(
      dashboardApiPath(`/polymarket/markets/${encodedId}/resolution`),
      request,
    ),
    loadResource<PolymarketMarketTags>(
      dashboardApiPath(`/polymarket/markets/${encodedId}/tags`),
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
    loadResource<PolymarketBinaryPriceChange>(
      dashboardApiPath(
        `/polymarket/markets/${encodedId}/price-change?${priceChangeQuery.toString()}`,
      ),
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
    const unavailablePriceHistory: Resource<PolymarketPriceHistoryPage> = {
      status: 'unavailable',
      message: 'Outcome identity is unavailable',
    };
    const unavailableParentMarket: Resource<PolymarketOutcomeParentMarket> = {
      status: 'unavailable',
      message: 'Outcome identity is unavailable',
    };
    return {
      details,
      yesParentMarket: unavailableParentMarket,
      noParentMarket: unavailableParentMarket,
      resolution,
      tags,
      openInterest,
      midpointComplement,
      yesTopOfBook: unavailableIdentity,
      noTopOfBook: unavailableIdentity,
      yesLastTrade: unavailableLastTrade,
      noLastTrade: unavailableLastTrade,
      priceChange24h,
      yesPriceHistory24h: unavailablePriceHistory,
      noPriceHistory24h: unavailablePriceHistory,
    };
  }

  const [
    yesParentMarket,
    noParentMarket,
    yesTopOfBook,
    noTopOfBook,
    yesLastTrade,
    noLastTrade,
    yesPriceHistory24h,
    noPriceHistory24h,
  ] = await Promise.all([
    loadOutcomeParentMarket(details.data.outcomes.yes.tokenId, request),
    loadOutcomeParentMarket(details.data.outcomes.no.tokenId, request),
    loadOutcomeTopOfBook(details.data.outcomes.yes.tokenId, request),
    loadOutcomeTopOfBook(details.data.outcomes.no.tokenId, request),
    loadOutcomeLastTrade(details.data.outcomes.yes.tokenId, request),
    loadOutcomeLastTrade(details.data.outcomes.no.tokenId, request),
    loadOutcomePriceHistory(
      details.data.outcomes.yes.tokenId,
      priceHistoryQuery,
      request,
    ),
    loadOutcomePriceHistory(
      details.data.outcomes.no.tokenId,
      priceHistoryQuery,
      request,
    ),
  ]);
  return {
    details,
    yesParentMarket,
    noParentMarket,
    resolution,
    tags,
    openInterest,
    midpointComplement,
    yesTopOfBook,
    noTopOfBook,
    yesLastTrade,
    noLastTrade,
    priceChange24h,
    yesPriceHistory24h,
    noPriceHistory24h,
  };
}

function loadOutcomeParentMarket(
  tokenId: string | null,
  request: FetchLike,
): Promise<Resource<PolymarketOutcomeParentMarket>> {
  if (tokenId === null) {
    return Promise.resolve({
      status: 'unavailable',
      message: 'Outcome token is unavailable',
    });
  }
  return loadResource<PolymarketOutcomeParentMarket>(
    dashboardApiPath(
      `/polymarket/outcomes/${encodeURIComponent(tokenId)}/market`,
    ),
    request,
  );
}

export function loadPolymarketRelatedTags(
  tagId: string,
  request: FetchLike = fetch,
): Promise<Resource<PolymarketRelatedTags>> {
  return loadResource<PolymarketRelatedTags>(
    dashboardApiPath(`/polymarket/tags/${encodeURIComponent(tagId)}/related`),
    request,
  );
}

export function loadPolymarketEventDetails(
  eventId: string,
  request: FetchLike = fetch,
): Promise<Resource<PolymarketEventDetails>> {
  return loadResource<PolymarketEventDetails>(
    dashboardApiPath(`/polymarket/events/${encodeURIComponent(eventId)}`),
    request,
  );
}

export function loadPolymarketSearch(
  query: string,
  page: number,
  request: FetchLike = fetch,
): Promise<Resource<PolymarketSearchResult>> {
  const parameters = new URLSearchParams({
    q: query,
    limit: '8',
    page: page.toString(),
  });
  return loadResource<PolymarketSearchResult>(
    dashboardApiPath(`/polymarket/search?${parameters.toString()}`),
    request,
  );
}

export function loadPolymarketEventTags(
  eventId: string,
  request: FetchLike = fetch,
): Promise<Resource<PolymarketEventTags>> {
  return loadResource<PolymarketEventTags>(
    dashboardApiPath(`/polymarket/events/${encodeURIComponent(eventId)}/tags`),
    request,
  );
}

export function loadPolymarketEventLiveVolume(
  eventId: string,
  request: FetchLike = fetch,
): Promise<Resource<PolymarketEventLiveVolume>> {
  return loadResource<PolymarketEventLiveVolume>(
    dashboardApiPath(
      `/polymarket/events/${encodeURIComponent(eventId)}/live-volume`,
    ),
    request,
  );
}

function loadOutcomePriceHistory(
  tokenId: string | null,
  query: URLSearchParams,
  request: FetchLike,
): Promise<Resource<PolymarketPriceHistoryPage>> {
  if (tokenId === null) {
    return Promise.resolve({
      status: 'unavailable',
      message: 'Outcome token is unavailable',
    });
  }
  return loadResource<PolymarketPriceHistoryPage>(
    dashboardApiPath(
      `/polymarket/outcomes/${encodeURIComponent(tokenId)}/price-history?${query.toString()}`,
    ),
    request,
  );
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
