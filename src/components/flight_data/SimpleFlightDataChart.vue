<template>
    <div :id="divID" class="chart"></div>
    <!-- {{ loadedDataPoints }}
    <br>
    {{ frameTime }}ms -->
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
import { useFlightDataStore, type FlightDataState } from '@/stores/flight_data'
import { getVesselHistoric, useVesselStore, type Vessel } from '@/stores/vessels';
import { getValues, type AggregationLevels } from '@/helper/timeTree';
import { useSelectedPart } from './flightDashboardElemStoreTypes';
import { DASHBOARD_WIDGET_ID } from '../misc/dashboard/DashboardComposable';
import { useFlightViewState, type TimeRange } from '@/composables/useFlightView';
import { useFlightStore } from '@/stores/flight';

const divID = `chart_div${Math.floor(Math.random() * 1000000)}`

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Resizer not used in within a dashboard')

const { vesselId, flightId, timeRange, resolution, live } = useFlightViewState()

const vesselPartId = useSelectedPart(dashboardWidgetId)

const realtime = ref(false)

const { store: store$, fetchFlightDataInTimeFrame, getOrInitStore } = useFlightDataStore()

const vesselStore = useVesselStore()

const flightStore = useFlightStore()

const flight = computed(() => vesselId && flightId ? flightStore.vesselFlights[vesselId.value]?.flights[flightId.value]?.flight : undefined)

const vessel = ref<Vessel | undefined>(undefined)

watch(flight, f => {
    if(!f)
        return
    vesselStore.fetchHistoricVessel(f._vessel_id, f._vessel_version)
    watch(getVesselHistoric(vesselStore, f._vessel_id, f._vessel_version), v =>{ 
        if(v?.entity)
            vessel.value = v.entity
    }, {immediate: true, deep: true} )
}, {immediate: true, deep: true})

const data: Ref<FlightDataState | undefined> = shallowRef(undefined)

let removeOldWatch = undefined as (WatchStopHandle | undefined)

watch([flightId, vesselPartId], ([flight, part]) => {

    if(!part)
        return

    if(removeOldWatch)
        removeOldWatch()

    removeOldWatch = watch(getOrInitStore(flight, part), d => { data.value = d; triggerRef(data)}, {immediate: true, deep: false})

}, { immediate: true, deep: false })

const chart$ = ref<Chart | undefined>(undefined)
const prev$ = ref<string[] | undefined>(undefined)

let prevMax = undefined as (undefined | number)
let prevMin = undefined as (undefined | number)
let appendCount = 0
const MAX_APPEND = 10 // After how many chart updates the data should be reset

const frameTime = ref(0)
let lastLoadTime = Date.now()

function loadChartData(chart: Chart, flightData: FlightDataState | undefined, range: TimeRange, resolution: AggregationLevels | 'smallest', isLive: boolean) {

    const startTime = Date.now()

    if (!flightData) {

        if (prev$.value)
            chart.unload({ ids: [...prev$.value] })

        prev$.value = undefined
        return
    }

    let times = ['time'] as (string | Date)[]
    const data = {} as { [seriesName: string]: (string | number | boolean | number[])[] }

    const curMeasurements = resolution === 'smallest' ?
        getValues(flightData.measurements, range.start, range.end)
        : getValues(flightData.measurements, range.start, range.end, true, resolution)

    const afterQueryTree = Date.now()

    let onlyAppend = true;

    for(const r of curMeasurements){

        const date = r.getDateTime()

        const curTime = date.getTime()

        if (!date)
            continue;

        if (curTime < range.start.getTime())
            continue;

        if (curTime > range.end.getTime())
            continue;

        if (prevMin && curTime < prevMin)
            onlyAppend = false

        times.push(date)
        for(const s of Object.keys(r.measurements_aggregated)){
            const value = r.measurements_aggregated[s]

            const valueActual = value[0] ?? value[2] ?? value[2]

            if (!data[s])
                data[s] = [s]

            if(typeof valueActual === 'number'){
                const valueTriple = [ value[2], value[0], value[1] ]
                data[s].push(valueTriple as number[])
                continue
            }
            if (typeof valueActual === 'string'){
                data[s].push(0)
                continue
            }
            
            data[s].push(valueActual)
        }
    }

    if(appendCount > MAX_APPEND)
        onlyAppend = false

    if(onlyAppend && prevMax){
        let i = 1
        while(i < times.length && (times[i] as Date).getTime() < prevMax)
            i++
        times = ['time', ...times.slice(i)]
        for(const key in data)
            data[key] = [key, ...data[key].slice(i)]
    }

    const afterDataPrepare = Date.now()

    chart.load({
        columns: [
            times,
            ...Object.keys(data).map(k => data[k])
        ],
        unload: prev$.value?.filter(p => !data[p]),
        append: onlyAppend,
    })
    chart.config('axis.x.min', range.start.getTime(), false)
    chart.config('axis.x.max', range.end.getTime(), false)


    const afterChartLoad = Date.now()

    prev$.value = [...Object.keys(data)]

    console.log(`Triggered chart reload for ${vesselPartId.value}. Took ${afterChartLoad - startTime}ms in total (${afterQueryTree-startTime}ms query, ${afterDataPrepare - afterQueryTree}ms data preparation and ${afterChartLoad-afterDataPrepare}ms for the chart) `)

    frameTime.value = afterChartLoad - lastLoadTime

    lastLoadTime = afterChartLoad

    prevMin = range.start.getTime()
    prevMax = times.length > 1 ? (times[times.length-1] as Date).getTime() : prevMax
    if(onlyAppend)
        appendCount++
    else
        appendCount = 0

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
        point: {
            r: 1
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

    // watch(timeRange, range => {

    //     const x = chart.x() as unknown as { [series: string]: Date[] }

    //     const availableSeries = Object.keys(x)

    //     if (!availableSeries || availableSeries.length < 1)
    //         return

    //     const usedSeries = availableSeries.map(s => x[s]).flat()

    //     if(usedSeries.length < 1)
    //         return

    //     let minDelta = Number.MAX_SAFE_INTEGER
    //     let min = usedSeries[0]

    //     for (const s of usedSeries){
    //         const cur = Math.abs(s.getTime() - range.cur.getTime())
    //         if(cur > minDelta)
    //             continue;

    //         minDelta = cur
    //         min = s
    //     }

    //     setTimeout(() =>{

    //         // Fix for a bug in the chart library. The chart library doesn't check if the
    //         // given x value still exists on the chart, if not it cras
    //         const chartInternal = chart as unknown as { internal: { getIndexByX(x: any): any} }
    //         if(!chartInternal.internal.getIndexByX(min))
    //             return

    //         chart.tooltip.show({
    //             x: min
    //         })
    //     });
    // }, { immediate: true, deep: true })

    watchDebounced([data, timeRange, resolution, live], ([flightData, range, resolution, isLive]) => {

        if (!flightData || !range)
            return

        loadChartData(chart, flightData, range, resolution, isLive)


    }, { immediate: true, deep: false, debounce: 50, maxWait: 100 })

})

onUnmounted(() => {
    if (chart$.value)
        chart$.value.destroy()
})


</script>
