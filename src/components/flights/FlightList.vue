<template>
    <div>
        <div class="text-h5">Flights</div>
        <v-table>
            <thead>
                <tr>
                    <th class="text-left">
                        Id
                    </th>
                    <th class="text-left">
                        Name
                    </th>
                    <th>

                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(item, key) in flights" :key="key">
                    <td>{{ item.flight!._id }}</td>
                    <td>{{ item.flight!.name }}</td>
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


</script>
