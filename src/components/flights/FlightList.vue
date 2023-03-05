<template>
    <div style="width: 100%;">
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
                <tr v-for="item in flightsSorted" :key="item.flight._id">
                    <td>{{ item.flight!.name }}</td>
                    <td>{{new Date(Date.parse(item.flight!.start)).toLocaleDateString()}} {{  new Date(Date.parse(item.flight!.start)).toLocaleTimeString() }}</td>

                    <td><v-btn @click="router.push(`/flight/${item.flight._vessel_id}/${item.flight!._id}`)">Details</v-btn></td>
                </tr>
            </tbody>
        </v-table>
    </div>

</template>

<script setup lang="ts">
import { useFlightStore } from '@/stores/flight';
import { computed, reactive, toRefs } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
    vesselId: {
        type: String,
        required: true
    }
});

const { vesselId } = toRefs(props)
const { $vesselId } = reactive({$vesselId: vesselId})

const flightStore = useFlightStore()
const router = useRouter()

flightStore.fetchFlightsForVesselIfNecessary($vesselId)

const flights = computed(() => flightStore.vesselFlights[$vesselId].flights)

const flightsSorted = computed(() => Object.keys(flights.value).map(k => flights.value[k]).sort((a, b) => Date.parse(b.flight.start) - Date.parse(a.flight.start) ))


</script>
