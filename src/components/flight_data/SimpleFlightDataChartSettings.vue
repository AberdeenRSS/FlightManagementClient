<template>
  <v-table density="compact" v-if="widgetData.graphSeriesSetting" class="series-settings-table">
    <thead>
      <tr>
        <th class="text-left text-caption">Series</th>
        <th class="text-left text-caption">Show Series</th>
        <th class="text-left text-caption">Show Min/Max</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(item, key) in widgetData.graphSeriesSetting" :key="key">
        <td class="text-caption">{{ key }}</td>
        <td>
          <v-checkbox
            density="compact"
            hide-details
            class="ma-0 pa-0"
            v-model="item.enabled"
          ></v-checkbox>
        </td>
        <td>
          <v-checkbox
            density="compact"
            hide-details
            class="ma-0 pa-0"
            v-model="item.minMaxEnabled"
            :disabled="!item.enabled"
          ></v-checkbox>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<style lang="scss" scoped>
.series-settings-table {
  ::v-deep {
    .v-table__wrapper > table {
      > thead > tr > th {
        height: 32px;
        padding: 0 8px;
      }
      > tbody > tr > td {
        height: 32px;
        padding: 0 8px;
      }
    }
    .v-selection-control {
      margin: 0;
      padding: 0;
      .v-selection-control__wrapper {
        margin: 0;
        padding: 0;
      }
    }
  }
}
</style>

<script setup lang="ts">
import { toRefs } from 'vue';
import { useSelectedPart, useWidgetData } from './flightDashboardElemStoreTypes';
import { getFlight } from '@/stores/flight';
import { useFlightViewState } from '@/composables/useFlightView';
import { fromImmediate } from '@/helper/reactivity';
import { switchMap, map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

const props = defineProps({
  dashboardWidgetId: {
    type: Array,
    required: true
  }
});

const { dashboardWidgetId } = toRefs(props);
const widgetData = useWidgetData(dashboardWidgetId.value as [string, string]);

if (!widgetData.value.graphSeriesSetting)
  widgetData.value.graphSeriesSetting = {};

const { vesselId, flightId } = useFlightViewState();

const flight$ = combineLatest([fromImmediate(vesselId), fromImmediate(flightId)]).pipe(
  switchMap(([vid, fid]) => getFlight(vid, fid))
);

const partId$ = fromImmediate(useSelectedPart(dashboardWidgetId.value as [string, string]));

const availableSeries = combineLatest([partId$, flight$]).pipe(
  map(([pid, f]) => pid && f ? f.measured_parts[pid] : []),
);

availableSeries.subscribe(series => {
  const notFound: Record<string, boolean> = {};
  for (const key in widgetData.value.graphSeriesSetting) {
    notFound[key] = true;
  }
  series.forEach(s => {
    delete notFound[s.name];
    if (!widgetData.value.graphSeriesSetting[s.name])
      widgetData.value.graphSeriesSetting[s.name] = { enabled: true, minMaxEnabled: true };
  });
  for (const key in notFound)
    delete widgetData.value.graphSeriesSetting[key];
});
</script>