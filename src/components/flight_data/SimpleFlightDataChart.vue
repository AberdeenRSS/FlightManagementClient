<template>
    <div class="chart">

        <canvas ref="viewport" class="chart"></canvas>
    </div>

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
import { useFlightViewState, type TimeRange } from '@/composables/useFlightView';
import { getValues, type AggregationLevels } from '@/helper/timeTree';
import { useFlightDataStore, type FlightDataState } from '@/stores/flight_data';
import { watchDebounced } from '@vueuse/core';
import { inject, onUnmounted, ref, shallowRef, triggerRef, watch, type Ref, type WatchStopHandle, onMounted, computed } from 'vue';
import { DASHBOARD_WIDGET_ID } from '../misc/dashboard/DashboardComposable';
import { useSelectedPart, useWidgetData } from './flightDashboardElemStoreTypes';

import { Chart, type ChartDataset, type DefaultDataPoint, type LegendItem } from 'chart.js'
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { fromImmediate, useObservableShallow } from '@/helper/reactivity';
import type { Flight } from '@/stores/flight';

import { from, useObservable } from '@vueuse/rxjs';
import { combineLatest, debounceTime, distinct, filter, map } from 'rxjs'
import { toJsType } from '@/helper/datatype_helper';

const rndCharMap = [
    22, 172, 124, 187, 131, 58, 193, 64, 232, 39, 114, 41, 209, 224, 27, 69, 202, 236, 112, 173, 47,
    173, 196, 219, 164, 198, 97, 88, 129, 34, 161, 238, 238, 24, 119, 21, 254, 170, 189, 54, 113,
    86, 87, 204, 127, 114, 162, 95, 200, 163, 165, 64, 41, 175, 128, 234, 113, 84, 23, 244, 179, 81,
    88, 207, 2, 92, 61, 38, 221, 157, 118, 219, 111, 194, 171, 246, 207, 124, 137, 49, 216, 129,
    105, 72, 84, 47, 38, 151, 72, 211, 48, 123, 80, 104, 231, 61, 186, 198, 15, 39, 231, 94,
    225, 38, 125, 204, 172, 250, 129, 204, 71, 103, 224, 69, 209, 88, 239, 228, 24, 197,
    36, 168, 151, 87, 13, 46, 206, 245, 241, 116, 75, 210, 244, 106, 231, 213, 83, 40,
    114, 16, 56, 98, 94, 77, 0, 87, 64, 123, 190, 42, 172, 230, 81, 173, 154, 151, 127,
    44, 119, 111, 145, 134, 110, 233, 108, 1, 57, 168, 16, 232, 250, 25, 226, 47, 143,
    38, 80, 206, 120, 53, 161, 61, 188, 106, 52, 64, 136, 228, 194, 21, 26, 198, 172, 229, 167, 9, 23, 116, 16, 238
]

const FAKE_TIMERANGE_DATASET = 'FAKE_TIMERANGE_DATASET'

const viewport = ref<HTMLCanvasElement>()

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Resizer not used in within a dashboard')

const { flightId, timeRange, resolution, live, vesselId } = useFlightViewState()

const widgetData = useWidgetData(dashboardWidgetId)

if (!widgetData.value.graphSeriesSetting)
    widgetData.value.graphSeriesSetting = {}

const mounted$ = ref(false)

onMounted(() => mounted$.value = true)

const fetchDebounceTime = computed(() => live.value ? 4000 : 300)

const timeRangeDebounced = shallowRef<TimeRange | undefined>(undefined)
const timeRangeFetchDebounced = shallowRef(timeRange.value)
watchDebounced(timeRange, r => { timeRangeDebounced.value = r ? { ...r } : undefined; triggerRef(timeRangeDebounced) }, { immediate: true, deep: true, debounce: 20, maxWait: 100 })
watchDebounced(timeRange, r => timeRangeFetchDebounced.value = r, { immediate: true, deep: true, debounce: fetchDebounceTime, maxWait: 5000 })

const { flight$ } = getFlightAndHistoricVessel(vesselId, flightId)
const selectedPartId = useSelectedPart(dashboardWidgetId)
const partId$ = fromImmediate(selectedPartId)

const availableSeries$ = combineLatest([partId$, flight$]).pipe(
  map(([pid, f]) => pid && f ? f.measured_parts[pid] : []),
);

const availableSeries = useObservable(availableSeries$)

const { getOrInitStore, fetchFlightDataInTimeFrame } = useFlightDataStore()


const data: Ref<Record<string, FlightDataState>> = shallowRef({});

// Watch widget data deep without watching chart$
const widgetDataDeep = useObservableShallow(from(widgetData, {deep: true, immediate: true}).pipe(debounceTime(100)))

const timeRangeWithoutCur$ = fromImmediate(timeRange, true).pipe(
    filter(r => !!r),
    map(r => ({start: r!.start, end: r!.end})),
    distinct((r) => `${r?.start}-${r?.end}`),
    debounceTime(500),
)

watch([flightId, selectedPartId, availableSeries, useObservableShallow(timeRangeWithoutCur$), resolution, live], ([flight, part, s, timeRange, res, l]) => {

    // Only fetch data if not live
    if(l)
        return

    if(!part || !s || !timeRange)
        return

    if(res === 'eternity')
        return

    for(const seriesDescriptor of s){

        fetchFlightDataInTimeFrame(flight, part, seriesDescriptor.name, timeRange.start, timeRange.end, res)
    }
})

let removeOldWatch = undefined as (WatchStopHandle | undefined)

watch([flightId, selectedPartId, availableSeries], ([flight, part, s]) => {

    if (!part || !s)
        return

    if (removeOldWatch)
        removeOldWatch()

    const addedWatches: (() => void)[] = []

    for(const descriptor of s){

        addedWatches.push(watch(getOrInitStore(flight, part, descriptor.name), d => {

            data.value[descriptor.name] = d;
            triggerRef(data) 

        }, { immediate: true, deep: false }))
    }
    
    removeOldWatch = () => addedWatches.forEach(w => w());

}, { immediate: true, deep: false })

const chart$ = shallowRef<Chart | undefined>(undefined)
const prev$ = ref<string[] | undefined>(undefined)

function loadChartData(chart: Chart, flightData: Record<string, FlightDataState> | undefined, range: TimeRange, resolution: AggregationLevels | 'smallest', _: boolean) {

    if (!flightData) {

        chart.data.datasets = []

        prev$.value = undefined
        return
    }

    type DataObj<T> = { x: number, y: T }

    const data = {} as { [seriesName: string]: (DataObj<number>)[] }

    const startTimestamp = range.start.getTime()
    const endTimestamp = range.end.getTime()


    for (const seriresName of Object.keys(flightData)){

        const curData = flightData[seriresName]

        const curMeasurements = resolution === 'smallest' ?
            getValues(curData.measurements, range.start, range.end)
            : getValues(curData.measurements, range.start, range.end, true, resolution)


        for (const r of curMeasurements) {

            const date = r.getDateTime()
            const curTime = date.getTime()

            if (!date)
                continue;

            if (curTime < startTimestamp)
                continue;

            if (curTime > endTimestamp)
                continue;


            if (!seriresName)
                continue

            const minKey = `${seriresName} (min)`
            const maxKey = `${seriresName} (max)`


            if (!data[seriresName]) {
                data[seriresName] = []
                data[minKey] = []
                data[maxKey] = []
            }

            if (typeof r.avg === 'number') {
                data[seriresName].push({ x: curTime, y: r.avg })
                data[minKey].push({ x: curTime, y: r.min as number })
                data[maxKey].push({ x: curTime, y: r.max as number })

                continue
            }
            // if (typeof valueActual === 'string') {
            //     continue;
            //     data[s].push({x: date, y: valueActual})
            //     continue
            // }

            // data[s].push(valueActual)
        }
    }
    

    for(const dataset of chart.data.datasets){

        if(!dataset.label || !data[dataset.label]){
            dataset.data = []
            continue
        }

        dataset.data = data[dataset.label]
    }

    // Set the fake dataset to have the selected time range
    // Fake dataset is always at index 0
    chart.data.datasets[0].data =  [{ x: range.start.getTime(), y: 0 }, { x: range.end.getTime(), y: 0 }]

    chart.scales['x'].min = range.start.getTime()
    chart.scales['x'].max = range.end.getTime()

    chart.options.plugins!.annotation!.annotations = {
        currentTime: {
            type: 'line',
            xMin: range.cur.getTime(),
            xMax: range.cur.getTime(),
            drawTime: 'beforeDatasetsDraw',
            borderWidth: 1,
            borderColor: 'black'

        }
    }

    chart.update()
}

function makeDatasets(flight: Flight, partId: string) {
    const availableSeries = flight.measured_parts[partId]

    const res: ChartDataset<'line', DefaultDataPoint<'line'>>[] = []

    for (const series of availableSeries) {


        // Get a "random" seed between
        // 0 and 255 based on the series name
        // Use it to obtain a random color
        let seed = 0
        for (let i = 0; i < series.name.length; i++){
            seed += rndCharMap[series.name.charCodeAt(i)%rndCharMap.length]
        }

        seed = seed % 255

        const baseColor = `hsla(${seed}, 100%, 30%, 1)`;
        const backgroundColor = `hsla(${seed}, 100%, 30%, 0.1)`;

        const jsType = toJsType(series.type)

        if (jsType === 'number' || jsType === 'boolean' || series.type === 'float' || series.type === 'int') {
            res.push({
                data: [],
                pointStyle: false,
                fill: '+1',
                label: `${series.name} (min)`,
                showLine: false,
                backgroundColor: backgroundColor
            })

            res.push({
                data: [],
                pointStyle: 'circle',
                pointRadius: 1,
                label: series.name,
                borderColor: baseColor,
                borderWidth: 1
            })

            res.push({
                data: [],
                pointStyle: false,
                fill: '-1',
                label: `${series.name} (max)`,
                showLine: false,
                backgroundColor: backgroundColor
            })
        }
    }

    return res
}

watch([useObservableShallow(flight$), selectedPartId, viewport, mounted$], ([flight, partId, v]) => {

    if (!flight || !partId || !v)
        return

    if (chart$.value)
        chart$.value.destroy()

    chart$.value = new Chart(v, {
        type: 'line',
        options: {
            parsing: false,
            normalized: true,
            animation: false,
            maintainAspectRatio: false,
            transitions: undefined,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    align: 'start',
                    labels: {
                        boxWidth: 10,
                    
                        generateLabels(chart){
                            return chart.data.datasets.map((d, i)=> ({
                                text: d.label,
                                // fontColor: d.borderColor,
                                fillStyle: d.borderColor,
                                datasetIndex: i,
                            } as LegendItem))
                        },
                        filter: (item: LegendItem, _) => !item.text.endsWith('(min)') && !item.text.endsWith('(max)') && item.text !== FAKE_TIMERANGE_DATASET
                    },
                    onHover(_, item, __){

                        const lastHoveredSeries = item.datasetIndex

                        if(lastHoveredSeries === undefined)
                            return

                        const points = this.chart.data.datasets[lastHoveredSeries].data.map((_, i) => ({index: i, datasetIndex: lastHoveredSeries!}))
                        this.chart.setActiveElements(points)
                        this.chart.update()
                    }
                },
                annotation: {
                    annotations: {}
                }
            },
            scales: {
                x: {
                    type: 'time',
                    offset: false,
                    // ticks: {
                    //     stepSize: 1,
                    //     sampleSize: 1,
                    //     callback: function (tickValue, index, ticks) {

                    //         if (!(index % Math.ceil(ticks.length / 5))) {
                    //             return format(tickValue as number, 'HH:mm:ss')
                    //         }

                    //     }
                    // }
                }
            }
        },
        data: {
            datasets: [
                {
                    label: FAKE_TIMERANGE_DATASET,
                    data: [],
                    showLine: false,
                    pointStyle: false
                },
                ...makeDatasets(flight, partId)
            ]
        }
    })

}, { immediate: true, deep: false })

watch([data, widgetDataDeep, timeRangeDebounced, resolution, live, chart$], ([flightData, wd, range, resolution, isLive, chart]) => {

    if (!flightData || !range || !chart || !wd)
        return

    chart.resize()

    loadChartData(chart, flightData, range, resolution, isLive)

}, { immediate: true, deep: false })

watch([widgetDataDeep, chart$], ([wd, chart]) => {

    if (!chart || !wd)
        return

    // for (const key in wd.graphSeriesSetting) {
    //     // const settings = wd.graphSeriesSetting[key]

    //     // const seriesIndex = chart.data.datasets.findIndex(d => d.label === key)
    //     // const minSeriesIndex = seriesIndex - 1
    //     // const maxSeriesIndex = seriesIndex + 1

    //     // return

    //     // if (settings.enabled)
    //     //     chart.show(seriesIndex)
    //     // else
    //     //     chart.hide(seriesIndex)

    //     // if (settings.enabled && settings.minMaxEnabled) {
    //     //     chart.show(minSeriesIndex)
    //     //     chart.show(maxSeriesIndex)
    //     // }
    //     // else {
    //     //     chart.hide(minSeriesIndex)
    //     //     chart.hide(minSeriesIndex)
    //     // }
    // }

    chart.update()


}, { immediate: true, deep: false })

onUnmounted(() => {
    if (chart$.value)
        chart$.value.destroy()
})


</script>
