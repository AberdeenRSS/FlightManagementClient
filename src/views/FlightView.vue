<template>
    <div class="dashboard-container">

        <WidgetDashboard v-if="dashboardId" :dashboard-id="dashboardId">
            <VesselComponentDashboardElem>

            </VesselComponentDashboardElem>
        </WidgetDashboard>
    </div>


    <div class="playbar-drawer">
        <CommandDispatchBar v-if="extraView === 'command'" :vessel-id="vessel_id" :flight-id="id"></CommandDispatchBar>
        <DashboardSaver v-if="extraView === 'dashboard'" v-model="dashboardId"></DashboardSaver>
        <AdvancedDatetimeSelector :start-date="startTime" :end-date="endTime" @current-date="currentDate = $event"
            @range-min-date="rangeMinDate = $event" @range-max-date="rangeMaxDate = $event" @live="$event => live = $event">

            <template v-slot:nav-items>

                <div class="justify-start">
                    <v-tooltip text="Resolution" location="top">
                        <template v-slot:activator="{ props: tooltipProps }">
                            <v-menu>
                                <template v-slot:activator="{ props }">
                                    <v-btn variant="plain"  :ripple="false" :rounded="0" color="dark"
                                        v-bind="{...props, ...tooltipProps}">
                                        {{ resolutionTexts[resolution] }}
                                    </v-btn>
                                </template>
                                <v-list :value="resolution">
                                    <v-list-item v-for="(item, index) in resolutions" :key="index" :value="item">
                                        <v-list-item-title  @click="setResolution(item)">{{ resolutionTexts[item]
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
            </template>

        </AdvancedDatetimeSelector>

        <!-- <div class="pa-2">{{ flight?.name }}</div> -->

    </div>
</template>

<style lang="scss">
.dashboard-container {
    height: calc(100vh - 168px);
    overflow-y: scroll;
    padding-top: 0.5rem;
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
import { useRoute } from 'vue-router';
import { useFlightStore } from '@/stores/flight';
import { computed, ref, watch } from 'vue';
import VesselComponentDashboardElem from '@/components/FlightDashboardElem/VesselComponentDashboardElem.vue';
import DashboardSaver from '@/components/misc/dashboard/DashboardSaver.vue';

import WidgetDashboard from '@/components/misc/dashboard/WidgedDashboard.vue'
import AdvancedDatetimeSelector from '@/components/misc/advanced-datetime-selector/AdvancedDatetimeSelector.vue';
import CommandDispatchBar from '@/components/command/CommandDispatchBar.vue'
import { useFlightViewState, useProvideFlightView, type TimeRange } from '@/composables/useFlightView'
import { useCommandStore } from '@/stores/commands';
import { watchDebounced, watchThrottled } from '@vueuse/shared';
import type { AggregationLevels } from '@/helper/timeTree';
import { useDashboardPersistStore } from '@/components/misc/dashboard/DashboardComposable';
import { v4 } from 'uuid';

const route = useRoute()
const vessel_id = route.params.vessel_id as string
const id = route.params.id as string

const {availableDashboards, loadDashboardIndicesFromStorage, tryLoadDashboardFromStorage} = useDashboardPersistStore()

loadDashboardIndicesFromStorage()
const dashboardId = ref<string>(availableDashboards.value.length > 0 ? (availableDashboards.value.find(v => v.isDefault)?.id ?? availableDashboards.value[0].id) : v4())

const extraView = ref<undefined | 'command' | 'dashboard'>()

const live = ref(false)

const resolutions: (AggregationLevels | 'smallest')[] = ['smallest', 'decisecond', 'second', 'minute', 'hour']

const resolutionTexts: { [P in AggregationLevels | 'smallest']?: string } = {
    'smallest': 'smallest',
    'decisecond': '100ms',
    'second': 'seconds',
    'minute': 'minutes',
    'hour': 'hours',
}

const { setTimeRange, setFlightId, setVesselId, setLive, setResolution } = useProvideFlightView()

const { resolution, timeRange } = useFlightViewState()

const { subscribeRealtime: subscribeRealtimeCommands, fetchCommandsInTimeFrame } = useCommandStore()

setVesselId(vessel_id)
setFlightId(id)

watch(live, l => setLive(l), { immediate: true })

const flightStore = useFlightStore()
flightStore.fetchFlightsForVesselIfNecessary(vessel_id)

const flight = computed(() => flightStore.vesselFlights[vessel_id]?.flights[id]?.flight)

const startTime = computed(() => flight.value ? new Date(Date.parse(flight.value.start)) : new Date())
const endTime = computed(() => flight.value && flight.value.end ? new Date(Date.parse(flight.value.end)) : new Date())

const rangeMinDate = ref(new Date())
const rangeMaxDate = ref(new Date())
const currentDate = ref(new Date())

// const selectedDatetime = computed(() => ({start: rangeMinDate, end: rangeMaxDate, cur: currentDate}))

const selectedDatetime = ref<TimeRange>({ start: new Date(), end: new Date(), cur: new Date() })

watchDebounced([rangeMinDate, rangeMaxDate, currentDate], ([start, end, cur]) => {
    selectedDatetime.value.start = start;
    selectedDatetime.value.end = end;
    selectedDatetime.value.cur = cur;

    //  = {start, end, cur};
}, { immediate: true, debounce: 200, maxWait: 1000 })

watch(selectedDatetime, setTimeRange, { immediate: true, deep: true })

watch(timeRange, r => {

    fetchCommandsInTimeFrame(id, r.start, r.end)

}, {immediate: true, deep: true})

subscribeRealtimeCommands(id)

</script>

