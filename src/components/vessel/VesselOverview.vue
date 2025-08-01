<template>
  <div class="content-container px-2">
    <v-row class="mb-5">
      <v-col>
        <h2 class="title is-4 mb-3">Vessels</h2>
      </v-col>
      <v-col class="text-right">
        <VesselCreate @vessel-created="fetchVesselsIfNecessary()"></VesselCreate>

      </v-col>
    </v-row>
    <div>
      <div v-if="loading === 'REQUESTED' || loading === 'NOT_REQUESTED'" class="text-center pa-4">
        <v-progress-circular indeterminate></v-progress-circular>
        <p class="mt-2">Loading vessels...</p>
      </div>
      
      <div v-else-if="loading === 'ERROR'" class="text-center pa-4">
        <v-alert type="error">Failed to load vessels</v-alert>
      </div>
      
      <VesselList v-else :vessels="vessels"></VesselList>
    </div>
  </div>
</template>

<style scoped>
.content-container {
  padding-top: 3rem;
  /* Adjust this value based on your navbar height */
}
</style>

<script setup lang="ts">
import { useObservableShallow } from '@/helper/reactivity';
import { fetchVesselsIfNecessary, getLoadingState, getVessels } from '@/stores/vessels';

import VesselCreate from './VesselCreate.vue';
import VesselList from './VesselList.vue';
import { computed } from 'vue';

const vesselsStore = useObservableShallow(getVessels(), { initialValue: undefined })
const loading = useObservableShallow(getLoadingState(), { initialValue: 'NOT_REQUESTED' });

const vessels = computed(()=> Object.values(vesselsStore.value || {}).map(v=> v.entity).filter(Boolean));

fetchVesselsIfNecessary()


</script>