<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  loadDashboard,
  loadListingPerformance,
  loadPolymarketEventDetails,
  loadPolymarketEventLiveVolume,
  loadPolymarketEventTags,
  loadPolymarketMarketResearch,
  loadPolymarketRelatedTags,
  updatePolymarketSettings,
  type DashboardSnapshot,
  type DetectedSpotSymbol,
  type ListingPerformance,
  type PolymarketEventDetails,
  type PolymarketEventLiveVolume,
  type PolymarketEventSummary,
  type PolymarketEventTags,
  type PolymarketMarketResearch,
  type PolymarketMarketSummary,
  type PolymarketMarketTag,
  type PolymarketRelatedTags,
  type Resource,
} from './api';
import {
  createDashboardAutoRefresh,
  DASHBOARD_REFRESH_INTERVAL_MS,
} from './auto-refresh';
import { buildSignalChart } from './signal-chart';
import { buildListingPerformanceChart } from './listing-performance-chart';
import { buildEquityChart } from './equity-chart';
import { buildPolymarketPriceChart } from './polymarket-price-chart';
import { polymarketMidpointComplementStatusLabel } from './polymarket-midpoint-complement';
import { polymarketHistoricalAlignmentLabel } from './polymarket-price-change-context';
import { buildPolymarketPriceChangeObservationRows } from './polymarket-price-change-observations';
import { buildPolymarketEventMarketRows } from './polymarket-event-markets';
import { buildPolymarketEventVolumeRows } from './polymarket-event-volume';
import DashboardChart from './DashboardChart.vue';
import {
  dashboardRouteFromHash,
  dashboardRouteHref,
  type DashboardRoute,
} from './dashboard-route';

const currentRoute = ref<DashboardRoute>(
  dashboardRouteFromHash(window.location.hash),
);

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
const selectedPolymarketEvent = ref<PolymarketEventSummary | null>(null);
const polymarketEventDetails = ref<Resource<PolymarketEventDetails> | null>(
  null,
);
const polymarketEventTags = ref<Resource<PolymarketEventTags> | null>(null);
const polymarketEventLiveVolume =
  ref<Resource<PolymarketEventLiveVolume> | null>(null);
const polymarketEventDetailsLoading = ref(false);
let polymarketEventDetailsRequest = 0;
const selectedPolymarketTag = ref<PolymarketMarketTag | null>(null);
const relatedPolymarketTags = ref<Resource<PolymarketRelatedTags> | null>(null);
const relatedPolymarketTagsLoading = ref(false);
let relatedPolymarketTagsRequest = 0;
const polymarketAccessConfirmed = ref(false);
const polymarketSettingsUpdating = ref(false);
const polymarketSettingsMessage = ref<string | null>(null);

const apiOnline = computed(() => snapshot.value?.health.status === 'available');
const availableRelatedPolymarketTags = computed(() =>
  relatedPolymarketTags.value?.status === 'available'
    ? relatedPolymarketTags.value.data
    : null,
);
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
const polymarketPriceChart = computed(() => {
  const research = polymarketResearch.value;
  if (!research) return null;
  return buildPolymarketPriceChart(
    available(research.yesPriceHistory24h)
      ? research.yesPriceHistory24h.data
      : null,
    available(research.noPriceHistory24h)
      ? research.noPriceHistory24h.data
      : null,
  );
});
const polymarketPriceChangeObservationRows = computed(() => {
  const research = polymarketResearch.value;
  return research && available(research.priceChange24h)
    ? buildPolymarketPriceChangeObservationRows(research.priceChange24h.data)
    : [];
});
const polymarketEventMarketRows = computed(() =>
  available(polymarketEventDetails.value)
    ? buildPolymarketEventMarketRows(polymarketEventDetails.value.data)
    : [],
);
const polymarketEventVolumeRows = computed(() =>
  available(polymarketEventLiveVolume.value)
    ? buildPolymarketEventVolumeRows(polymarketEventLiveVolume.value.data)
    : [],
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
  if (selectedPolymarketTag.value) {
    const tagStillAttached =
      available(result.tags) &&
      result.tags.data.tags.some(
        (tag) => tag.id === selectedPolymarketTag.value?.id,
      );
    if (tagStillAttached) {
      await refreshRelatedPolymarketTags(selectedPolymarketTag.value);
    } else {
      clearPolymarketTagSelection();
    }
  }
}

function selectPolymarketMarket(market: PolymarketMarketSummary): void {
  selectedPolymarketMarket.value = market;
  polymarketResearch.value = null;
  clearPolymarketTagSelection();
  void refreshPolymarketResearch(market);
}

async function refreshPolymarketEventDetails(
  event: PolymarketEventSummary,
): Promise<void> {
  const request = ++polymarketEventDetailsRequest;
  polymarketEventDetailsLoading.value = true;
  const [details, tags, liveVolume] = await Promise.all([
    loadPolymarketEventDetails(event.id),
    loadPolymarketEventTags(event.id),
    loadPolymarketEventLiveVolume(event.id),
  ]);
  if (request !== polymarketEventDetailsRequest) return;
  polymarketEventDetails.value = details;
  polymarketEventTags.value = tags;
  polymarketEventLiveVolume.value = liveVolume;
  polymarketEventDetailsLoading.value = false;
}

function selectPolymarketEvent(event: PolymarketEventSummary): void {
  selectedPolymarketEvent.value = event;
  polymarketEventDetails.value = null;
  polymarketEventTags.value = null;
  polymarketEventLiveVolume.value = null;
  void refreshPolymarketEventDetails(event);
}

function clearPolymarketEventSelection(): void {
  selectedPolymarketEvent.value = null;
  polymarketEventDetails.value = null;
  polymarketEventTags.value = null;
  polymarketEventLiveVolume.value = null;
  polymarketEventDetailsLoading.value = false;
  polymarketEventDetailsRequest += 1;
}

async function refreshRelatedPolymarketTags(
  tag: PolymarketMarketTag,
): Promise<void> {
  const request = ++relatedPolymarketTagsRequest;
  relatedPolymarketTagsLoading.value = true;
  const result = await loadPolymarketRelatedTags(tag.id);
  if (request !== relatedPolymarketTagsRequest) return;
  relatedPolymarketTags.value = result;
  relatedPolymarketTagsLoading.value = false;
}

function selectPolymarketTag(tag: PolymarketMarketTag): void {
  selectedPolymarketTag.value = tag;
  relatedPolymarketTags.value = null;
  void refreshRelatedPolymarketTags(tag);
}

function clearPolymarketTagSelection(): void {
  selectedPolymarketTag.value = null;
  relatedPolymarketTags.value = null;
  relatedPolymarketTagsLoading.value = false;
  relatedPolymarketTagsRequest += 1;
}

async function changePolymarketAvailability(enabled: boolean): Promise<void> {
  if (polymarketSettingsUpdating.value) return;
  polymarketSettingsUpdating.value = true;
  polymarketSettingsMessage.value = null;
  try {
    const result = await updatePolymarketSettings(
      enabled,
      enabled && polymarketAccessConfirmed.value,
    );
    if (result.status === 'unavailable') {
      polymarketSettingsMessage.value = result.message;
      return;
    }
    if (snapshot.value) snapshot.value.polymarketSettings = result;
    polymarketAccessConfirmed.value = false;
    if (!enabled) {
      clearPolymarketEventSelection();
      selectedPolymarketMarket.value = null;
      polymarketResearch.value = null;
      polymarketResearchRequest += 1;
      clearPolymarketTagSelection();
    }
    await refresh();
  } finally {
    polymarketSettingsUpdating.value = false;
  }
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
    if (selectedPolymarketEvent.value) {
      await refreshPolymarketEventDetails(selectedPolymarketEvent.value);
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

function probabilityChange(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return `${parsed > 0 ? '+' : ''}${(parsed * 100).toFixed(1)} pp`;
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

function available<T>(resource: Resource<T> | null | undefined): resource is {
  status: 'available';
  data: T;
} {
  return resource?.status === 'available';
}

function unavailableMessage<T>(resource: Resource<T>): string {
  return resource.status === 'unavailable'
    ? resource.message
    : 'Resource is unavailable';
}

function syncRoute(): void {
  currentRoute.value = dashboardRouteFromHash(window.location.hash);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

onMounted(() => {
  window.addEventListener('hashchange', syncRoute);
  autoRefresh.start();
});
onUnmounted(() => {
  window.removeEventListener('hashchange', syncRoute);
  autoRefresh.stop();
});
</script>

<template>
  <main class="dashboard-shell">
    <aside class="sidebar">
      <a
        class="brand"
        :href="dashboardRouteHref('overview')"
        aria-label="Crypto Trader overview"
      >
        <span class="brand-mark" aria-hidden="true">CT</span>
        <span>
          <strong>Crypto Trader</strong>
          <small>Local research terminal</small>
        </span>
      </a>

      <nav class="section-nav" aria-label="Dashboard pages">
        <a
          :href="dashboardRouteHref('overview')"
          :class="{ active: currentRoute === 'overview' }"
          :aria-current="currentRoute === 'overview' ? 'page' : undefined"
        >
          <span aria-hidden="true">01</span> Overview
        </a>
        <a
          :href="dashboardRouteHref('polymarket')"
          :class="{ active: currentRoute === 'polymarket' }"
          :aria-current="currentRoute === 'polymarket' ? 'page' : undefined"
        >
          <span aria-hidden="true">02</span> Polymarket
        </a>
        <a
          :href="dashboardRouteHref('new-listings')"
          :class="{ active: currentRoute === 'new-listings' }"
          :aria-current="currentRoute === 'new-listings' ? 'page' : undefined"
        >
          <span aria-hidden="true">03</span> New listings
        </a>
      </nav>

      <div class="sidebar-status">
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
      <p class="sidebar-safety">Read-only research. No real funds.</p>
    </aside>

    <div class="dashboard-content">
      <template v-if="currentRoute === 'overview'">
        <section id="overview" class="hero">
          <div>
            <p class="eyebrow">Paper environment · Read only</p>
            <h1>Risk first.<br /><em>Evidence always.</em></h1>
            <p class="hero-copy">
              A calm view of fictional capital and measured outcomes. No
              controls on this screen can place an order or move funds.
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
                    {{ decimal(snapshot.position.data.netLiquidationValue) }}
                    USDT
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
                  <b>{{
                    snapshot.performance.data.sellExecutionCount
                  }}</b></span
                >
              </div>
              <dl class="detail-list condensed">
                <div>
                  <dt>Total fees</dt>
                  <dd>
                    {{ decimal(snapshot.performance.data.totalFees) }} USDT
                  </dd>
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
                    {{
                      execution.side === 'buy' ? 'Total cost' : 'Net proceeds'
                    }}
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
                    >{{ signalChart.minimum }}–{{
                      signalChart.maximum
                    }}
                    USDT</small
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
            {{
              snapshot?.strategySignals.message ?? 'Loading strategy signals…'
            }}
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
                        latestBacktest.result.simulation.capital
                          .initialCapitalUsdt,
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
                        latestBacktest.result.simulation.capital
                          .totalNetReturnUsdt,
                      )
                    "
                  >
                    {{
                      decimal(
                        latestBacktest.result.simulation.capital
                          .finalEquityUsdt,
                      )
                    }}
                    USDT
                  </strong>
                </div>
                <div>
                  <span>Total ROI</span>
                  <strong
                    :class="
                      tone(latestBacktest.result.simulation.capital.totalRoi)
                    "
                  >
                    {{
                      percentage(
                        latestBacktest.result.simulation.capital.totalRoi,
                      )
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
                      latestBacktest.result.simulation.performance
                        .closedTradeCount
                    }}
                  </strong>
                </div>
                <div>
                  <span>Realized win rate</span>
                  <strong>
                    {{
                      latestBacktest.result.simulation.performance.winRate ===
                      null
                        ? '—'
                        : percentage(
                            latestBacktest.result.simulation.performance
                              .winRate,
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
      </template>

      <template v-else-if="currentRoute === 'polymarket'">
        <header class="page-heading">
          <div>
            <p class="eyebrow">Prediction-market intelligence</p>
            <h1>Polymarket</h1>
            <p>
              Public market context, liquidity and price history in one focused
              research workspace.
            </p>
          </div>
          <span>Public data · non-executable</span>
        </header>

        <section
          id="polymarket"
          class="panel polymarket-panel"
          aria-labelledby="polymarket-title"
        >
          <div class="panel-heading execution-heading">
            <div>
              <p class="eyebrow">Public prediction-market research</p>
              <h2 id="polymarket-title">Polymarket research</h2>
            </div>
            <span class="history-limit">Public data · read only</span>
          </div>

          <div
            v-if="available(snapshot?.polymarketSettings)"
            class="polymarket-access"
            :class="{ enabled: snapshot.polymarketSettings.data.enabled }"
          >
            <div>
              <span>Provider access</span>
              <strong>
                {{
                  snapshot.polymarketSettings.data.enabled
                    ? 'Enabled for this API process'
                    : 'Disabled — no provider requests'
                }}
              </strong>
              <small>
                {{
                  snapshot.polymarketSettings.data.source === 'runtime'
                    ? 'Runtime override; resets when the API restarts.'
                    : 'Using the safe startup configuration.'
                }}
              </small>
            </div>
            <label v-if="!snapshot.polymarketSettings.data.enabled">
              <input v-model="polymarketAccessConfirmed" type="checkbox" />
              <span
                >I confirm local access is permitted and the required VPN is
                active.</span
              >
            </label>
            <button
              v-if="snapshot.polymarketSettings.data.enabled"
              type="button"
              :disabled="polymarketSettingsUpdating"
              @click="changePolymarketAvailability(false)"
            >
              {{ polymarketSettingsUpdating ? 'Updating…' : 'Disable access' }}
            </button>
            <button
              v-else
              type="button"
              :disabled="
                polymarketSettingsUpdating || !polymarketAccessConfirmed
              "
              @click="changePolymarketAvailability(true)"
            >
              {{ polymarketSettingsUpdating ? 'Updating…' : 'Enable access' }}
            </button>
            <p v-if="polymarketSettingsMessage" role="alert">
              {{ polymarketSettingsMessage }}
            </p>
          </div>
          <p v-else class="empty-state polymarket-access-unavailable">
            {{
              snapshot?.polymarketSettings.message ??
              'Loading local Polymarket settings…'
            }}
          </p>

          <div
            v-if="available(snapshot?.polymarketDataFreshness)"
            class="polymarket-freshness"
          >
            <div>
              <span>Data API snapshot age</span>
              <strong>
                {{
                  decimal(
                    String(
                      snapshot.polymarketDataFreshness.data.snapshotAgeSeconds,
                    ),
                    0,
                  )
                }}s
              </strong>
              <small>
                Computed
                {{
                  timestamp(snapshot.polymarketDataFreshness.data.computedAt)
                }}
              </small>
            </div>
            <div>
              <span>Serving lag</span>
              <strong>
                {{
                  decimal(
                    String(
                      snapshot.polymarketDataFreshness.data.serving.lagSeconds,
                    ),
                    0,
                  )
                }}s
              </strong>
              <small>
                Worst mechanism:
                {{ snapshot.polymarketDataFreshness.data.serving.worst }}
              </small>
            </div>
            <div>
              <span>Ingestion lag</span>
              <strong>
                {{
                  snapshot.polymarketDataFreshness.data.ingestion.mostLagged
                    .behindMax
                }}
                blocks
              </strong>
              <small>
                {{
                  snapshot.polymarketDataFreshness.data.ingestion.mostLagged
                    .source
                }}
                · {{ snapshot.polymarketDataFreshness.data.ingestion.network }}
              </small>
            </div>
            <div>
              <span>Coverage</span>
              <strong>
                {{
                  snapshot.polymarketDataFreshness.data.ingestion.cursorCount
                }}
                cursors
              </strong>
              <small>Public Data API status · not local health</small>
            </div>
          </div>
          <p v-else class="empty-state polymarket-freshness-unavailable">
            Data API freshness:
            {{
              snapshot?.polymarketDataFreshness.message ??
              'Loading provider freshness…'
            }}
          </p>

          <div
            v-if="available(snapshot?.polymarketGlobalOpenInterest)"
            class="polymarket-global-interest"
          >
            <div>
              <span>Platform open interest</span>
              <strong>
                {{
                  decimal(
                    snapshot.polymarketGlobalOpenInterest.data.openInterestUsdc,
                  )
                }}
                USDC
              </strong>
              <small>
                Public Data API aggregate · received
                {{
                  timestamp(
                    snapshot.polymarketGlobalOpenInterest.data.receivedAt,
                  )
                }}
              </small>
            </div>
            <p>
              Platform-wide measurement, separate from the selected market. It
              is descriptive and non-executable.
            </p>
          </div>
          <p v-else class="empty-state polymarket-global-interest-unavailable">
            Platform open interest:
            {{
              snapshot?.polymarketGlobalOpenInterest.message ??
              'Loading platform aggregate…'
            }}
          </p>

          <div class="polymarket-section-heading">
            <div>
              <span>Event discovery</span>
              <h3>Active events</h3>
            </div>
            <small v-if="available(snapshot?.polymarketEvents)">
              {{ snapshot.polymarketEvents.data.events.length }} returned ·
              latest bounded page
            </small>
            <small v-else>Independent resource unavailable</small>
          </div>

          <template v-if="available(snapshot?.polymarketEvents)">
            <p
              v-if="snapshot.polymarketEvents.data.events.length === 0"
              class="empty-state polymarket-discovery-empty"
            >
              No active public events returned.
            </p>
            <div v-else class="polymarket-event-grid">
              <button
                v-for="event in snapshot.polymarketEvents.data.events"
                :key="event.id"
                type="button"
                class="polymarket-event-card"
                :class="{
                  selected: selectedPolymarketEvent?.id === event.id,
                }"
                :aria-pressed="selectedPolymarketEvent?.id === event.id"
                @click="selectPolymarketEvent(event)"
              >
                <div>
                  <span>Event {{ event.id }}</span>
                  <span v-if="event.restricted">Restricted</span>
                </div>
                <strong>{{ event.title }}</strong>
                <dl>
                  <div>
                    <dt>Starts</dt>
                    <dd>
                      {{ event.startDate ? timestamp(event.startDate) : '—' }}
                    </dd>
                  </div>
                  <div>
                    <dt>Ends</dt>
                    <dd>
                      {{ event.endDate ? timestamp(event.endDate) : '—' }}
                    </dd>
                  </div>
                </dl>
              </button>
            </div>
          </template>
          <p v-else class="empty-state polymarket-discovery-empty">
            {{
              snapshot?.polymarketEvents.message ??
              'Loading active public events…'
            }}
          </p>

          <article
            v-if="selectedPolymarketEvent"
            class="polymarket-event-detail"
            aria-live="polite"
          >
            <div class="listing-research-heading">
              <div>
                <p class="eyebrow">Selected public event</p>
                <h3>{{ selectedPolymarketEvent.title }}</h3>
              </div>
              <span>Identity and lifecycle only</span>
            </div>

            <p
              v-if="polymarketEventDetailsLoading"
              class="empty-state polymarket-state"
            >
              Loading public event details…
            </p>
            <template v-else-if="available(polymarketEventDetails)">
              <p class="polymarket-event-description">
                {{
                  polymarketEventDetails.data.description ??
                  'No public description supplied.'
                }}
              </p>
              <dl class="polymarket-event-facts">
                <div>
                  <dt>Lifecycle</dt>
                  <dd>
                    {{
                      polymarketEventDetails.data.closed
                        ? 'Closed'
                        : polymarketEventDetails.data.active
                          ? 'Active'
                          : 'Inactive'
                    }}
                  </dd>
                </div>
                <div>
                  <dt>Referenced markets</dt>
                  <dd>{{ polymarketEventDetails.data.markets.length }}</dd>
                </div>
                <div>
                  <dt>Resolution source</dt>
                  <dd>
                    {{
                      polymarketEventDetails.data.resolutionSource ??
                      'Not supplied'
                    }}
                  </dd>
                </div>
                <div>
                  <dt>Received locally</dt>
                  <dd>
                    {{ timestamp(polymarketEventDetails.data.receivedAt) }}
                  </dd>
                </div>
              </dl>
              <p class="polymarket-note">
                Market references remain descriptive. This view does not load
                their prices, liquidity, volume, or outcome data.
              </p>
              <div class="polymarket-event-markets">
                <div>
                  <span>Referenced market sample</span>
                  <small>
                    {{ polymarketEventMarketRows.length }} of
                    {{ polymarketEventDetails.data.markets.length }} shown
                  </small>
                </div>
                <p v-if="polymarketEventMarketRows.length === 0">
                  No market references returned for this event.
                </p>
                <div v-else class="polymarket-event-market-grid">
                  <article
                    v-for="market in polymarketEventMarketRows"
                    :key="market.id"
                  >
                    <div>
                      <span>Market {{ market.id }}</span>
                      <span :class="{ closed: market.closed }">
                        {{ market.closed ? 'Closed' : 'Open' }}
                      </span>
                    </div>
                    <strong>{{ market.label }}</strong>
                  </article>
                </div>
              </div>
            </template>
            <p v-else class="empty-state polymarket-state">
              {{
                polymarketEventDetails?.message ??
                'Select an event to load public details.'
              }}
            </p>

            <div class="polymarket-event-taxonomy">
              <span>Direct event taxonomy</span>
              <template v-if="available(polymarketEventTags)">
                <p v-if="polymarketEventTags.data.tags.length === 0">
                  No direct tags returned for this event.
                </p>
                <div v-else class="polymarket-tag-list">
                  <span
                    v-for="tag in polymarketEventTags.data.tags"
                    :key="tag.id"
                    class="polymarket-related-tag"
                  >
                    {{ tag.label ?? tag.slug ?? `Tag ${tag.id}` }}
                  </span>
                </div>
              </template>
              <p v-else>
                {{
                  polymarketEventDetailsLoading
                    ? 'Loading direct event tagsâ€¦'
                    : (polymarketEventTags?.message ??
                      'Direct event taxonomy is unavailable.')
                }}
              </p>
            </div>

            <div class="polymarket-event-volume">
              <span>Public live-volume observation</span>
              <template v-if="available(polymarketEventLiveVolume)">
                <dl>
                  <div>
                    <dt>Total taker volume</dt>
                    <dd>
                      {{
                        decimal(
                          polymarketEventLiveVolume.data.takerVolumeTotalShares,
                        )
                      }}
                      shares
                    </dd>
                  </div>
                  <div>
                    <dt>Reported market rows</dt>
                    <dd>{{ polymarketEventLiveVolume.data.markets.length }}</dd>
                  </div>
                  <div>
                    <dt>Received locally</dt>
                    <dd>
                      {{ timestamp(polymarketEventLiveVolume.data.receivedAt) }}
                    </dd>
                  </div>
                </dl>
                <div class="polymarket-event-volume-breakdown">
                  <div>
                    <span>Leading market rows</span>
                    <small>
                      {{ polymarketEventVolumeRows.length }} of
                      {{ polymarketEventLiveVolume.data.markets.length }} shown
                    </small>
                  </div>
                  <p v-if="polymarketEventVolumeRows.length === 0">
                    No market volume rows returned.
                  </p>
                  <div v-else class="polymarket-event-volume-list">
                    <article
                      v-for="(row, index) in polymarketEventVolumeRows"
                      :key="row.conditionId ?? `unidentified-${index}`"
                    >
                      <div>
                        <span>{{
                          row.marketId
                            ? `Market ${row.marketId}`
                            : 'No market identity'
                        }}</span>
                        <strong
                          >{{ decimal(row.takerVolumeShares) }} shares</strong
                        >
                      </div>
                      <p>{{ row.label }}</p>
                    </article>
                  </div>
                </div>
                <p>
                  Provider aggregate in shares, not USDC turnover. No trade,
                  holder, position, or executable-price detail is shown.
                </p>
              </template>
              <p v-else>
                {{
                  polymarketEventDetailsLoading
                    ? 'Loading public event volumeâ€¦'
                    : (polymarketEventLiveVolume?.message ??
                      'Public event volume is unavailable.')
                }}
              </p>
            </div>
          </article>

          <div class="polymarket-section-heading market-heading">
            <div>
              <span>Market discovery</span>
              <h3>Active markets</h3>
            </div>
            <small v-if="available(snapshot?.polymarketMarkets)">
              {{ snapshot.polymarketMarkets.data.markets.length }} returned ·
              select one for detail
            </small>
            <small v-else>Independent resource unavailable</small>
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
                :class="{
                  selected: selectedPolymarketMarket?.id === market.id,
                }"
                :aria-pressed="selectedPolymarketMarket?.id === market.id"
                @click="selectPolymarketMarket(market)"
              >
                <span>Market {{ market.id }}</span>
                <strong>{{
                  market.question ?? market.slug ?? 'Untitled market'
                }}</strong>
                <small>{{
                  market.conditionId
                    ? 'Condition available'
                    : 'Awaiting condition'
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
                  <strong
                    v-if="available(polymarketResearch.midpointComplement)"
                  >
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
                  <strong
                    v-if="available(polymarketResearch.midpointComplement)"
                  >
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
                      decimal(
                        polymarketResearch.openInterest.data.openInterestUsdc,
                      )
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
              <div
                v-if="
                  polymarketResearch &&
                  available(polymarketResearch.midpointComplement)
                "
                class="polymarket-midpoint-complement"
                aria-label="Binary midpoint relationship"
              >
                <div>
                  <span>Midpoint sum</span>
                  <strong>
                    {{ polymarketResearch.midpointComplement.data.midpointSum }}
                  </strong>
                  <small>
                    {{
                      probability(
                        polymarketResearch.midpointComplement.data.midpointSum,
                      )
                    }}
                  </small>
                </div>
                <div>
                  <span>Deviation from one</span>
                  <strong>
                    {{
                      polymarketResearch.midpointComplement.data
                        .deviationFromOne
                    }}
                  </strong>
                  <small>
                    {{
                      probabilityChange(
                        polymarketResearch.midpointComplement.data
                          .deviationFromOne,
                      )
                    }}
                  </small>
                </div>
                <div>
                  <span>Relationship</span>
                  <strong>
                    {{
                      polymarketMidpointComplementStatusLabel(
                        polymarketResearch.midpointComplement.data.status,
                      )
                    }}
                  </strong>
                  <small
                    >Independent receipts · non-atomic · non-executable</small
                  >
                </div>
              </div>
              <p
                v-else-if="
                  polymarketResearch &&
                  !available(polymarketResearch.midpointComplement)
                "
                class="empty-state polymarket-midpoint-complement-unavailable"
              >
                Binary midpoint relationship:
                {{ polymarketResearch.midpointComplement.message }}
              </p>
              <div
                v-if="polymarketResearch && available(polymarketResearch.tags)"
                class="polymarket-tags"
              >
                <span>Direct market taxonomy</span>
                <p v-if="polymarketResearch.tags.data.tags.length === 0">
                  No tags attached to this market.
                </p>
                <ul
                  v-else
                  aria-label="Tags directly attached to selected market"
                >
                  <li
                    v-for="tag in polymarketResearch.tags.data.tags"
                    :key="tag.id"
                  >
                    <button
                      type="button"
                      :class="{
                        selected: selectedPolymarketTag?.id === tag.id,
                      }"
                      :aria-pressed="selectedPolymarketTag?.id === tag.id"
                      :title="`Inspect tags related to Polymarket tag ${tag.id}`"
                      @click="selectPolymarketTag(tag)"
                    >
                      {{ tag.label ?? tag.slug ?? `Tag ${tag.id}` }}
                    </button>
                  </li>
                </ul>
                <small
                  >Choose one direct tag to inspect one relationship
                  level</small
                >
                <div
                  v-if="selectedPolymarketTag"
                  class="polymarket-related-tags"
                >
                  <span>
                    Related to
                    {{
                      selectedPolymarketTag.label ??
                      selectedPolymarketTag.slug ??
                      `Tag ${selectedPolymarketTag.id}`
                    }}
                  </span>
                  <p v-if="relatedPolymarketTagsLoading">
                    Loading related tags…
                  </p>
                  <template v-else-if="availableRelatedPolymarketTags">
                    <p v-if="availableRelatedPolymarketTags.tags.length === 0">
                      No related tags returned.
                    </p>
                    <ul v-else aria-label="Tags related to selected direct tag">
                      <li
                        v-for="tag in availableRelatedPolymarketTags.tags"
                        :key="tag.id"
                        :title="`Related Polymarket tag ${tag.id}`"
                      >
                        {{ tag.label ?? tag.slug ?? `Tag ${tag.id}` }}
                      </li>
                    </ul>
                    <small
                      >One level only · related tags are not expanded</small
                    >
                  </template>
                  <p v-else-if="relatedPolymarketTags" class="empty-state">
                    {{ unavailableMessage(relatedPolymarketTags) }}
                  </p>
                </div>
              </div>
              <p
                v-else-if="polymarketResearch"
                class="empty-state polymarket-tags-unavailable"
              >
                Market taxonomy:
                {{ unavailableMessage(polymarketResearch.tags) }}
              </p>
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
              <div v-if="polymarketResearch" class="polymarket-trade-grid">
                <article
                  v-for="trade in [
                    { label: 'YES', resource: polymarketResearch.yesLastTrade },
                    { label: 'NO', resource: polymarketResearch.noLastTrade },
                  ]"
                  :key="trade.label"
                  class="polymarket-trade"
                >
                  <span>{{ trade.label }} latest reported trade</span>
                  <template v-if="available(trade.resource)">
                    <strong>
                      {{ probability(trade.resource.data.price) }} ·
                      {{ trade.resource.data.side.toUpperCase() }}
                    </strong>
                    <small>
                      Received locally
                      {{ timestamp(trade.resource.data.receivedAt) }} · provider
                      time unavailable
                    </small>
                  </template>
                  <small v-else>{{ trade.resource.message }}</small>
                </article>
              </div>
              <div v-if="polymarketResearch" class="polymarket-change-grid">
                <article
                  v-for="change in available(polymarketResearch.priceChange24h)
                    ? [
                        {
                          label: 'YES',
                          data: polymarketResearch.priceChange24h.data.outcomes
                            .yes,
                        },
                        {
                          label: 'NO',
                          data: polymarketResearch.priceChange24h.data.outcomes
                            .no,
                        },
                      ]
                    : []"
                  :key="change.label"
                  class="polymarket-change"
                >
                  <span>{{ change.label }} 24-hour price change</span>
                  <strong :class="change.data.direction">
                    {{ probabilityChange(change.data.priceChange) }}
                  </strong>
                  <small>
                    {{ change.data.direction }} · independently selected
                    historical observations
                  </small>
                </article>
                <p
                  v-if="!available(polymarketResearch.priceChange24h)"
                  class="polymarket-change-unavailable"
                >
                  24-hour price change:
                  {{ polymarketResearch.priceChange24h.message }}
                </p>
              </div>
              <div
                v-if="
                  polymarketResearch &&
                  available(polymarketResearch.priceChange24h)
                "
                class="polymarket-change-context"
                aria-label="Binary 24-hour price-change context"
              >
                <article>
                  <span>Combined 24-hour movement</span>
                  <strong
                    :class="
                      polymarketResearch.priceChange24h.data.combinedDirection
                    "
                  >
                    {{
                      probabilityChange(
                        polymarketResearch.priceChange24h.data
                          .combinedPriceChange,
                      )
                    }}
                  </strong>
                  <small>
                    Exact sum
                    {{
                      polymarketResearch.priceChange24h.data.combinedPriceChange
                    }}
                    ·
                    {{
                      polymarketResearch.priceChange24h.data.combinedDirection
                    }}
                  </small>
                </article>
                <article>
                  <span>Earlier boundary alignment</span>
                  <strong>
                    {{
                      polymarketHistoricalAlignmentLabel(
                        polymarketResearch.priceChange24h.data
                          .sameFromObservedTimestamp,
                        polymarketResearch.priceChange24h.data
                          .sameFromResolution,
                      )
                    }}
                  </strong>
                  <small>
                    Requested
                    {{
                      timestamp(
                        polymarketResearch.priceChange24h.data.requestedFrom,
                      )
                    }}
                  </small>
                </article>
                <article>
                  <span>Later boundary alignment</span>
                  <strong>
                    {{
                      polymarketHistoricalAlignmentLabel(
                        polymarketResearch.priceChange24h.data
                          .sameToObservedTimestamp,
                        polymarketResearch.priceChange24h.data.sameToResolution,
                      )
                    }}
                  </strong>
                  <small>
                    Requested
                    {{
                      timestamp(
                        polymarketResearch.priceChange24h.data.requestedTo,
                      )
                    }}
                  </small>
                </article>
                <p>
                  Independently selected observations · non-atomic ·
                  non-executable · not a percentage return
                </p>
              </div>
              <section
                v-if="polymarketPriceChangeObservationRows.length > 0"
                class="polymarket-observation-provenance"
                aria-labelledby="polymarket-observation-provenance-heading"
              >
                <div class="polymarket-observation-provenance-heading">
                  <div>
                    <span>Historical observation provenance</span>
                    <strong id="polymarket-observation-provenance-heading">
                      Provider-selected points used by the 24-hour comparison
                    </strong>
                  </div>
                  <small>Data API · descriptive · non-executable</small>
                </div>
                <div class="polymarket-observation-grid">
                  <article
                    v-for="row in polymarketPriceChangeObservationRows"
                    :key="row.key"
                  >
                    <span>{{ row.boundary }} boundary · {{ row.outcome }}</span>
                    <strong>{{ probability(row.observation.price) }}</strong>
                    <small>Exact price {{ row.observation.price }}</small>
                    <small>
                      Observed {{ timestamp(row.observation.observedAt) }} ·
                      {{ row.observation.resolutionSeconds }}s resolution
                    </small>
                    <small>
                      {{
                        row.observation.exactTimestamp
                          ? 'Exact requested instant'
                          : 'Latest observation at or before request'
                      }}
                    </small>
                  </article>
                </div>
              </section>
              <figure
                v-if="polymarketResearch && polymarketPriceChart"
                class="polymarket-price-chart"
              >
                <div class="polymarket-price-legend">
                  <span v-if="polymarketPriceChart.yesPoints.length > 0">
                    <i class="yes-line"></i>YES ·
                    {{ polymarketPriceChart.yesPoints.length }} points
                  </span>
                  <span v-if="polymarketPriceChart.noPoints.length > 0">
                    <i class="no-line"></i>NO ·
                    {{ polymarketPriceChart.noPoints.length }} points
                  </span>
                  <small>Trailing 24h · 30m resolution</small>
                </div>
                <DashboardChart
                  :option="polymarketPriceChart.option"
                  label="Polymarket YES and NO historical prices over the trailing 24 hours"
                />
                <div class="polymarket-price-diagnostics">
                  <small
                    v-if="!available(polymarketResearch.yesPriceHistory24h)"
                  >
                    YES history:
                    {{ polymarketResearch.yesPriceHistory24h.message }}
                  </small>
                  <small
                    v-if="!available(polymarketResearch.noPriceHistory24h)"
                  >
                    NO history:
                    {{ polymarketResearch.noPriceHistory24h.message }}
                  </small>
                </div>
              </figure>
              <div
                v-else-if="polymarketResearch"
                class="polymarket-price-unavailable"
              >
                <small v-if="!available(polymarketResearch.yesPriceHistory24h)">
                  YES history:
                  {{ polymarketResearch.yesPriceHistory24h.message }}
                </small>
                <small v-else>YES history returned no plottable points</small>
                <small v-if="!available(polymarketResearch.noPriceHistory24h)">
                  NO history: {{ polymarketResearch.noPriceHistory24h.message }}
                </small>
                <small v-else>NO history returned no plottable points</small>
              </div>
              <p class="polymarket-note">
                Direct taxonomy is provider-attached; related taxonomy requires
                an explicit selection and is limited to one level. Midpoints,
                level-one books, latest reported trades, and 24-hour historical
                comparisons are independent observations. The chart uses bounded
                30-minute history pages and does not imply synchronized YES/NO
                snapshots. Trades have no provider timestamp or quantity;
                changes are absolute percentage points, not returns. None of
                these values are executable quotes, depth, fill guarantees,
                signals, or recommendations.
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
      </template>

      <template v-else>
        <header class="page-heading">
          <div>
            <p class="eyebrow">Market discovery</p>
            <h1>New listings</h1>
            <p>
              Recent application detections and their durable T+0 checkpoint
              research, without ranking or recommendation.
            </p>
          </div>
          <span>Binance Spot · observational</span>
        </header>

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
                  {{ decimal(availableListingPerformance.baselinePrice, 8) }}
                  USDT
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
      </template>

      <footer>
        <span>Research surface · no real funds</span>
        <span>Data remains local to this machine</span>
      </footer>
    </div>
  </main>
</template>
