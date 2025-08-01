<template>
  <v-table striped="even" density="compact">
    <thead>
      <tr>
        <th class="text-left">Flight Name</th>
        <th class="text-left">Date/Time</th>
        <th class="text-left"></th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="!flightsSorted || flightsSorted.length === 0">
        <td colspan="3" class="text-center">
          No flights found.
        </td>
      </tr>
      <tr v-for="flight in flightsSorted" :key="flight?._id">
        <td>
          <v-btn
            @click="router.push(`/flight/${flight._vessel_id}/${flight!._id}`)"
             variant="text" color="primary" size="small"
            >
            {{ flight!.name }}
          </v-btn>
        </td>
        <td>
          {{ new Date(Date.parse(asUtcString(flight!.start))).toLocaleDateString() }}
          {{ new Date(Date.parse(asUtcString(flight!.start))).toLocaleTimeString() }}
        </td>
        <td class="buttons">
              <button class="button is-primary" @click="router.push(`/flight/${flight._vessel_id}/${flight!._id}`)">
                View
              </button>
              <button 
                v-if="
                  flight.permissions?.[currentUser!.uid] === 'owner' || 
                  flight.no_auth_permission === 'owner' ||
                  vesselPermissions?.[currentUser!.uid] === 'owner' ||
                  vesselNoAuthPermissions === 'owner'"
                class="button is-danger is-light" 
                @click="deleteFlight(flight._id)">
                Delete
              </button>
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
    }
  });

  const { vesselId } = toRefs(props)
  const { $vesselId } = reactive({ $vesselId: vesselId })
  const { currentUser } = useUser();
  import { useAuthHeaders } from '../../composables/api/getHeaders'
  import { useRssApiBaseUri } from '@/composables/api/rssFlightServerApi';
  import axios from 'axios';
  
  const router = useRouter()
  const authHeaders = useAuthHeaders();
  
  
  
  const flightsSorted$ = getFlights($vesselId).pipe(
    map(flights => Object.keys(flights.flights).map(k => flights.flights[k])),
    switchMap(flights => combineLatest(flights.map(f => fromImmediate(f.flight)))),
    map(flights => flights.sort((a, b) => Date.parse(asUtcString(b.start)) - Date.parse(asUtcString(a.start))))
  )

  const flightsSorted = useObservableShallow(flightsSorted$)

  async function deleteFlight(flight_id: string) {
    if (!window.confirm('Are you sure you want to delete this flight?')) {
      return;
    }
    try {
      const result = await axios.delete(`${useRssApiBaseUri()}/v1/flights/${flight_id}`, { headers: authHeaders.value })
      if (result.status === 200) {
        alert("Flight deleted successfully")
      } else {
        alert("Failed to delete flight: " + result.statusText)
      }
    } catch (e) {
      alert("Error deleting flight: " + e)
    }
  }
  
  
  
  watch(vesselId, v => fetchFlightsForVesselIfNecessary(v), { immediate: true })
  </script>
  
  <style scoped>
  .table-container {
    overflow-x: auto;
  }
  </style>