<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { loadDashboard, type DashboardSnapshot, type Resource } from './api';
import {
  createDashboardAutoRefresh,
  DASHBOARD_REFRESH_INTERVAL_MS,
} from './auto-refresh';
import { buildSignalChart } from './signal-chart';

const snapshot = ref<DashboardSnapshot | null>(null);
const refreshing = ref(false);

const apiOnline = computed(() => snapshot.value?.health.status === 'available');
const signalChart = computed(() =>
  snapshot.value?.strategySignals.status === 'available'
    ? buildSignalChart(snapshot.value.strategySignals.data)
    : null,
);

async function refresh(): Promise<void> {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    snapshot.value = await loadDashboard();
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
            <svg
              viewBox="0 0 100 44"
              role="img"
              aria-label="Chronological short and long moving-average history"
              preserveAspectRatio="none"
            >
              <path class="chart-grid" d="M 3 22 L 97 22" />
              <path class="chart-line chart-long" :d="signalChart.longPath" />
              <path class="chart-line chart-short" :d="signalChart.shortPath" />
              <circle
                v-for="point in signalChart.points.filter(
                  (item) => item.action !== 'hold',
                )"
                :key="`${point.evaluatedAt}:${point.action}`"
                :cx="point.x"
                :cy="point.shortY"
                r="1.1"
                :class="`chart-event chart-event-${point.action}`"
              >
                <title>
                  {{ point.action }} · {{ timestamp(point.evaluatedAt) }}
                </title>
              </circle>
            </svg>
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
          </article>
        </div>
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
