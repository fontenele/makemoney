<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import AutonomousResearch from './AutonomousResearch.vue';
import DiagnosticFinancialReport from './DiagnosticFinancialReport.vue';
import {
  executionBlockerLabel,
  loadExecutionReadiness,
  type ExecutionReadiness,
} from './execution-readiness';
const readiness = ref<ExecutionReadiness | null>(null);
const loading = ref(false);
const failed = ref(false);
let disposed = false;
async function refresh() {
  if (loading.value) return;
  loading.value = true;
  const result = await loadExecutionReadiness();
  if (disposed) return;
  readiness.value = result;
  failed.value = result === null;
  loading.value = false;
}
onMounted(() => {
  void refresh();
});
onUnmounted(() => {
  disposed = true;
});
</script>

<template>
  <DiagnosticFinancialReport />
  <AutonomousResearch />
  <section class="wallet-readiness" aria-label="Real execution prerequisites">
    <div class="panel-heading">
      <h3>What remains before a real order</h3>
      <button type="button" :disabled="loading" @click="refresh">
        {{ loading ? 'Checking…' : 'Refresh prerequisites' }}
      </button>
    </div>
    <p v-if="failed" role="status">
      Execution prerequisites are unavailable. No readiness is assumed.
    </p>
    <template v-else-if="readiness">
      <p>
        Manual quote and cost previews are implemented. Automatic strategy
        execution remains unavailable.
      </p>
      <h4>Operator configuration</h4>
      <p>
        Protective exits at a loss:
        {{
          readiness.protectiveExitsAuthorized
            ? 'Authorized only to reduce an existing position'
            : 'Not authorized'
        }}. This policy does not activate automatic selling.
      </p>
      <p>
        Configured daily loss limit:
        {{ readiness.maximumDailyLossUsdt ?? 'Not configured' }} USDT. Daily
        loss accounting/enforcement is not connected; real execution remains
        blocked.
      </p>
      <ul v-if="readiness.configurationBlockers.length">
        <li v-for="blocker in readiness.configurationBlockers" :key="blocker">
          {{ executionBlockerLabel(blocker) }}
        </li>
      </ul>
      <p v-else>Configuration checks pass. This does not approve an order.</p>
      <h4>Execution prerequisites</h4>
      <p>
        This project uses only the existing Agentic Wallet through the local
        API/CLI. No separate browser-wallet connection is required or offered.
        The selected policy requires positive expected net profit after trading
        costs and estimated entry/exit gas with a safety margin. Estimates are
        not guaranteed costs. Runtime profitability checks are not connected
        yet, so real execution remains blocked.
      </p>
      <ul>
        <li v-for="blocker in readiness.integrationBlockers" :key="blocker">
          {{ executionBlockerLabel(blocker) }}
        </li>
      </ul>
      <p>
        The prerequisite check reads local configuration only. It does not
        contact the wallet, request a quote, or submit an order.
      </p>
    </template>
  </section>
</template>

<style scoped>
.wallet-readiness {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--line, #2d3748);
  border-radius: 12px;
}
h3,
h4 {
  margin: 0.5rem 0;
}
ul {
  padding-left: 1.25rem;
}
li {
  margin: 0.35rem 0;
}
p {
  line-height: 1.5;
}
</style>
