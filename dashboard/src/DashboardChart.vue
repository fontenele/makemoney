<script setup lang="ts">
import { LineChart, ScatterChart } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components';
import { init, use, type ECharts, type EChartsCoreOption } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

use([
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
  SVGRenderer,
]);

const props = defineProps<{
  option: EChartsCoreOption;
  label: string;
}>();

const container = ref<HTMLDivElement | null>(null);
let chart: ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

function resize(): void {
  chart?.resize();
}

onMounted(() => {
  if (!container.value) return;
  chart = init(container.value, undefined, { renderer: 'svg' });
  chart.setOption(props.option, { notMerge: true });
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container.value);
  } else {
    window.addEventListener('resize', resize);
  }
});

watch(
  () => props.option,
  (option) => chart?.setOption(option, { notMerge: true }),
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('resize', resize);
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <div
    ref="container"
    class="dashboard-chart"
    role="img"
    :aria-label="label"
  ></div>
</template>
