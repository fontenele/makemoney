<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { loadDashboard, type DashboardSnapshot, type Resource } from './api';

const snapshot = ref<DashboardSnapshot | null>(null);
const refreshing = ref(false);

const apiOnline = computed(() => snapshot.value?.health.status === 'available');

async function refresh(): Promise<void> {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    snapshot.value = await loadDashboard();
  } finally {
    refreshing.value = false;
  }
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

function available<T>(resource: Resource<T> | undefined): resource is {
  status: 'available';
  data: T;
} {
  return resource?.status === 'available';
}

onMounted(() => void refresh());
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

      <div class="topbar-actions">
        <span class="connection" :class="{ online: apiOnline }">
          <i aria-hidden="true"></i>
          {{ apiOnline ? 'Local API online' : 'API unavailable' }}
        </span>
        <button type="button" :disabled="refreshing" @click="refresh">
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

    <footer>
      <span>Research surface · no real funds</span>
      <span>Data remains local to this machine</span>
    </footer>
  </main>
</template>
