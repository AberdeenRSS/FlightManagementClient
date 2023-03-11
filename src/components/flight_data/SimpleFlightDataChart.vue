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
import { computed, onMounted, reactive, toRefs, watch, onUnmounted, ref, type Ref, type WatchStopHandle, inject, shallowRef, triggerRef } from 'vue';
import bb, { areaLineRange, line, scatter, zoom, type Chart } from "billboard.js";
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

const throttledTimeRange = ref<TimeRange>(timeRange.value)
watchDebounced(timeRange, v => throttledTimeRange.value = v, { immediate: true, deep: true, debounce: 200, maxWait: 500 })

const vesselPartId = useSelectedPart(dashboardWidgetId)

const realtime = ref(false)

const { store: store$, fetchFlightDataInTimeFrame } = useFlightDataStore()

const vesselStore = useVesselStore()
vesselStore.fetchVesselsIfNecessary()
const getVessel = vesselStore.getVessel

const part = computed(() => getVessel(vesselId.value)?.parts.find(p => p._id === vesselPartId.value))

const data: Ref<FlightDataState | undefined> = shallowRef(undefined)

watch([store$, flightId, vesselPartId], ([store, flight, part]) => {

    const id = `${flight}*${part}`

    data.value = store.flight_data?.[id]

    triggerRef(data)

}, { immediate: true, deep: true })

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
    const data = {} as { [seriesName: string]: (string | number | boolean | number[])[] }

    const curMeasurements = resolution === 'smallest' ?
        getValues(flightData.measurements, range.start, range.end)
        : getValues(flightData.measurements, range.start, range.end, true, resolution)

    curMeasurements.forEach(x => {

        const r = x

        const date = r.getDateTime()

        if (!date)
            return;

        if (date.getTime() < range.start.getTime())
            return;

        if (date.getTime() > range.end.getTime())
            return;

        times.push(date)
        Object.keys(r.measured_values).forEach(s => {
            const value = r.measured_values[s]

            const valueActual = isAggregatedMeasurement(value) ? (value.avg ?? value.min ?? value.max) : value


            if (!data[s])
                data[s] = [s]

            if(typeof valueActual === 'number'){
                const valueTriple = isAggregatedMeasurement(value) ? [value.min ?? value.avg, value.avg, value.max ?? value.avg] : [value, value, value]
                data[s].push(valueTriple as number[])
                return
            }
            if (typeof valueActual === 'string'){
                data[s].push(0)
                return
            }
            
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
            type: areaLineRange(),
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
                title: (x: Date) => `${x.toLocaleTimeString()} ${x.toLocaleDateString()}`,
                value: function (value, ratio, id) {

                    if(typeof value === 'number')
                        return value.toPrecision(3)
                    return value
                }
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

    watch(timeRange, range => {

        const x = chart.x() as unknown as { [series: string]: Date[] }

        const availableSeries = Object.keys(x)

        if (!availableSeries || availableSeries.length < 1)
            return

        const usedSeries = availableSeries.map(s => x[s]).flat()

        if(usedSeries.length < 1)
            return

        let minDelta = Number.MAX_SAFE_INTEGER
        let min = usedSeries[0]

        for (const s of usedSeries){
            const cur = Math.abs(s.getTime() - range.cur.getTime())
            if(cur > minDelta)
                continue;

            minDelta = cur
            min = s
        }

        chart.tooltip.show({
            x: min
        });
    }, { immediate: true, deep: true })

    watchDebounced([data, throttledTimeRange, resolution, live], ([flightData, range, resolution, isLive]) => {

        if (!flightData)
            return

        loadChartData(chart, flightData, range, resolution, isLive)


    }, { immediate: true, deep: true, debounce: 200, maxWait: 500 })

})

onUnmounted(() => {
    if (chart$.value)
        chart$.value.destroy()
})


</script>
