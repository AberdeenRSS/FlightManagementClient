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
            <td>
              <button class="button is-primary is-small" @click="router.push(`/flight/${item._vessel_id}/${item!._id}`)">
                Details
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
  
  const props = defineProps({
    vesselId: {
      type: String,
      required: true
    }
  });
  
  const { vesselId } = toRefs(props)
  const { $vesselId } = reactive({ $vesselId: vesselId })
  
  const router = useRouter()
  
  const flightsSorted$ = getFlights($vesselId).pipe(
    map(flights => Object.keys(flights.flights).map(k => flights.flights[k])),
    switchMap(flights => combineLatest(flights.map(f => fromImmediate(f.flight)))),
    map(flights => flights.sort((a, b) => Date.parse(asUtcString(b.start)) - Date.parse(asUtcString(a.start))))
  )
  
  const flightsSorted = useObservableShallow(flightsSorted$)
  
  watch(vesselId, v => fetchFlightsForVesselIfNecessary(v), { immediate: true })
  </script>
  
  <style scoped>
  .table-container {
    overflow-x: auto;
  }
  </style>