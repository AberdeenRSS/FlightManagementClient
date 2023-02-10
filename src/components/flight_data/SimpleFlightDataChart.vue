<template>
    <v-navigation-drawer permanent expand-on-hover rail location="right" width="300">
        <v-list>
            <v-list-item prepend-icon="mdi-engine" :title="part?.name"></v-list-item>
        </v-list>

        <v-divider></v-divider>

        <v-list density="compact" nav>
            <v-list-item prepend-icon="mdi-update">
                <template v-slot:default>
                    <v-switch color="red" label="Realtime" v-model="realtime"></v-switch>
                </template>
            </v-list-item>
            <v-list-item v-if="!realtime" prepend-icon="mdi-calendar-range" title="Shared with me">
                <template v-slot:prepend>
                    <div class="pa-0">

                        <v-text-field hint="Start" type="datetime-local" single-line variant="underlined"
                            density="compact">
                        </v-text-field>
                        <v-text-field hint="End" type="datetime-local" single-line variant="underlined"
                            density="compact">
                        </v-text-field>
                    </div>
                </template>
            </v-list-item>
        </v-list>
    </v-navigation-drawer>
    <v-main>
        <div>
            <div :id="divID"></div>
        </div>
    </v-main>

</template>

<script setup lang="ts">
import { fetchRssApi } from '@/composables/api/rssFlightServerApi';
import { until } from '@vueuse/core';
import { computed, onMounted, reactive, toRefs, watch, onUnmounted, ref, type Ref, type WatchStopHandle } from 'vue';
import bb, { line, zoom, type Chart } from "billboard.js";
import { isAggregatedMeasurement, useFlightDataStore, type FlightDataState } from '@/stores/flight_data'
import { useVesselStore } from '@/stores/vessels';

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

const store = useFlightDataStore()

const vesselStore = useVesselStore()
vesselStore.fetchVesselsIfNecessary()
const getVessel = vesselStore.getVessel

const part = computed(() => getVessel(vesselId.value)?.parts.find(p => p._id === vesselPartId.value))

if (!store.flight_data)
    store.flight_data = {}

watch([flightId, vesselPartId, selectedTimeRange], ([v, id, timeRange]) => store.fetchFlightDataInTimeFrame(v, id, timeRange.start, timeRange.end), { immediate: true })

watch([flightId], ([v]) => store.subscribeRealtime(v), { immediate: true })


const data: Ref<FlightDataState | undefined> = ref(undefined)

let oldWatch: WatchStopHandle | undefined = undefined

watch([store.flight_data, flightId, vesselPartId, selectedTimeRange], ([flight_data, flight, part, timeRange]) => {

    const id = `${flight}*${part}`

    if (!flight_data[id]) {
        store.fetchFlightDataInTimeFrame(flight, part, timeRange.start, timeRange.end)
        store.subscribeRealtime(flight)
    }

    if (oldWatch)
        oldWatch()

    oldWatch = watch(flight_data[id], d => {
        data.value = d
    }, { immediate: true })

}, { immediate: true })

const chart$ = ref<Chart | undefined>(undefined)
const prev$ = ref<string[] | undefined>(undefined)

function loadChartData(chart: Chart, flightData: FlightDataState | undefined) {


    if (!flightData || flightData.measuredValues.length < 1) {

        if (prev$.value)
            chart.unload({ ids: [...prev$.value] })

        prev$.value = undefined
        return
    }

    const times = ['time'] as (string | Date)[]
    const data = {} as { [seriesName: string]: (string | number | boolean)[] }

    flightData.measuredValues.forEach(r => {

        const date = r._datetime ?? r.start_date;
        if (!date)
            return;

        times.push(date)
        Object.keys(r.measured_values).forEach(s => {
            if (!data[s])
                data[s] = [s]

            const value = r.measured_values[s]
            data[s].push(isAggregatedMeasurement(value) ? value.avg : value)
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
        axis: {
            x: {
                type: "timeseries",
                tick: {
                    format: "%Y-%m-%d"
                }
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


    watch(data, (flightData) => {

        loadChartData(chart, flightData)


    }, { immediate: true, deep: true })

})

onUnmounted(() => {
    if (chart$.value)
        chart$.value.destroy()
})


</script>
