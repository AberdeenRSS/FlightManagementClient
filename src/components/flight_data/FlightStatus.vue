<template>

<div class="status-box" :style="`background-color: ${color};`">
    <div class="status-text">{{ text }}</div>
    <div class="series-name">{{ series?.seriesName ?? '' }}</div>
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

import { useComponentConfiguration, type FlightDataConfig } from '@/composables/componentsConfiguration/componentConfiguration';
import { computed, defineProps, inject, ref, toRef, toRefs, watch } from 'vue'
import { DASHBOARD_WIDGET_ID, useDashboardWidgetStore } from '../misc/dashboard/DashboardComposable';
import { useWidgetData, useSelectedPart } from './flightDashboardElemStoreTypes';
import { useVesselStore } from '@/stores/vessels'
import { useFlightViewState, type TimeRange } from '@/composables/useFlightView';
import { isAggregatedMeasurement, useFlightDataStore, type FlightDataChunk, type FlightDataChunkAggregated, type MeasurementTypes } from '@/stores/flight_data';
import { getClosest, type TimeTreeData } from '@/helper/timeTree'
import { watchDebounced, watchThrottled } from '@vueuse/shared';

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

const { vesselId, flightId,  timeRange } = useFlightViewState()

const throttledTimeRange = ref<TimeRange>(timeRange.value)
watchDebounced(timeRange, v => throttledTimeRange.value = v, {immediate: true, deep: true, debounce: 200, maxWait: 500})

const partId = useSelectedPart(dashboardWidgetId!)

const widgetData = useWidgetData(dashboardWidgetId!)

if (!dashboardWidgetId)
    throw new Error('Flight Status not used in within a dashboard')

const { getVessel } = useVesselStore()
const vessel = computed(() => getVessel(vesselId.value))

const selectedPartId = useSelectedPart(dashboardWidgetId)
const selectedPart = computed(() => vessel.value?.parts.find(p => p._id === selectedPartId.value))

const { configurations } = useComponentConfiguration()
const relevantConfiguration = computed(() => selectedPartId.value && selectedPart.value ? configurations[selectedPart.value?.part_type] : undefined)

const dataConfig = relevantConfiguration.value?.flightDataConfig

const series = computed(() => dataConfig ? Object.keys(dataConfig).map(k => ({key: k, ...dataConfig[k]})).find(c => c.seriesName === widgetData.value.selectedSeries) : undefined)

const { store: store$ } = useFlightDataStore()

// const flightData = computed(() => store$.value.flight_data[flightId.value])

const flightData = toRef(store$.value.flight_data, flightId.value)

const measurement = ref<(FlightDataChunk & TimeTreeData) | (FlightDataChunkAggregated & TimeTreeData) | undefined>(undefined)

watchDebounced([store$, flightId, partId, throttledTimeRange], ([store, flight, part, range]) => {

    const id = `${flight}*${part}`

    const flightData = store.flight_data[id]?.measurements

    if(!flightData)
        return

    measurement.value =  getClosest(flightData, range.cur, 'decisecond')

}, { immediate: true, deep: true, debounce: 200, maxWait: 500 })

const value = ref<MeasurementTypes | undefined>()

watch([measurement, series], ([m, s]) => {

    if(!m || !s){
        value.value = undefined
        return
    }

    const seriesMeasurement = m.measured_values[s.key]

    if(!seriesMeasurement){
        value.value = undefined
        return
    }

    const v = isAggregatedMeasurement(seriesMeasurement) ? 
        seriesMeasurement.avg ?? seriesMeasurement.min ?? seriesMeasurement.max
        : seriesMeasurement

    value.value = v
        

}, {immediate: true, deep: true})

const color = computed(() => series.value?.statusColor && value.value ? series.value.statusColor(value.value) : '#ffffff')

const text = computed(() => series.value?.statusText && value.value ? series.value.statusText(value.value) : '')

</script>