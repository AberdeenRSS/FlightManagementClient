<template>
    <div v-if="!!vessel" style="height: 100%; flex-direction: column;" class="d-flex ">

        <div>
            <div class="ma-2 font-weight-light text-h3">
                {{ vessel.name }}
            </div>

        </div>
        <v-card>
            <v-card-title v-if="token">Auth Code</v-card-title>
            <v-alert v-if="tokenError" :text="tokenError" type="error"></v-alert>
            
            <v-card-text v-if="token">{{ token }}</v-card-text>
            <v-card-actions>
                <v-btn @click="createAuthCode" :loading="tokenLoading">Create Auth Code</v-btn>
                <v-btn @click="copyAuthToken" v-if="token">Copy</v-btn>
            </v-card-actions>
        </v-card>

        <Tabs value="0">
            <TabList>
                <Tab value="0">Flights</Tab>
                <Tab value="1">Parts</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="0">
                    <div style="flex-basis: 200px; flex-grow: 0.4;">
                        <FlightList :vessel-id="id"></FlightList>
                    </div>
                </TabPanel>
                <TabPanel value="1">
                    <div style="flex-basis: 200px; flex-grow: 0.4;">
                        <VesselChart v-model="selected" :vessel-id="id"></VesselChart>
                   
                    </div>
                </TabPanel>
            </TabPanels>
        </Tabs>
        <div class="d-flex" style="min-height: 1px;">
            

            <div style="max-height: 100%; overflow-y: scroll; flex-grow: 1;">
                
            </div>
        </div>


    </div>
    <div v-else>
        <v-progress-circular indeterminate></v-progress-circular>
    </div>
</template>

<script setup lang="ts">
import VesselChart from '@/components/vessel/VesselChart.vue';
import FlightList from '@/components/flights/FlightList.vue';
import { useRoute } from 'vue-router';
import { ref } from 'vue';
import { fetchVesselsIfNecessary, getVessel } from '@/stores/vessels';

import { subscribeRealtime } from '@/stores/flight';
import { useObservableShallow } from '@/helper/reactivity';
import { useUser } from '@/composables/auth/useUser';
import axios from 'axios';
import { useRssApiBaseUri } from '@/composables/api/rssFlightServerApi';
import { until } from '@vueuse/core';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';


const route = useRoute()
const id = route.params.id as string

const { currentUser } = useUser()

const token = ref<string | undefined>(undefined)
const tokenError = ref<string | undefined>(undefined)
const tokenLoading = ref<boolean>(false)

fetchVesselsIfNecessary()
subscribeRealtime()

const vessel = useObservableShallow(getVessel(id))

const selected = ref({})

function copyAuthToken() {
    navigator.clipboard.writeText(token.value!);
    alert("Successfully copied token!")
}

async function createAuthCode() {

    tokenError.value = undefined
    tokenLoading.value = true

    const loadedVessel = await until(vessel).toBeTruthy()
    const user = await until(currentUser).toBeTruthy()

    const validUntil = new Date(Date.now() + 1000*60*60*24*60)

    try {
        const res = await axios.post(`${useRssApiBaseUri()}/vessel/create_auth_code/${loadedVessel._id}/${validUntil.toISOString()}`, undefined, {headers: {'Authorization': user.jwt_token}})
        token.value = res.data['_id']
    }
    catch (e) {
        tokenError.value = String(e)
    }
    finally {
        tokenLoading.value = false
    }

}

</script>
<style></style>
