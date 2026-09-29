<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  loadDashboard,
  loadListingPerformance,
  loadPolymarketMarketResearch,
  type DashboardSnapshot,
  type DetectedSpotSymbol,
  type ListingPerformance,
  type PolymarketMarketResearch,
  type PolymarketMarketSummary,
  type Resource,
} from './api';
import {
  createDashboardAutoRefresh,
  DASHBOARD_REFRESH_INTERVAL_MS,
} from './auto-refresh';
import { buildSignalChart } from './signal-chart';
import { buildListingPerformanceChart } from './listing-performance-chart';
import { buildEquityChart } from './equity-chart';
import DashboardChart from './DashboardChart.vue';

const snapshot = ref<DashboardSnapshot | null>(null);
const refreshing = ref(false);
const selectedListing = ref<DetectedSpotSymbol | null>(null);
const listingPerformance = ref<Resource<ListingPerformance> | null>(null);
const listingPerformanceLoading = ref(false);
let listingPerformanceRequest = 0;
const selectedPolymarketMarket = ref<PolymarketMarketSummary | null>(null);
const polymarketResearch = ref<PolymarketMarketResearch | null>(null);
const polymarketResearchLoading = ref(false);
let polymarketResearchRequest = 0;

const apiOnline = computed(() => snapshot.value?.health.status === 'available');
const signalChart = computed(() =>
  snapshot.value?.strategySignals.status === 'available'
    ? buildSignalChart(snapshot.value.strategySignals.data)
    : null,
);
const listingChart = computed(() =>
  listingPerformance.value?.status === 'available'
    ? buildListingPerformanceChart(listingPerformance.value.data)
    : null,
);
const availableListingPerformance = computed(() =>
  listingPerformance.value?.status === 'available'
    ? listingPerformance.value.data
    : null,
);
const listingPerformanceMessage = computed(() => {
  if (listingPerformance.value?.status !== 'unavailable') return null;
  return listingPerformance.value.message === 'Unavailable (503)'
    ? 'Awaiting the durable T+0 observation.'
    : listingPerformance.value.message;
});
const latestBacktest = computed(() =>
  snapshot.value?.backtestRuns.status === 'available'
    ? (snapshot.value.backtestRuns.data[0] ?? null)
    : null,
);
const equityChart = computed(() =>
  latestBacktest.value
    ? buildEquityChart(latestBacktest.value.result.simulation.equity.curve)
    : null,
);

async function refreshListingPerformance(
  listing: DetectedSpotSymbol,
): Promise<void> {
  const request = ++listingPerformanceRequest;
  listingPerformanceLoading.value = true;
  const result = await loadListingPerformance(listing.provider, listing.symbol);
  if (request !== listingPerformanceRequest) return;
  listingPerformance.value = result;
  listingPerformanceLoading.value = false;
}

function selectListing(listing: DetectedSpotSymbol): void {
  selectedListing.value = listing;
  listingPerformance.value = null;
  void refreshListingPerformance(listing);
}

async function refreshPolymarketResearch(
  market: PolymarketMarketSummary,
): Promise<void> {
  const request = ++polymarketResearchRequest;
  polymarketResearchLoading.value = true;
  const result = await loadPolymarketMarketResearch(market.id);
  if (request !== polymarketResearchRequest) return;
  polymarketResearch.value = result;
  polymarketResearchLoading.value = false;
}

function selectPolymarketMarket(market: PolymarketMarketSummary): void {
  selectedPolymarketMarket.value = market;
  polymarketResearch.value = null;
  void refreshPolymarketResearch(market);
}

async function refresh(): Promise<void> {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    snapshot.value = await loadDashboard();
    if (selectedListing.value) {
      await refreshListingPerformance(selectedListing.value);
    }
    if (selectedPolymarketMarket.value) {
      await refreshPolymarketResearch(selectedPolymarketMarket.value);
    }
  } finally {
    refreshing.value = false;
  }
}

const autoRefresh = createDashboardAutoRefresh({
  refresh,
  visibilitySource: document,
});

function refreshNow(): void {
  void autoRefresh.refreshNow();
}

function decimal(value: string | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(parsed);
}

function signed(value: string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return `${parsed > 0 ? '+' : ''}${decimal(value)} USDT`;
}

function tone(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'neutral';
  const parsed = Number(value);
  return parsed > 0 ? 'positive' : parsed < 0 ? 'negative' : 'neutral';
}

function percentage(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return (parsed > 0 ? '+' : '') + (parsed * 100).toFixed(2) + '%';
}

function probability(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return (parsed * 100).toFixed(1) + '%';
}

function timestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(parsed);
}

function available<T>(resource: Resource<T> | undefined): resource is {
  status: 'available';
  data: T;
} {
  return resource?.status === 'available';
}

onMounted(() => autoRefresh.start());
onUnmounted(() => autoRefresh.stop());
</script>

<template>
  <main class="dashboard-shell">
    <header class="topbar">
      <a class="brand" href="#overview" aria-label="Crypto Trader overview">
        <span class="brand-mark" aria-hidden="true">CT</span>
        <span>
          <strong>Crypto Trader</strong>
          <small>Local research terminal</small>
        </span>
      </a>

      <nav class="section-nav" aria-label="Dashboard sections">
        <a href="#overview">Overview</a>
        <a href="#executions">Executions</a>
        <a href="#strategy">Strategy</a>
        <a href="#backtests">Backtests</a>
        <a href="#polymarket">Polymarket</a>
        <a href="#new-listings">New listings</a>
      </nav>

      <div class="topbar-actions">
        <span class="connection" :class="{ online: apiOnline }">
          <i aria-hidden="true"></i>
          {{ apiOnline ? 'Local API online' : 'API unavailable' }}
        </span>
        <span class="refresh-cadence">
          Auto {{ DASHBOARD_REFRESH_INTERVAL_MS / 1000 }}s
        </span>
        <button type="button" :disabled="refreshing" @click="refreshNow">
          {{ refreshing ? 'Refreshing…' : 'Refresh data' }}
        </button>
      </div>
    </header>

    <section id="overview" class="hero">
      <div>
        <p class="eyebrow">Paper environment · Read only</p>
        <h1>Risk first.<br /><em>Evidence always.</em></h1>
        <p class="hero-copy">
          A calm view of fictional capital and measured outcomes. No controls on
          this screen can place an order or move funds.
        </p>
      </div>
      <div class="hero-time">
        <span>Last local refresh</span>
        <strong>
          {{
            snapshot
              ? new Date(snapshot.loadedAt).toLocaleTimeString()
              : 'Waiting for API'
          }}
        </strong>
      </div>
    </section>

    <section class="metric-grid" aria-label="Portfolio overview">
      <article class="metric-card featured">
        <span class="metric-label">Paper portfolio</span>
        <template v-if="available(snapshot?.valuation)">
          <strong class="metric-value">
            {{ decimal(snapshot.valuation.data.totalValue) }}
            <small>USDT</small>
          </strong>
          <p>
            {{ decimal(snapshot.valuation.data.usdtBalance) }} USDT cash ·
            {{ decimal(snapshot.valuation.data.btcBalance, 8) }} BTC
          </p>
        </template>
        <p v-else class="empty-state">
          {{ snapshot?.valuation.message ?? 'Loading valuation…' }}
        </p>
      </article>

      <article class="metric-card">
        <span class="metric-label">Total P&amp;L</span>
        <template v-if="available(snapshot?.position)">
          <strong
            class="metric-value compact"
            :class="tone(snapshot.position.data.totalPnl)"
          >
            {{ signed(snapshot.position.data.totalPnl) }}
          </strong>
          <p>Realized {{ signed(snapshot.position.data.realizedPnl) }}</p>
        </template>
        <p v-else class="empty-state">
          {{ snapshot?.position.message ?? 'Loading position…' }}
        </p>
      </article>

      <article class="metric-card">
        <span class="metric-label">Realized win rate</span>
        <template v-if="available(snapshot?.performance)">
          <strong class="metric-value compact">
            {{
              snapshot.performance.data.winRate === null
                ? '—'
                : `${decimal(String(Number(snapshot.performance.data.winRate) * 100), 1)}%`
            }}
          </strong>
          <p>
            {{ snapshot.performance.data.profitableSellCount }} wins ·
            {{ snapshot.performance.data.losingSellCount }} losses
          </p>
        </template>
        <p v-else class="empty-state">
          {{ snapshot?.performance.message ?? 'Loading performance…' }}
        </p>
      </article>
    </section>

    <section class="detail-grid">
      <article class="panel position-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Current exposure</p>
            <h2>BTC / USDT</h2>
          </div>
          <span class="paper-badge">Paper</span>
        </div>

        <template v-if="available(snapshot?.position)">
          <div class="position-quantity">
            <span>Open quantity</span>
            <strong
              >{{ decimal(snapshot.position.data.quantity, 8) }} BTC</strong
            >
          </div>
          <dl class="detail-list">
            <div>
              <dt>Average entry</dt>
              <dd>
                {{ decimal(snapshot.position.data.averageEntryPrice) }} USDT
              </dd>
            </div>
            <div>
              <dt>Market mark</dt>
              <dd>{{ decimal(snapshot.position.data.markPrice) }} USDT</dd>
            </div>
            <div>
              <dt>Net liquidation</dt>
              <dd>
                {{ decimal(snapshot.position.data.netLiquidationValue) }} USDT
              </dd>
            </div>
            <div>
              <dt>Estimated exit fee</dt>
              <dd>
                {{ decimal(snapshot.position.data.estimatedExitFee) }} USDT
              </dd>
            </div>
          </dl>
        </template>
        <p v-else class="empty-state panel-empty">
          {{ snapshot?.position.message ?? 'Loading position…' }}
        </p>
      </article>

      <article class="panel activity-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Execution record</p>
            <h2>Measured activity</h2>
          </div>
        </div>

        <template v-if="available(snapshot?.performance)">
          <div class="activity-total">
            <strong>{{ snapshot.performance.data.executionCount }}</strong>
            <span>Total fictional executions</span>
          </div>
          <div class="split-bar" aria-hidden="true">
            <i
              :style="{
                width: `${
                  snapshot.performance.data.executionCount === 0
                    ? 50
                    : (snapshot.performance.data.buyExecutionCount /
                        snapshot.performance.data.executionCount) *
                      100
                }%`,
              }"
            ></i>
          </div>
          <div class="split-labels">
            <span
              >Buys
              <b>{{ snapshot.performance.data.buyExecutionCount }}</b></span
            >
            <span
              >Sells
              <b>{{ snapshot.performance.data.sellExecutionCount }}</b></span
            >
          </div>
          <dl class="detail-list condensed">
            <div>
              <dt>Total fees</dt>
              <dd>{{ decimal(snapshot.performance.data.totalFees) }} USDT</dd>
            </div>
            <div>
              <dt>Break-even exits</dt>
              <dd>{{ snapshot.performance.data.breakEvenSellCount }}</dd>
            </div>
          </dl>
        </template>
        <p v-else class="empty-state panel-empty">
          {{ snapshot?.performance.message ?? 'Loading performance…' }}
        </p>
      </article>
    </section>

    <section
      id="executions"
      class="panel execution-panel"
      aria-labelledby="execution-title"
    >
      <div class="panel-heading execution-heading">
        <div>
          <p class="eyebrow">Immutable paper ledger</p>
          <h2 id="execution-title">Recent executions</h2>
        </div>
        <span class="history-limit">Latest 12</span>
      </div>

      <template v-if="available(snapshot?.executions)">
        <p
          v-if="snapshot.executions.data.length === 0"
          class="empty-state execution-empty"
        >
          No fictional executions recorded yet.
        </p>
        <div
          v-else
          class="execution-table"
          role="table"
          aria-label="Recent fictional executions"
        >
          <div class="execution-row execution-header" role="row">
            <span role="columnheader">Side / time</span>
            <span role="columnheader">Quantity</span>
            <span role="columnheader">Price</span>
            <span role="columnheader">Settlement</span>
          </div>
          <div
            v-for="execution in snapshot.executions.data"
            :key="execution.id"
            class="execution-row"
            role="row"
          >
            <span class="execution-identity" role="cell">
              <b :class="execution.side">{{ execution.side }}</b>
              <time :datetime="execution.executedAt">
                {{ timestamp(execution.executedAt) }}
              </time>
            </span>
            <span role="cell">
              <small>Quantity</small>
              {{ decimal(execution.quantity, 8) }} BTC
            </span>
            <span role="cell">
              <small>Price</small>
              {{ decimal(execution.price) }} USDT
            </span>
            <span role="cell">
              <small>
                {{ execution.side === 'buy' ? 'Total cost' : 'Net proceeds' }}
              </small>
              {{
                decimal(
                  execution.side === 'buy'
                    ? execution.totalCost
                    : execution.netProceeds,
                )
              }}
              USDT
            </span>
          </div>
        </div>
      </template>
      <p v-else class="empty-state execution-empty">
        {{ snapshot?.executions.message ?? 'Loading execution history…' }}
      </p>
    </section>

    <section
      id="strategy"
      class="panel strategy-panel"
      aria-labelledby="strategy-title"
    >
      <div class="panel-heading execution-heading">
        <div>
          <p class="eyebrow">Observed only · never executed</p>
          <h2 id="strategy-title">Strategy signal history</h2>
        </div>
        <span class="history-limit">Latest 20 · MA crossover</span>
      </div>

      <template v-if="available(snapshot?.strategySignals)">
        <p
          v-if="snapshot.strategySignals.data.length === 0"
          class="empty-state execution-empty"
        >
          No persisted strategy signals yet.
        </p>
        <template v-else>
          <figure v-if="signalChart" class="signal-chart">
            <div class="signal-chart-legend">
              <span><i class="short-line"></i>Short average</span>
              <span><i class="long-line"></i>Long average</span>
              <small
                >{{ signalChart.minimum }}–{{ signalChart.maximum }} USDT</small
              >
            </div>
            <DashboardChart
              :option="signalChart.option"
              label="Chronological short and long moving-average history"
            />
          </figure>
          <ol class="signal-timeline">
            <li
              v-for="signal in snapshot.strategySignals.data"
              :key="`${signal.strategy}:${signal.latestCandleCloseTime ?? signal.evaluatedAt}`"
              :class="`signal-${signal.action}`"
            >
              <span class="signal-marker" aria-hidden="true"></span>
              <div class="signal-summary">
                <b>{{ signal.action }}</b>
                <time :datetime="signal.evaluatedAt">
                  {{ timestamp(signal.evaluatedAt) }}
                </time>
              </div>
              <div class="signal-averages">
                <span>
                  Short {{ signal.shortPeriod }}
                  <strong>{{ decimal(signal.currentShortAverage) }}</strong>
                </span>
                <span>
                  Long {{ signal.longPeriod }}
                  <strong>{{ decimal(signal.currentLongAverage) }}</strong>
                </span>
              </div>
            </li>
          </ol>
        </template>
      </template>
      <p v-else class="empty-state execution-empty">
        {{ snapshot?.strategySignals.message ?? 'Loading strategy signals…' }}
      </p>
    </section>

    <section
      id="backtests"
      class="panel backtest-panel"
      aria-labelledby="backtest-title"
    >
      <div class="panel-heading execution-heading">
        <div>
          <p class="eyebrow">Immutable historical research</p>
          <h2 id="backtest-title">Latest backtest equity</h2>
        </div>
        <span class="history-limit">Newest saved run</span>
      </div>

      <template v-if="available(snapshot?.backtestRuns)">
        <p
          v-if="snapshot.backtestRuns.data.length === 0"
          class="empty-state execution-empty"
        >
          No persisted backtest run yet.
        </p>
        <template v-else-if="latestBacktest">
          <div class="backtest-context">
            <span>
              {{ latestBacktest.request.symbol }} ·
              {{ latestBacktest.request.interval }}
            </span>
            <span>Saved {{ timestamp(latestBacktest.createdAt) }}</span>
            <span>
              {{ latestBacktest.result.replay.candleCount }} closed candles
            </span>
          </div>

          <figure v-if="equityChart" class="equity-chart">
            <div class="signal-chart-legend">
              <span><i class="equity-line"></i>Fee-adjusted equity</span>
              <small>
                {{ equityChart.minimum }}–{{ equityChart.maximum }} USDT
              </small>
            </div>
            <DashboardChart
              :option="equityChart.option"
              label="Chronological fee-adjusted equity from the latest persisted backtest"
            />
            <figcaption>
              <span>{{ timestamp(latestBacktest.request.startTime) }}</span>
              <span>{{ timestamp(latestBacktest.request.endTime) }}</span>
            </figcaption>
          </figure>

          <div class="backtest-metrics">
            <div>
              <span>Initial capital</span>
              <strong>
                {{
                  decimal(
                    latestBacktest.result.simulation.capital.initialCapitalUsdt,
                  )
                }}
                USDT
              </strong>
            </div>
            <div>
              <span>Final equity</span>
              <strong
                :class="
                  tone(
                    latestBacktest.result.simulation.capital.totalNetReturnUsdt,
                  )
                "
              >
                {{
                  decimal(
                    latestBacktest.result.simulation.capital.finalEquityUsdt,
                  )
                }}
                USDT
              </strong>
            </div>
            <div>
              <span>Total ROI</span>
              <strong
                :class="tone(latestBacktest.result.simulation.capital.totalRoi)"
              >
                {{
                  percentage(latestBacktest.result.simulation.capital.totalRoi)
                }}
              </strong>
            </div>
            <div>
              <span>Maximum drawdown</span>
              <strong class="negative">
                {{
                  percentage(
                    '-' +
                      latestBacktest.result.simulation.equity
                        .maximumPercentageDrawdown.rate,
                  )
                }}
              </strong>
            </div>
            <div>
              <span>Closed trades</span>
              <strong>
                {{
                  latestBacktest.result.simulation.performance.closedTradeCount
                }}
              </strong>
            </div>
            <div>
              <span>Realized win rate</span>
              <strong>
                {{
                  latestBacktest.result.simulation.performance.winRate === null
                    ? '—'
                    : percentage(
                        latestBacktest.result.simulation.performance.winRate,
                      )
                }}
              </strong>
            </div>
          </div>
          <p class="backtest-note">
            Stored simulation snapshot · historical research only · no paper
            wallet effect
          </p>
        </template>
      </template>
      <p v-else class="empty-state execution-empty">
        {{ snapshot?.backtestRuns.message ?? 'Loading stored backtests…' }}
      </p>
    </section>

    <section
      id="polymarket"
      class="panel polymarket-panel"
      aria-labelledby="polymarket-title"
    >
      <div class="panel-heading execution-heading">
        <div>
          <p class="eyebrow">Public prediction-market research</p>
          <h2 id="polymarket-title">Active Polymarket markets</h2>
        </div>
        <span class="history-limit">
          <template v-if="available(snapshot?.polymarketMarkets)">
            {{ snapshot.polymarketMarkets.data.markets.length }} returned
          </template>
          <template v-else>Unavailable</template>
          · read only
        </span>
      </div>

      <template v-if="available(snapshot?.polymarketMarkets)">
        <p
          v-if="snapshot.polymarketMarkets.data.markets.length === 0"
          class="empty-state execution-empty"
        >
          No active public markets returned.
        </p>
        <div v-else class="polymarket-grid">
          <button
            v-for="market in snapshot.polymarketMarkets.data.markets"
            :key="market.id"
            type="button"
            class="polymarket-card"
            :class="{ selected: selectedPolymarketMarket?.id === market.id }"
            :aria-pressed="selectedPolymarketMarket?.id === market.id"
            @click="selectPolymarketMarket(market)"
          >
            <span>Market {{ market.id }}</span>
            <strong>{{
              market.question ?? market.slug ?? 'Untitled market'
            }}</strong>
            <small>{{
              market.conditionId ? 'Condition available' : 'Awaiting condition'
            }}</small>
          </button>
        </div>

        <article
          v-if="selectedPolymarketMarket"
          class="polymarket-research"
          aria-live="polite"
        >
          <div class="listing-research-heading">
            <div>
              <p class="eyebrow">Selected public market</p>
              <h3>
                {{
                  selectedPolymarketMarket.question ??
                  selectedPolymarketMarket.slug ??
                  `Market ${selectedPolymarketMarket.id}`
                }}
              </h3>
            </div>
            <span>Non-executable</span>
          </div>

          <p
            v-if="polymarketResearchLoading"
            class="empty-state polymarket-state"
          >
            Loading market identity and statistics…
          </p>
          <div v-else-if="polymarketResearch" class="polymarket-stat-grid">
            <div>
              <span>YES midpoint</span>
              <strong v-if="available(polymarketResearch.midpointComplement)">
                {{
                  probability(
                    polymarketResearch.midpointComplement.data.outcomes.yes
                      .price,
                  )
                }}
              </strong>
              <small v-else>{{
                polymarketResearch.midpointComplement.message
              }}</small>
            </div>
            <div>
              <span>NO midpoint</span>
              <strong v-if="available(polymarketResearch.midpointComplement)">
                {{
                  probability(
                    polymarketResearch.midpointComplement.data.outcomes.no
                      .price,
                  )
                }}
              </strong>
              <small v-else>{{
                polymarketResearch.midpointComplement.message
              }}</small>
            </div>
            <div>
              <span>Open interest</span>
              <strong v-if="available(polymarketResearch.openInterest)">
                {{
                  decimal(polymarketResearch.openInterest.data.openInterestUsdc)
                }}
                USDC
              </strong>
              <small v-else>{{
                polymarketResearch.openInterest.message
              }}</small>
            </div>
            <div>
              <span>Outcome identities</span>
              <strong v-if="available(polymarketResearch.details)">
                {{ polymarketResearch.details.data.outcomes.yes.label }} /
                {{ polymarketResearch.details.data.outcomes.no.label }}
              </strong>
              <small v-else>{{ polymarketResearch.details.message }}</small>
            </div>
          </div>
          <div v-if="polymarketResearch" class="polymarket-book-grid">
            <article
              v-for="book in [
                { label: 'YES', resource: polymarketResearch.yesTopOfBook },
                { label: 'NO', resource: polymarketResearch.noTopOfBook },
              ]"
              :key="book.label"
              class="polymarket-book"
            >
              <div class="polymarket-book-heading">
                <span>{{ book.label }} top of book</span>
                <small>Public level 1</small>
              </div>
              <template v-if="available(book.resource)">
                <div>
                  <span>Best bid</span>
                  <strong v-if="book.resource.data.bid">
                    {{ probability(book.resource.data.bid.price) }} ·
                    {{ decimal(book.resource.data.bid.quantity, 4) }} shares
                  </strong>
                  <strong v-else>No bid</strong>
                </div>
                <div>
                  <span>Best ask</span>
                  <strong v-if="book.resource.data.ask">
                    {{ probability(book.resource.data.ask.price) }} ·
                    {{ decimal(book.resource.data.ask.quantity, 4) }} shares
                  </strong>
                  <strong v-else>No ask</strong>
                </div>
                <div>
                  <span>Spread</span>
                  <strong>
                    {{
                      book.resource.data.spread === null
                        ? 'Unavailable'
                        : probability(book.resource.data.spread)
                    }}
                  </strong>
                </div>
              </template>
              <p v-else>{{ book.resource.message }}</p>
            </article>
          </div>
          <p class="polymarket-note">
            Midpoints and level-one books are independent observations, not
            executable quotes, depth, fill guarantees, or recommendations.
          </p>
        </article>
      </template>
      <p v-else class="empty-state execution-empty">
        {{
          snapshot?.polymarketMarkets.message ??
          'Loading public Polymarket markets…'
        }}
      </p>
    </section>

    <section
      id="new-listings"
      class="panel listings-panel"
      aria-labelledby="listings-title"
    >
      <div class="panel-heading execution-heading">
        <div>
          <p class="eyebrow">Application detections</p>
          <h2 id="listings-title">Recent new listings</h2>
        </div>
        <span class="history-limit">Latest 8</span>
      </div>

      <template v-if="available(snapshot?.newListings)">
        <p
          v-if="snapshot.newListings.data.length === 0"
          class="empty-state execution-empty"
        >
          No post-baseline listings detected yet.
        </p>
        <div v-else class="listing-grid">
          <article
            v-for="listing in snapshot.newListings.data"
            :key="`${listing.provider}:${listing.symbol}`"
            class="listing-card"
          >
            <div>
              <span class="listing-provider">{{ listing.provider }}</span>
              <strong>{{ listing.baseAsset }}</strong>
              <small>/ {{ listing.quoteAsset }}</small>
            </div>
            <dl>
              <div>
                <dt>Detected</dt>
                <dd>{{ timestamp(listing.detectedAt) }}</dd>
              </div>
              <div>
                <dt>Provider status</dt>
                <dd>{{ listing.status }}</dd>
              </div>
            </dl>
            <span
              class="trading-state"
              :class="{ enabled: listing.spotTradingAllowed }"
            >
              {{
                listing.spotTradingAllowed
                  ? 'Spot available'
                  : 'Spot unavailable'
              }}
            </span>
            <button
              type="button"
              class="listing-research-button"
              :class="{
                selected: selectedListing?.symbol === listing.symbol,
              }"
              :aria-pressed="selectedListing?.symbol === listing.symbol"
              @click="selectListing(listing)"
            >
              {{
                selectedListing?.symbol === listing.symbol
                  ? 'Research selected'
                  : 'View T+0 research'
              }}
            </button>
          </article>
        </div>
        <article
          v-if="selectedListing"
          class="listing-research"
          aria-live="polite"
        >
          <div class="listing-research-heading">
            <div>
              <p class="eyebrow">Observed checkpoint path</p>
              <h3>{{ selectedListing.symbol }} after T+0</h3>
            </div>
            <span>Descriptive only</span>
          </div>

          <p
            v-if="listingPerformanceLoading"
            class="empty-state listing-research-state"
          >
            Loading durable checkpoint research…
          </p>
          <template v-else-if="availableListingPerformance">
            <figure v-if="listingChart" class="listing-performance-chart">
              <div class="signal-chart-legend">
                <span><i class="performance-line"></i>Return from T+0</span>
                <small>
                  {{ listingChart.minimumPercent }}%–{{
                    listingChart.maximumPercent
                  }}%
                </small>
              </div>
              <DashboardChart
                :option="listingChart.option"
                :label="
                  selectedListing.symbol +
                  ' checkpoint return history relative to T+0'
                "
              />
            </figure>
            <div class="checkpoint-grid">
              <div
                v-for="point in availableListingPerformance.points"
                :key="point.label"
                class="checkpoint-card"
              >
                <strong>{{ point.label }}</strong>
                <span :class="tone(point.priceReturnRate)">
                  {{ percentage(point.priceReturnRate) }}
                </span>
                <small>{{ decimal(point.lastPrice, 8) }} USDT</small>
              </div>
            </div>
            <p class="listing-baseline">
              T+0 baseline:
              {{ decimal(availableListingPerformance.baselinePrice, 8) }} USDT
            </p>
          </template>
          <p v-else class="empty-state listing-research-state">
            {{
              listingPerformanceMessage ??
              'Select a listing to load checkpoint research.'
            }}
          </p>
        </article>
      </template>
      <p v-else class="empty-state execution-empty">
        {{ snapshot?.newListings.message ?? 'Loading new listings…' }}
      </p>
    </section>

    <footer>
      <span>Research surface · no real funds</span>
      <span>Data remains local to this machine</span>
    </footer>
  </main>
</template>
