<template>

<div class="status-box" :style="`background-color: ${color};`">
    <div class="status-text">{{ text }}</div>
    <div class="series-name">{{ series ?? '' }}</div>
</div>

</template>

<style lang="scss">

.status-box {
    width: 100%;
    height: 100%;
}

.status-text {
    position: relative;
    top: 0;
}

.series-name {
    position: relative;
    bottom: 0;
}

</style>

<script lang="ts" setup>

import { useFlightViewState, type TimeRange } from '@/composables/useFlightView';
import { unwrapShallowRef } from '@/helper/reactivity';
import { getClosest } from '@/helper/timeTree';
import { useFlightDataStore, type MeasurementTypes } from '@/stores/flight_data';
import { watchDebounced } from '@vueuse/shared';
import { computed, inject, ref, shallowRef, triggerRef } from 'vue';
import { DASHBOARD_WIDGET_ID } from '../misc/dashboard/DashboardComposable';
import { useSelectedPart, useWidgetData } from './flightDashboardElemStoreTypes';


const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

const { flightId,  timeRange, resolution } = useFlightViewState()


const timeRangeDebounced = shallowRef<TimeRange | undefined>(undefined)

watchDebounced(timeRange, r => {timeRangeDebounced.value = r ? {...r} : undefined; triggerRef(timeRangeDebounced)}, {immediate: true, deep: true, debounce: 100, maxWait: 150 })

const partId = useSelectedPart(dashboardWidgetId!)

const widgetData = useWidgetData(dashboardWidgetId!)

if (!dashboardWidgetId)
    throw new Error('Flight Status not used in within a dashboard')

// const { vessel$, flight$ } = getFlightAndHistoricVessel(vesselId, flightId)

// const selectedPartId = useSelectedPart(dashboardWidgetId)
// const selectedPart$ = getPart(vessel$, selectedPartId)

// const { configurations } = useComponentConfiguration()

// const relevantConfiguration = computed(() => selectedPartId.value && selectedPart.value ? configurations[selectedPart.value?.part_type] : undefined)

// const dataConfig = relevantConfiguration.value?.flightDataConfig

const series = computed(() => widgetData.value.selectedSeries)

const { getOrInitStore } = useFlightDataStore()

const flightData = unwrapShallowRef(computed(() => partId.value && flightId.value ? getOrInitStore(flightId.value, partId.value): undefined))

const value = ref<MeasurementTypes | undefined>()

watchDebounced([flightData, timeRangeDebounced, series, resolution], ([store, range, s, r]) => {

    if(!store || !range || !s){
        value.value = undefined
        return
    }

    const v = getClosest(store.measurements, range.cur, r === 'smallest' ? undefined : r)

    if(!v){
        value.value = undefined
        return
    }

    value.value = v.measurements_aggregated[s]?.[0]
    
}, { immediate: true, deep: false })


const color = computed(() =>/* series.value?.statusColor && value.value ? series.value.statusColor(value.value) :*/ '#ffffff')

const text = computed(() => /* series.value?.statusText && value.value ? series.value.statusText(value.value) : ''*/ value.value)


</script>