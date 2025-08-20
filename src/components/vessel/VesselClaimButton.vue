<template>
    <v-row justify="center">
        <v-btn @click="claimVessel">
            Claim Vessel
        </v-btn>
    </v-row>
</template>

<script lang="ts" setup>
import { computed, toRefs } from 'vue';
import { useUser } from '@/composables/auth/useUser';
import axios from 'axios';
import { useAuthHeaders } from '../../composables/api/getHeaders'
import { useRssApiBaseUri } from '@/composables/api/rssFlightServerApi';
const props = defineProps({
    vesselId: {
        type: String,
        required: true
    }
})
const { vesselId } = toRefs(props)
const { currentUser } = useUser()
const authHeaders = useAuthHeaders();
const url = computed(() => {
    return `/vessel/set_permission/${vesselId.value}/${currentUser.value?.unique_name}/owner`
})
async function claimVessel() {
    try {
        await axios.post(`${useRssApiBaseUri()}${url.value}`, {}, { headers: authHeaders.value })
    } catch (e) {
        alert("Error claiming vessel" + e)
    }
}
</script>