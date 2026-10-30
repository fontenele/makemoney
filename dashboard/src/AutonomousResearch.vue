<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import {
  loadAutonomousResearch,
  researchPercentage,
  type AutonomousResearch,
} from './autonomous-research';
const research = ref<AutonomousResearch | null>(null);
const failed = ref(false);
let disposed = false;
let loading = false;
let timer: ReturnType<typeof setInterval> | undefined;
async function refresh() {
  if (disposed || loading || document.hidden) return;
  loading = true;
  try {
    const value = await loadAutonomousResearch();
    if (!disposed) {
      research.value = value;
      failed.value = value === null;
    }
  } finally {
    loading = false;
  }
}
onMounted(() => {
  void refresh();
  timer = setInterval(() => void refresh(), 30000);
  document.addEventListener('visibilitychange', refresh);
});
onUnmounted(() => {
  disposed = true;
  if (timer) clearInterval(timer);
  document.removeEventListener('visibilitychange', refresh);
});
</script>

<template>
  <section
    class="autonomous-research"
    aria-label="Autonomous strategy research"
  >
    <h3>Background strategy research</h3>
    <p>
      The system evaluates the configured BTC strategy automatically. This is
      research; real trading remains disabled.
    </p>
    <p v-if="failed" role="status">
      Research status is unavailable. No opportunity is assumed.
    </p>
    <template v-else-if="research">
      <p v-if="research.status !== 'research_only'" role="status">
        Current research is warming up, stale or unavailable. Any figures below
        are historical only.
      </p>
      <dl v-if="research.evidence">
        <dt>Closed one-minute candles</dt>
        <dd>{{ research.evidence.candleCount }}</dd>
        <dt>Closed hypothetical trades</dt>
        <dd>{{ research.evidence.closedTradeCount }}</dd>
        <dt>Latest historical signal</dt>
        <dd>{{ research.evidence.latestAction }}</dd>
        <dt>Mean gross return per trade</dt>
        <dd>{{ researchPercentage(research.evidence.grossMeanReturnRate) }}</dd>
        <dt>Lower-quartile gross return</dt>
        <dd>
          {{
            researchPercentage(research.evidence.grossLowerQuartileReturnRate)
          }}
        </dd>
        <dt>Last research observation</dt>
        <dd>{{ research.observedAt ?? 'Unavailable' }}</dd>
      </dl>
      <p>
        Returns use next-candle hypothetical fills and exclude fees, spread,
        slippage and gas. BTC Spot research does not verify BTCB execution
        returns or predict profit.
      </p>
    </template>
    <p>
      Background collection runs every 15 minutes while the API is running. This
      panel reads the cached result; it never contacts the wallet or submits an
      order.
    </p>
  </section>
</template>

<style scoped>
.autonomous-research {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--line, #2d3748);
  border-radius: 12px;
}
dl {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0.4rem 1rem;
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
p {
  line-height: 1.5;
}
</style>
