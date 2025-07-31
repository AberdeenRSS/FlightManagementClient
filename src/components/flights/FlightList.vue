<template>
    <div class="table-container">
      <table class="table is-fullwidth is-striped is-hoverable">
        <thead>
          <tr>
            <th>Flight Name</th>
            <th>Date/Time</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in flightsSorted" :key="item._id">
            <td>
              <a 
                @click="router.push(`/flight/${item._vessel_id}/${item!._id}`)"
                class="has-text-link"
                >
                {{ item!.name }}
              </a>
            </td>
            <td>
              {{ new Date(Date.parse(asUtcString(item!.start))).toLocaleDateString() }}
              {{ new Date(Date.parse(asUtcString(item!.start))).toLocaleTimeString() }}
            </td>
            <td class="buttons">
              <button class="button is-primary" @click="router.push(`/flight/${item._vessel_id}/${item!._id}`)">
                View
              </button>
              <button 
                v-if="
                  item.permissions?.[currentUser!.uid] === 'owner' || 
                  item.no_auth_permission === 'owner' ||
                  vesselPermissions?.[currentUser!.uid] === 'owner' ||
                  vesselNoAuthPermissions === 'owner'"
                class="button is-danger is-light" 
                @click="deleteFlight(item._id)">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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