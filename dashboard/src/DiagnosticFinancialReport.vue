<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import {
  loadDiagnosticFinancialReport,
  type DiagnosticCostStatus,
} from './diagnostic-financial-report';
const state = ref<DiagnosticCostStatus | null>(null);
const failed = ref(false);
let disposed = false;
let loading = false;
let timer: ReturnType<typeof setInterval> | undefined;
async function refresh() {
  if (disposed || loading || document.hidden) return;
  loading = true;
  try {
    const result = await loadDiagnosticFinancialReport();
    if (!disposed) {
      state.value = result;
      failed.value = result === null;
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
  <section class="diagnostic-report" aria-label="Real diagnostic cost evidence">
    <h3>Real diagnostic: actual gas costs</h3>
    <p v-if="failed" role="status">
      The diagnostic report is unavailable. No cost or profit is assumed.
    </p>
    <template v-else-if="state?.report">
      <p>
        One finalized BSC buy: {{ state.report.sourceSpentUsdt }} USDT spent;
        {{ state.report.receivedBtcb }} BTCB received. This is the historical
        quantity received, not a current balance or realized profit.
      </p>
      <table>
        <caption>
          Receipt fees, calculated from gas used × effective gas price
        </caption>
        <thead>
          <tr>
            <th scope="col">Transaction</th>
            <th scope="col">Actual gas (BNB)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Buy</th>
            <td>{{ state.report.gas.swapBnb }}</td>
          </tr>
          <tr>
            <th scope="row">USDT approval</th>
            <td>{{ state.report.gas.approvalBnb }}</td>
          </tr>
          <tr>
            <th scope="row">Entry subtotal</th>
            <td>{{ state.report.gas.entryBnb }}</td>
          </tr>
          <tr>
            <th scope="row">Approval revocation</th>
            <td>{{ state.report.gas.revocationBnb }}</td>
          </tr>
          <tr>
            <th scope="row">Experiment total</th>
            <td>{{ state.report.gas.totalBnb }}</td>
          </tr>
        </tbody>
      </table>
      <dl>
        <dt>Indicative entry gas / investment</dt>
        <dd>{{ state.report.indicativeEntryGasPercentage }}%</dd>
        <dt>Indicative entry gas</dt>
        <dd>{{ state.report.indicativeEntryGasUsdt }} USDT</dd>
        <dt>Indicative total gas, including revocation</dt>
        <dd>{{ state.report.indicativeTotalGasUsdt }} USDT</dd>
        <dt>Input plus indicative entry gas</dt>
        <dd>{{ state.report.indicativeEntryCostUsdt }} USDT</dd>
        <dt>Preparation BNB/USDT reference</dt>
        <dd>{{ state.report.referenceBnbUsdt }}</dd>
        <dt>Report observation</dt>
        <dd>{{ state.report.observedAt }}</dd>
        <dt>Router allowance at that observation</dt>
        <dd>
          {{
            state.report.approval.clearedAtObservation
              ? 'Zero'
              : 'Nonzero; review required'
          }}
        </dd>
      </dl>
      <p>
        USDT figures use the preparation reference price, not the historical
        execution price. One sample does not guarantee future gas. Sell gas and
        net trading profit remain unmeasured.
      </p>
      <p v-if="state.report.approval.grantExceededTradeInput">
        The original approval exceeded the trade input. Provider-managed
        approvals with targeted revocation were selected; cleanup automation
        must be verified before trading. The displayed allowance is a dated
        latest-state observation, not a continuing guarantee.
      </p>
      <p>
        Unrelated transactions are excluded. This audit does not synchronize the
        global ledger or enable trading.
      </p>
    </template>
    <p v-else role="status">
      No verified diagnostic report is currently cached.
    </p>
    <p>
      This panel refreshes the local cached report only; it never requests a
      wallet action or submits an order.
    </p>
  </section>
</template>

<style scoped>
.diagnostic-report {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid var(--line, #2d3748);
  border-radius: 12px;
}
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
caption {
  text-align: left;
  margin-bottom: 0.5rem;
}
th,
td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid var(--line, #2d3748);
  overflow-wrap: anywhere;
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
@media (max-width: 600px) {
  dl {
    grid-template-columns: minmax(0, 1fr);
  }
  dd {
    margin-bottom: 0.5rem;
  }
}
</style>
