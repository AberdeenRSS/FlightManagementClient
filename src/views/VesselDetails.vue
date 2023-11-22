<template>
  <div v-if="!!vessel" style="height: 100%; flex-direction: column;" class="d-flex ">

    <div>
      <div class="ma-2 font-weight-light text-h3">
        {{ vessel.name }}
      </div>

    </div>

    <div class="d-flex" style="min-height: 1px;">
      <div style="flex-basis: 200px; flex-grow: 0.4;">
        <VesselChart v-model="selected" :vessel-id="id"></VesselChart>
      </div>

      <div style="max-height: 100%; overflow-y: scroll; flex-grow: 1;">
        <FlightList :vessel-id="id"></FlightList>
      </div>
    </div>


  </div>
  <div v-else>
    <v-progress-circular indeterminate></v-progress-circular>
  </div>
</template>

<script setup lang="ts">
import VesselChart from '@/components/vessel/VesselChart.vue';
import FlightList from '@/components/flights/FlightList.vue';
import { useRoute } from 'vue-router';
import { ref } from 'vue';
import { fetchVesselsIfNecessary, getVessel } from '@/stores/vessels';

import { subscribeRealtime } from '@/stores/flight';
import { useObservableShallow } from '@/helper/reactivity';



const route = useRoute()
const id = route.params.id as string

fetchVesselsIfNecessary()
subscribeRealtime()

const vessel = useObservableShallow(getVessel(id))

const selected = ref({})

</script>
<style></style>
