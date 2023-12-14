<template>
    <div v-if="!!vessel" style="height: 100%; flex-direction: column;" class="d-flex ">

        <div>
            <div class="ma-2 font-weight-light text-h3">
                {{ vessel.name }}
            </div>

        </div>

        <v-btn @click="createAuthCode" :loading="tokenLoading">Create Auth Code</v-btn>

        <v-alert v-if="tokenError" :text="tokenError" type="error"></v-alert>

        <div v-if="token">{{ token }}</div>

        <div class="d-flex" style="min-height: 1px;">
            <div style="flex-basis: 200px; flex-grow: 0.4;">
                <VesselChart v-model="selected" :vessel-id="id"></VesselChart>
            </div>

            <div style="max-height: 100%; overflow-y: scroll; flex-grow: 1;">
                <FlightList :vessel-id="id"></FlightList>
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
