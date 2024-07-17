<template>
    <div class="vessel-list">
        <div>
            <v-text-field v-model="newVesselName" label="New Vessel Name"></v-text-field>
            <v-btn @click="addVessel">Add Vessel</v-btn>
        </div>
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
                    <td><b>{{ item.entity?.name }}</b></td>
                    <td>{{ item.entity?._version }}</td>
                    <td>{{ item.entity?.parts.length }}</td>
                    <td v-if="currentUser && item.entity?.permissions[currentUser.uid] == 'owner'">
                        <AddUserPermission :vesselId="item.entity!._id"></AddUserPermission> 
                    </td>
                    <td v-else-if="Object.keys(item.entity?.permissions ?? {}).length === 0">
                        <ClaimVessel :vesselId="item.entity!._id"></ClaimVessel>
                    </td>
                    <td v-else></td>
                    <td><v-btn @click="router.push(`./vessel/details/${item.entity?._id}`)">Flights</v-btn></td>
                </tr>
            </tbody>
        </v-table>
    </div>
</template>

<script setup lang="ts">
import { useObservableShallow } from '@/helper/reactivity';
import { fetchVesselsIfNecessary, getVessels } from '@/stores/vessels';
import AddUserPermission from './AddUserPermission.vue';

import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import {useAuthHeaders } from '../../composables/api/getHeaders'
import axios from 'axios';
import { useRssApiBaseUri } from '../../composables/api/rssFlightServerApi'
import { useUser } from '@/composables/auth/useUser';
import ClaimVessel from './ClaimVessel.vue';

const newVesselName = ref('')
const { currentUser } = useUser()
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
    } catch(e) {
        alert("Error creating vessel"+e)
    }
}

</script>

<style lang="scss">
.vessel-list {
    max-height: 80vh;
    overflow-y: scroll;
}
</style>
