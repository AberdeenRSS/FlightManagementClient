<template>
    <v-table>
        <thead>
            <tr>
                <th class="text-left">
                    Flight Name
                </th>
                <th class="text-left">
                    Date/Time
                </th>
                <th>

                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="item in flightsSorted" :key="item._id">
                <td>{{ item!.name }}</td>
                <td>{{ new Date(Date.parse(asUtcString(item!.start))).toLocaleDateString() }} {{ new
                Date(Date.parse(asUtcString(item!.start))).toLocaleTimeString() }}</td>

                <td>
                    <v-btn 
                        v-if="item!.end"
                        @click="router.push(`/flight/${item._vessel_id}/${item!._id}`)">
                        Details
                    </v-btn>
                    <v-btn 
                        v-else
                        color="primary"
                        @click="router.push(`/flight/${item._vessel_id}/${item!._id}`)">
                        Live
                    </v-btn>
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
