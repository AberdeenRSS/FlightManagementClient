<template>
    <div class="dashboard-container">
        <div class="dashboard-elem dashboard">

            <WidgetDashboard v-if="dashboardId" :dashboard-id="dashboardId">
                <VesselComponentDashboardElem>

                </VesselComponentDashboardElem>
            </WidgetDashboard>
        </div>
        <div class="dashboard-elem element-settings" v-if="elementInSettings">

            <ElementSettings :dashboard-widget-id="elementInSettings">

            </ElementSettings>
        </div>
    </div>


    <div class="playbar-drawer">

        <div v-if="extraView === 'command'">

            <div class="cmd-history">
                <CommandHistory></CommandHistory>
            </div>
            <div>
                <CommandDispatch :vessel-id="vessel_id" :flight-id="id"></CommandDispatch>
                <!-- <CommandDispatchBar :vessel-id="vessel_id" :flight-id="id" v-model:command-type="commandDispatchCommandType"
                    v-model:part-id="commandDispatchPartId">
                    <CommandDispatchButton :command-type="commandDispatchCommandType" :part="commandDispatchPartId">
                    </CommandDispatchButton>
                </CommandDispatchBar> -->
            </div>
        </div>

        <DashboardSaver v-if="extraView === 'dashboard'" v-model="dashboardId"></DashboardSaver>

        <Log v-if="extraView === 'log'"></Log>

        <AdvancedDatetimeSelector v-if="startTime && endTime" :start-date="startTime" :end-date="endTime"
            @current-date="currentDate = $event" @range-min-date="rangeMinDate = $event"
            @range-max-date="rangeMaxDate = $event" @live="$event => live = $event">

            <template v-slot:nav-items>

                <div class="justify-start">
                    <v-tooltip text="Resolution" location="top">
                        <template v-slot:activator="{ props: tooltipProps }">
                            <v-menu>
                                <template v-slot:activator="{ props }">
                                    <v-btn variant="plain" :ripple="false" :rounded="0" 
                                        v-bind="{ ...props, ...tooltipProps }">
                                        {{ resolutionTexts[resolution] }}
                                    </v-btn>
                                </template>
                                <v-list :value="resolution">
                                    <v-list-item v-for="(item, index) in resolutions" :key="index" :value="item">
                                        <v-list-item-title @click="setResolution(item)">{{ resolutionTexts[item]
                                        }}</v-list-item-title>
                                    </v-list-item>
                                </v-list>
                            </v-menu>
                        </template>
                    </v-tooltip>
                </div>

                <v-tooltip text="Save/Load Dashboard" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" :ripple="false" icon="mdi-view-dashboard" variant="plain"
                            @click="extraView = extraView == 'dashboard' ? undefined : 'dashboard'"></v-btn>
                    </template>
                </v-tooltip>

                <v-tooltip text="Dispatch/View Commands" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" :ripple="false" icon="mdi-console-line" variant="plain"
                            @click="extraView = extraView == 'command' ? undefined : 'command'"></v-btn>
                    </template>
                </v-tooltip>

                <v-tooltip text="Log" location="top">
                    <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" :ripple="false" icon="mdi-text" variant="plain"
                            @click="extraView = extraView == 'log' ? undefined : 'log'"></v-btn>
                    </template>
                </v-tooltip>
            </template>

        </AdvancedDatetimeSelector>

        <!-- <div class="pa-2">{{ flight?.name }}</div> -->

    </div>
</template>

<style lang="scss">
.dashboard-container {

    // padding-top: 0.5rem;
    height: calc(100vh - 168px);

    position: relative;

    .dashboard-elem {
        position: absolute;
    }

    .dashboard {
        height: 100%;

        overflow-y: scroll;
        overflow-x: hidden;
    }

    .element-settings {
        width: 100%;
        height: 100%;

        background-color: rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(10px) saturate(100%) contrast(45%) brightness(130%);
    }
}

.playbar-drawer {

    // border-top: solid 1px;

    box-shadow: 0 0 0.2rem 0.2rem lightgrey;



    padding-top: 0.5rem;

    position: -webkit-sticky;
    position: sticky;
    bottom: 0;
    background-color: white;


    // position: fixed;
    // bottom: 0;

    // width: 100%;
}
</style>
  
  
<script setup lang="ts">
import ElementSettings from '@/components/FlightDashboardElem/ElementSettings.vue';
import VesselComponentDashboardElem from '@/components/FlightDashboardElem/VesselComponentDashboardElem.vue';
import DashboardSaver from '@/components/misc/dashboard/DashboardSaver.vue';
import CommandDispatch from '@/components/command/CommandDispatch.vue';
import AdvancedDatetimeSelector from '@/components/misc/advanced-datetime-selector/AdvancedDatetimeSelector.vue';
import CommandHistory from '@/components/command/CommandHistory.vue'
import Log from '@/components/flight_data/Log.vue';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDashboardPersistStore } from '@/components/misc/dashboard/DashboardComposable';
import WidgetDashboard from '@/components/misc/dashboard/WidgedDashboard.vue';
import { useFlightViewState, useProvideFlightView, type TimeRange } from '@/composables/useFlightView';
import type { AggregationLevels } from '@/helper/timeTree';
import { useCommandStore } from '@/stores/commands';
import { fetchFlightsForVesselIfNecessary, getFlight} from '@/stores/flight';
import { v4 } from 'uuid';

import { useObservableShallow } from '@/helper/reactivity';
import { fetchHistoricVessel } from '@/stores/vessels';
import { filter } from 'rxjs';

import { useFlightDataStore } from '@/stores/flight_data';
import {asUtcString} from '@/helper/time'

const route = useRoute()
const vessel_id = route.params.vessel_id as string
const id = route.params.id as string

const { availableDashboards, loadDashboardIndicesFromStorage } = useDashboardPersistStore()

loadDashboardIndicesFromStorage()
const dashboardId = ref<string>(availableDashboards.value.length > 0 ? (availableDashboards.value.find(v => v.isDefault)?.id ?? availableDashboards.value[0].id) : v4())

const extraView = ref<undefined | 'command' | 'dashboard' | 'log'>()

const live = ref(false)

const resolutions: (AggregationLevels | 'smallest')[] = ['smallest', 'decisecond', 'second', 'minute', 'hour']

const resolutionTexts: { [_ in AggregationLevels | 'smallest']?: string } = {
    'smallest': 'smallest',
    'decisecond': '100ms',
    'second': 'seconds',
    'minute': 'minutes',
    'hour': 'hours',
}

// const commandDispatchPartId = ref<string | undefined>()
// const commandDispatchCommandType = ref<string | undefined>()


const { setTimeRange, setFlightId, setVesselId, setLive, setResolution, elementInSettings } = useProvideFlightView()

const { resolution, timeRange } = useFlightViewState()

const { fetchCommandsInTimeFrame } = useCommandStore()
const { subscribeRealtime: subscribeRealtimeFlightData } = useFlightDataStore()


setVesselId(vessel_id)
setFlightId(id)

watch(live, l => {
    setLive(l)
    if (l) {
        setResolution('second')
    }
},{ immediate: true })

fetchFlightsForVesselIfNecessary(vessel_id)

const flight$ = getFlight(vessel_id, id)
const flight = useObservableShallow(flight$)


const startTime = computed(() => flight.value ? new Date(Date.parse(asUtcString(flight.value.start))) : undefined)
const endTime = computed(() => (flight.value && flight.value.end) ? new Date(Date.parse(asUtcString(flight.value.end))) : undefined)

const rangeMinDate = ref()
const rangeMaxDate = ref()
const currentDate = ref()

// const selectedDatetime = computed(() => ({start: rangeMinDate, end: rangeMaxDate, cur: currentDate}))

const selectedDatetime = ref<TimeRange>()

watch([rangeMinDate, rangeMaxDate, currentDate], ([start, end, cur]) => {

    if (!start || !end || !cur)
        return

    if (!selectedDatetime.value) {
        selectedDatetime.value = { start, end, cur }
        return
    }

    selectedDatetime.value.start = start;
    selectedDatetime.value.end = end;
    selectedDatetime.value.cur = cur;

    //  = {start, end, cur};
}, { immediate: true })

watch(selectedDatetime, setTimeRange, { immediate: true, deep: true })

watch(timeRange, r => {

    if (!r)
        return

    fetchCommandsInTimeFrame(id, r.start, r.end)

}, { immediate: true, deep: true })

watch(flight, f => {
    if(!f)
        return

    subscribeRealtimeFlightData(f)
}, { immediate: true, deep: true })

flight$.pipe(filter(f => !!f)).subscribe(f => fetchHistoricVessel(f!._vessel_id, f!._vessel_version))

</script>

