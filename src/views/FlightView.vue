<template>
    <template v-if="flight">
        <div class="ma-2 font-weight-light text-h3">
            {{ flight?.name }}
        </div>

        <v-divider></v-divider>

        <v-container :fluid="true" class="ma-0">
            <v-row>
                <v-col cols="6">
                    
                </v-col>
                <v-col cols="6">
                    
                </v-col>
            </v-row>

        </v-container>


    </template>
    <div v-else>
        <v-progress-circular indeterminate></v-progress-circular>
    </div>

    <WidgetDashboard>
            <VesselComponentDashboardElem v-slot="slotData" :vessel-id="vessel_id" :flight-id="id" :selected-time-range="selectedDatetime">
                       
            </VesselComponentDashboardElem>
        <!-- <template v-slot:Preview>
            <v-card height="100%" width="100%">
                <VesselComponentDashboardElem v-if="selected">
                    <SimpleFlightDataChart :vessel-id="vessel_id" :flight-id="id" :vessel-part-id="selected">
                    </SimpleFlightDataChart>

                </VesselComponentDashboardElem>
            </v-card>
        </template> -->
    </WidgetDashboard>

    <div class="playbar-drawer">
        <CommandDispatch :vessel-id="vessel_id" :flight-id="id"></CommandDispatch>
        <hr>
        <AdvancedDatetimeSelector :start-date="startTime" :end-date="endTime" @current-date="currentDate = $event" @range-min-date="rangeMinDate = $event" @range-max-date="rangeMaxDate = $event" ></AdvancedDatetimeSelector>
    </div>

</template>


  
<script setup lang="ts">
import FlightList from '@/components/flights/FlightList.vue';
import { useRoute } from 'vue-router';
import { useFlightStore } from '@/stores/flight';
import { computed, reactive, ref, type Ref, watch } from 'vue';
import { useRssWebSocket } from '@/composables/api/rssFlightServerApi';
import { until, } from '@vueuse/core';
import VesselComponentDashboardElem from '@/components/flight_data/VesselComponentDashboardElem.vue';
import SimpleFlightDataChart from '@/components/flight_data/SimpleFlightDataChart.vue';
import { waitUntil } from '@/helper/reactivity';

import WidgetDashboard from '@/components/misc/dashboard/WidgedDashboard.vue'
import AdvancedDatetimeSelector from '@/components/misc/advanced-datetime-selector/AdvancedDatetimeSelector.vue';
import CommandDispatch from '@/components/command/CommandDispatch.vue'

type TimeRange = {start: Date, end: Date, cur: Date}


const route = useRoute()
const vessel_id = route.params.vessel_id as string
const id = route.params.id as string

const flightStore = useFlightStore()
flightStore.fetchFlightsForVesselIfNecessary(vessel_id)

const flight = computed(() => flightStore.vesselFlights[vessel_id]?.flights[id]?.flight)

const startTime = computed(() => flight.value ? new Date(Date.parse(flight.value.start)) : new Date())
const endTime = computed(() => new Date(startTime.value.getTime() + 1000*60*60 ))

const rangeMinDate = ref(new Date())
const rangeMaxDate = ref(new Date())
const currentDate = ref(new Date())

// const selectedDatetime = computed(() => ({start: rangeMinDate, end: rangeMaxDate, cur: currentDate}))

const selectedDatetime = ref<TimeRange>({start: new Date(), end: new Date(), cur: new Date()})

watch([rangeMinDate, rangeMaxDate, currentDate], ([start, end, cur]) => {
    selectedDatetime.value.start = start;
    selectedDatetime.value.end = end;
    selectedDatetime.value.cur = start;

    //  = {start, end, cur};
}, {immediate: true})

</script>

<style lang="scss">
    .playbar-drawer {
        position: -webkit-sticky;
        position: sticky;
        bottom: 0;
        background-color: white;
    }
</style>
  