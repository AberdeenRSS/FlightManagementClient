<template>
  <div v-if="!!getVessel(id)" class="">
    <div class="ma-2 font-weight-light text-h3">
      {{ getVessel(id)?.name }}
    </div>
    
    <v-divider></v-divider>

    <div class="d-flex">
      <VesselChart :vessel-id="id"></VesselChart>
      <FlightList :vessel-id="id"></FlightList>
    </div>

    
  </div>
  <div v-else>
    <v-progress-circular indeterminate></v-progress-circular>
  </div>

</template>

<script setup lang="ts">
import VesselChart from '@/components/vessel/VesselChart.vue';
import FlightList from '@/components/flights/FlightList.vue';
import { useVesselStore } from '@/stores/vessels';
import { useRoute } from 'vue-router';


const route = useRoute()
const id = route.params.id as string

const vesselStore = useVesselStore()

vesselStore.fetchVesselsIfNecessary()

const getVessel = vesselStore.getVessel


</script>
<style>

</style>
