<template>
  <v-table striped="even" density="compact">
    <thead>
      <tr>
        <th class="text-left">Flight Name</th>
        <th class="text-left">Date/Time</th>
        <th class="text-left">Duration</th>
        <th class="text-left"></th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="loading === 'REQUESTED' || loading === 'NOT_REQUESTED'" class="text-center">
        <td colspan="3">
          <v-progress-circular indeterminate></v-progress-circular>
          <p class="mt-2">Loading flights...</p>
        </td>
      </tr>
      <tr v-else-if="loading === 'ERROR'" class="text-center">
        <td colspan="3">
          <v-alert type="error">Failed to load flights</v-alert>
        </td>
      </tr>
      <tr v-else-if="!flightsSorted || flightsSorted.length === 0">
        <td colspan="3" class="text-center">
          No flights found.
        </td>
      </tr>
      <tr v-else v-for="flight in flightsSorted" :key="flight?._id">
        <td>
          <v-btn @click="router.push(`/flight/${flight._vessel_id}/${flight!._id}`)" variant="text" color="primary">
            {{ flight!.name }}
          </v-btn>
        </td>
        <td>
          {{ new Date(Date.parse(asUtcString(flight!.start))).toLocaleDateString() }}
          {{ new Date(Date.parse(asUtcString(flight!.start))).toLocaleTimeString() }}
        </td>
        <td>
          <FlightDurationBadge :start="flight!.start" :end="flight?.end" />
        </td>
        <td class="text-right">
          <v-menu>
              <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" icon variant="text" size="small">
                      <v-icon>mdi-dots-vertical</v-icon>
                  </v-btn>
              </template>

              <v-list density="compact">
                  <v-list-item v-if="
                  flight.permissions?.[currentUser!.uid] === 'owner' ||
                  flight.no_auth_permission === 'owner' ||
                  vesselPermissions?.[currentUser!.uid] === 'owner' ||
                  vesselNoAuthPermissions === 'owner'" @click="deleteFlight(flight?._id)">
                      <template v-slot:prepend>
                          <v-icon color="error">mdi-delete</v-icon>
                      </template>
                      <v-list-item-title class="text-error">Delete</v-list-item-title>
                  </v-list-item>
              </v-list>
          </v-menu>
        </td>

      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import { fromImmediate, useObservableShallow } from '@/helper/reactivity';
import { fetchFlightsForVesselIfNecessary, getFlights } from '@/stores/flight';
import { asUtcString } from '@/helper/time'
import { combineLatest, map, switchMap } from 'rxjs';
import { reactive, toRefs, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUser } from '@/composables/auth/useUser';

import { deleteRssApi } from '@/composables/api/rssFlightServerApi';
import type { LoadingStates } from '@/stores/flight';
import FlightDurationBadge from '@/components/flights/FlightDurationBadge.vue';
import { until } from '@vueuse/core';


const props = defineProps({
  vesselId: {
    type: String,
    required: true
  },
  vesselPermissions: {
    type: Object,
    default: () => ({}),
    required: false
  },
  vesselNoAuthPermissions: {
    type: String,
    required: false
  },
  loading: {
    type: String as () => LoadingStates,
    default: 'NOT_REQUESTED',
    required: true
  }
});

const { vesselId } = toRefs(props)
const { $vesselId } = reactive({ $vesselId: vesselId })
const { currentUser } = useUser();

const router = useRouter()



const flightsSorted$ = getFlights($vesselId).pipe(
  map(flights => Object.keys(flights.flights).map(k => flights.flights[k])),
  switchMap(flights => combineLatest(flights.map(f => fromImmediate(f.flight)))),
  map(flights => flights.sort((a, b) => Date.parse(asUtcString(b.start)) - Date.parse(asUtcString(a.start))))
)

const flightsSorted = useObservableShallow(flightsSorted$)

const loading = useObservableShallow(getFlights($vesselId).pipe(
  map(flights => flights.loading)
), { initialValue: props.loading });


async function deleteFlight(flight_id: string) {
  if (!window.confirm('Are you sure you want to delete this flight?')) {
    return;
  }
  const { error, isFinished } = await deleteRssApi(`/v1/flights/${flight_id}`);
  await until(isFinished).toBe(true);

  if (error.value) {
    alert("Error deleting flight: " + error.value);
  } else {
    alert("Flight deleted successfully");
  }
}



watch(vesselId, v => fetchFlightsForVesselIfNecessary(v), { immediate: true })
</script>

<style scoped>
.table-container {
  overflow-x: auto;
}
</style>