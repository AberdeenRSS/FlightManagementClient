<template>
    <div :id="divID" class="chart"></div>
</template>

<style lang="scss">
    .chart {
        height: 100%;
        width: 100%;
    }
</style>

<script setup lang="ts">
import { fetchRssApi } from '@/composables/api/rssFlightServerApi';
import { until, watchDebounced, watchThrottled } from '@vueuse/core';
import { computed, onMounted, reactive, toRefs, watch, onUnmounted, ref, type Ref, type WatchStopHandle, inject } from 'vue';
import bb, { line, scatter, zoom, type Chart } from "billboard.js";
import { isAggregatedMeasurement, useFlightDataStore, type FlightDataChunk, type FlightDataChunkAggregated, type FlightDataState } from '@/stores/flight_data'
import { useVesselStore } from '@/stores/vessels';
import { getValues, type AggregationLevels } from '@/helper/timeTree';
import { useSelectedPart } from './flightDashboardElemStoreTypes';
import { DASHBOARD_WIDGET_ID } from '../misc/dashboard/DashboardComposable';
import { useFlightViewState, type TimeRange } from '@/composables/useFlightView';

const divID = `chart_div${Math.floor(Math.random() * 1000000)}`

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Resizer not used in within a dashboard')

const { vesselId, flightId, timeRange, resolution, live } = useFlightViewState() 

const vesselPartId = useSelectedPart(dashboardWidgetId)

const realtime = ref(false)

const { store: store$, fetchFlightDataInTimeFrame } = useFlightDataStore()

const vesselStore = useVesselStore()
vesselStore.fetchVesselsIfNecessary()
const getVessel = vesselStore.getVessel

const part = computed(() => getVessel(vesselId.value)?.parts.find(p => p._id === vesselPartId.value))

const data: Ref<FlightDataState | undefined> = ref(undefined)

watch([store$, flightId, vesselPartId], ([store, flight, part]) => {

    const id = `${flight}*${part}`

    data.value = store.flight_data?.[id]


}, { immediate: true, deep: true})

const chart$ = ref<Chart | undefined>(undefined)
const prev$ = ref<string[] | undefined>(undefined)

function loadChartData(chart: Chart, flightData: FlightDataState | undefined, range: TimeRange, resolution: AggregationLevels | 'smallest', isLive: boolean) {


    if (!flightData) {

        if (prev$.value)
            chart.unload({ ids: [...prev$.value] })

        prev$.value = undefined
        return
    }

    const times = ['time'] as (string | Date)[]
    const data = {} as { [seriesName: string]: (string | number | boolean)[] }

    const curMeasurements = resolution === 'smallest' ? 
        getValues(flightData.measurements, timeRange.value.start, timeRange.value.end) 
        : getValues(flightData.measurements, timeRange.value.start, timeRange.value.end, true, resolution)

    curMeasurements.forEach(x => {

        const r = x

        const date = r.getDateTime()

        if (!date)
            return;

        if (date.getTime() < timeRange.value.start.getTime())
            return;

        if (date.getTime() > timeRange.value.end.getTime())
            return;

        times.push(date)
        Object.keys(r.measured_values).forEach(s => {
            const value = r.measured_values[s]

            const valueActual = isAggregatedMeasurement(value) ? (value.avg ?? value.min ?? value.max) : value

            if(typeof valueActual === 'string' )
                return

            if (!data[s])
                data[s] = [s]

            data[s].push(valueActual)
        })
    })


    chart.load({
        columns: [
            times,
            ...Object.keys(data).map(k => data[k])
        ],
        unload: prev$.value?.filter(p => !data[p]),
        append: false,
    })

    prev$.value = [...Object.keys(data)]
}

onMounted(() => {

    const chart = bb.generate({
        data: {
            x: "time",
            columns: [

            ],
            type: line(),
        },
        scatter: {
            zerobased: true
        },
        axis: {
            x: {
                type: "timeseries",
                tick: {
                    format: "%H:%M:%S",
                    rotate: 60,
                    fit: false
                }
            },
            y: {
            }
        },
        tooltip: {
            format: {
                title: (x: any) => x as string,
                // value: ()
            },
        },
        zoom: {
            enabled: zoom(),
        },
        transition: {
            duration: 0,
        },
        bindto: `#${divID}`
    });

    chart$.value = chart


    watchDebounced([data, timeRange, resolution, live], ([flightData, range, resolution, isLive]) => {

        if (!flightData)
            return

        loadChartData(chart, flightData, range, resolution, isLive)


    }, { immediate: true, deep: true, debounce: 100, maxWait: 300 })

})

onUnmounted(() => {
    if (chart$.value)
        chart$.value.destroy()
})


</script>
