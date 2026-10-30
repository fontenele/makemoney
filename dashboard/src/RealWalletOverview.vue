<script setup lang="ts">
import { computed } from 'vue';
import Decimal from 'decimal.js';
import type { AgenticWalletFundingValuation, Resource } from './api';
const props = defineProps<{
  resource: Resource<AgenticWalletFundingValuation> | null;
  loading: boolean;
}>();
defineEmits<{ reload: [] }>();
const data = computed(() =>
  props.resource?.status === 'available' &&
  props.resource.data.status === 'available'
    ? props.resource.data
    : null,
);
const balance = computed(() => data.value?.balance ?? null);
function money(value: string | null | undefined) {
  return value == null ? 'Unavailable' : new Decimal(value).toFixed(2);
}
</script>
<template>
  <section
    class="real-wallet-overview"
    aria-label="Real Agentic Wallet portfolio"
  >
    <div class="real-heading">
      <div>
        <p class="eyebrow">Real holdings · BSC</p>
        <h2>Agentic Wallet portfolio</h2>
      </div>
      <button type="button" :disabled="loading" @click="$emit('reload')">
        {{ loading ? 'Loading wallet…' : 'Reload real balances' }}
      </button>
    </div>
    <div v-if="balance" class="real-metrics">
      <article>
        <span>Estimated total · USDT</span
        ><strong>{{ money(balance.totalValueUsdt) }}</strong>
        <p v-if="balance.totalValueUsdt === null">
          A required balance or reference price is missing; no partial total is
          shown.
        </p>
        <p v-else>{{ money(balance.totalValueBrl) }} BRL · BNB + USDT + BTCB</p>
      </article>
      <article>
        <span>BNB · gas balance</span><strong>{{ balance.quantityBnb }}</strong>
        <p>{{ money(balance.valueUsdt) }} USDT</p>
      </article>
      <article>
        <span>USDT · available balance</span
        ><strong>{{ balance.quantityUsdt ?? 'Not reported' }}</strong>
        <p>{{ money(balance.usdtValueBrl) }} BRL</p>
      </article>
      <article>
        <span>BTCB · real position</span
        ><strong>{{ balance.quantityBtcb ?? 'Not reported' }}</strong>
        <p>{{ money(balance.btcbValueUsdt) }} USDT · BTC reference estimate</p>
        <p>{{ money(balance.btcbValueBrl) }} BRL</p>
      </article>
    </div>
    <p v-else role="status">
      {{
        loading
          ? 'Reading the real wallet…'
          : 'Real wallet valuation is unavailable. No balance or profit is assumed.'
      }}
    </p>
    <p>
      BTCB values use the public BTC/USDT reference, not a BTCB sale quote. Net
      liquidation, realized P&amp;L and real win rate are unavailable. Paper
      metrics below belong only to the separate simulation.
    </p>
    <small v-if="data"
      >Wallet observation: {{ data.balanceObservedAt }} · Prices:
      {{ data.pricesObservedAt ?? 'Unavailable' }}. Reload updates the
      observation; routine dashboard refresh does not reload the wallet.</small
    >
  </section>
</template>
<style scoped>
.real-wallet-overview {
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  border: 1px solid var(--line, #334155);
  border-radius: 16px;
}
.real-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
h2,
p {
  margin: 0 0 0.6rem;
}
.real-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}
article {
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--line, #334155);
  border-radius: 12px;
}
span {
  display: block;
  margin-bottom: 0.75rem;
}
strong {
  display: block;
  font-size: 1.3rem;
  overflow-wrap: anywhere;
  margin-bottom: 0.5rem;
  font-variant-numeric: tabular-nums;
}
p,
small {
  line-height: 1.5;
}
small {
  display: block;
  overflow-wrap: anywhere;
}
</style>
