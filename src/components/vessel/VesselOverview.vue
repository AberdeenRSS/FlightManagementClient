<template>
    <v-container fluid>
        <v-card class="pa-4">
    <v-card-title class="text-h6 pb-2">Add Vessel</v-card-title>
    <v-text-field 
      v-model="newVesselName" 
      label="New Vessel Name"
      class="flex-grow-1"
      density="compact"
      variant="outlined"
      hide-details
    >
      <template v-slot:append-inner>
        <v-btn 
          @click="addVessel"
          density="compact"
          color="primary"
        >
          Submit
        </v-btn>
      </template>
    </v-text-field>
  </v-card>
        <div class="vessel-list">
            <v-table>
                <thead>
                    <tr>

                        <th class="text-left">
                            Name
                        </th>
                        <th class="text-left">
                            Version
                        </th>
                        <th class="text-left">
                            Num. Parts
                        </th>
                        <th class="text-left">
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, key) of vessels" :key="key">
                        <td><a 
                                style="text-decoration: underline;cursor: pointer;"
                                @click="router.push(`./vessel/details/${item.entity?._id}`)">
                                {{ item.entity?.name }}
                            </a>
                        </td>
                        <td>{{ item.entity?._version }}</td>
                        <td>{{ item.entity?.parts.length }}</td>
                        <td>
                            <AddUserPermission :vesselId="item.entity!._id"></AddUserPermission>
                        </td>
                        <td><v-btn @click="router.push(`./vessel/details/${item.entity?._id}`)">Flights</v-btn></td>
                    </tr>
                </tbody>
            </v-table>
        </div>
    </v-container>
</template>

<script setup lang="ts">
import { useObservableShallow } from '@/helper/reactivity';
import { fetchVesselsIfNecessary, getVessels } from '@/stores/vessels';
import AddUserPermission from '../permissions/AddUserPermission.vue';

import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import { useAuthHeaders } from '../../composables/api/getHeaders'
import axios from 'axios';
import { useRssApiBaseUri } from '../../composables/api/rssFlightServerApi'

const newVesselName = ref('')

const authHeaders = useAuthHeaders();

const url = computed(() => {
    return `/vessel/create_vessel/${newVesselName.value}`
})

const router = useRouter()

const vessels = useObservableShallow(getVessels(), { initialValue: undefined })

fetchVesselsIfNecessary()


async function addVessel() {
    if (newVesselName.value.length == 0) {
        alert("No name given")
    }
    try {
        await axios.post(`${useRssApiBaseUri()}${url.value}`, {}, { headers: authHeaders.value })
    } catch (e) {
        alert("Error creating vessel" + e)
    }
}

</script>

<style lang="scss">
.vessel-list {
    max-height: 80vh;
    overflow-y: scroll;
}
</style>
