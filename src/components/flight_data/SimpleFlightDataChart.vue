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
import { until, watchThrottled } from '@vueuse/core';
import { computed, onMounted, reactive, toRefs, watch, onUnmounted, ref, type Ref, type WatchStopHandle } from 'vue';
import bb, { line, scatter, zoom, type Chart } from "billboard.js";
import { isAggregatedMeasurement, useFlightDataStore, type FlightDataChunkAggregated, type FlightDataState } from '@/stores/flight_data'
import { useVesselStore } from '@/stores/vessels';
import { getValues } from '@/helper/timeTree';

const divID = `chart_div${Math.floor(Math.random() * 1000000)}`

const props = defineProps({
    vesselId: {
        type: String,
        required: true
    },
    flightId: {
        type: String,
        required: true
    },
    vesselPartId: {
        type: String,
        required: true
    },
    selectedTimeRange: {
        type: Object,
        required: true
    }
});

const { flightId, vesselPartId, vesselId, selectedTimeRange } = toRefs(props)

const realtime = ref(false)

const { store: store$, fetchFlightDataInTimeFrame } = useFlightDataStore()

const vesselStore = useVesselStore()
vesselStore.fetchVesselsIfNecessary()
const getVessel = vesselStore.getVessel

const part = computed(() => getVessel(vesselId.value)?.parts.find(p => p._id === vesselPartId.value))

const data: Ref<FlightDataState | undefined> = ref(undefined)

watch([store$, flightId, vesselPartId, selectedTimeRange], ([store, flight, part, timeRange]) => {

    const id = `${flight}*${part}`

    data.value = store.flight_data?.[id]


}, { immediate: true, deep: true })

const chart$ = ref<Chart | undefined>(undefined)
const prev$ = ref<string[] | undefined>(undefined)

function loadChartData(chart: Chart, flightData: FlightDataState | undefined) {


    if (!flightData) {

        if (prev$.value)
            chart.unload({ ids: [...prev$.value] })

        prev$.value = undefined
        return
    }

    const times = ['time'] as (string | Date)[]
    const data = {} as { [seriesName: string]: (string | number | boolean)[] }

    const curMeasurements = getValues(flightData.measurements, selectedTimeRange.value.start, selectedTimeRange.value.end, 'decisecond')

    curMeasurements.forEach(x => {

        const r = x as FlightDataChunkAggregated

        const date = typeof r.start_date === 'string' ? new Date(Date.parse(r.start_date)) : r.start_date;
        if (!date)
            return;

        if (date.getTime() < selectedTimeRange.value.start.getTime())
            return;

        if (date.getTime() > selectedTimeRange.value.end.getTime())
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
            type: scatter(),
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
        bindto: `#${divID}`
    });

    chart$.value = chart


    watchThrottled([data, selectedTimeRange], ([flightData, range]) => {

        if (!flightData)
            return

        loadChartData(chart, flightData)


    }, { immediate: true, deep: true, throttle: 500 })

})

onUnmounted(() => {
    if (chart$.value)
        chart$.value.destroy()
})


</script>
