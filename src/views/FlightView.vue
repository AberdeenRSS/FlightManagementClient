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

    <WidgedDashboard>
        <template v-slot:VesselSelect>
            <VesselComponentDashboardElem :vessel-id="vessel_id" >
                       
            </VesselComponentDashboardElem>
        </template>
        <!-- <template v-slot:Preview>
            <v-card height="100%" width="100%">
                <VesselComponentDashboardElem v-if="selected">
                    <SimpleFlightDataChart :vessel-id="vessel_id" :flight-id="id" :vessel-part-id="selected">
                    </SimpleFlightDataChart>

                </VesselComponentDashboardElem>
            </v-card>
        </template> -->
    </WidgedDashboard>

</template>


  
<script setup lang="ts">
import FlightList from '@/components/flights/FlightList.vue';
import { useRoute } from 'vue-router';
import { useFlightStore } from '@/stores/flight';
import { computed, reactive, ref } from 'vue';
import { useRssWebSocket } from '@/composables/api/rssFlightServerApi';
import { until, } from '@vueuse/core';
import VesselComponentDashboardElem from '@/components/flight_data/VesselComponentDashboardElem.vue';
import SimpleFlightDataChart from '@/components/flight_data/SimpleFlightDataChart.vue';
import { waitUntil } from '@/helper/reactivity';

import WidgedDashboard from '@/components/misc/dashboard/WidgedDashboard.vue'

const route = useRoute()
const vessel_id = route.params.vessel_id as string
const id = route.params.id as string

const flightStore = useFlightStore()
flightStore.fetchFlightsForVesselIfNecessary(vessel_id)

const flight = computed(() => flightStore.vesselFlights[vessel_id]?.flights[id]?.flight)



</script>
<style>

</style>
  