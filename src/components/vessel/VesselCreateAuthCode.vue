<template>
    <v-card class="mx-auto" elevation="2">
        <v-card-title class="d-flex align-center justify-space-between">
            Authentication Code
            <v-btn @click="createAuthCode" :loading="tokenLoading" color="primary" variant="elevated"
                prepend-icon="mdi-plus" class="mb-2">
                Create Auth Code
            </v-btn>
        </v-card-title>
        <v-expand-transition>
        <v-card-text v-if="token">
            <div>
                <v-text-field :model-value="token" readonly label="Auth Code" variant="outlined" density="comfortable"
                    class="" bg-color="grey-lighten-5" hide-details>
                    <template #prepend-inner>
                        <v-icon color="success">mdi-shield-check</v-icon>
                    </template>
                    <template #append>
                        <v-tooltip text="Copy to clipboard">
                            <template #activator="{ props: tooltipProps }">
                                <v-btn v-bind="tooltipProps" @click="copyAuthToken"
                                    :icon="copySuccess ? 'mdi-check' : 'mdi-content-copy'"
                                    :color="copySuccess ? 'success' : 'primary'" variant="text" size="small" />
                            </template>
                        </v-tooltip>
                        <v-tooltip text="Clear auth code">
                            <template #activator="{ props: tooltipProps }">
                                <v-btn v-bind="tooltipProps" @click="clearAuthToken" icon="mdi-close" color="error"
                                    variant="text" size="small" />
                            </template>
                        </v-tooltip>
                    </template>
                </v-text-field>


            </div>
            <!-- Error Message -->
            <v-expand-transition>
                <v-alert v-if="tokenError" type="error" variant="tonal" density="compact" class="mt-2" border="start"
                    closable @click:close="tokenError = null">
                    <template #prepend>
                        <v-icon>mdi-alert-circle</v-icon>
                    </template>
                    {{ tokenError }}
                </v-alert>
            </v-expand-transition>
        </v-card-text>
        </v-expand-transition>
    </v-card>
</template>

<script setup lang="ts">
import type { Vessel } from '@/stores/vessels'
import { until } from '@vueuse/core'
import { ref } from 'vue'
import { useRssApiBaseUri } from '@/composables/api/rssFlightServerApi'
import { useUser } from '@/composables/auth/useUser'
import axios from 'axios'

const props = defineProps<{
    vessel: Vessel
}>()
const token = ref<string | null>(null)
const tokenError = ref<string | null>(null)
const tokenLoading = ref<boolean>(false)
const copySuccess = ref<boolean>(false)


const { currentUser } = useUser()


function copyAuthToken() {
    if (token.value) {
        navigator.clipboard.writeText(token.value);
        copySuccess.value = true;
        setTimeout(() => {
            copySuccess.value = false;
        }, 3500);
    }
}

function clearAuthToken() {
    token.value = null
}

async function createAuthCode() {
    tokenError.value = null
    tokenLoading.value = true

    try {
        const user = await until(currentUser).toBeTruthy()

        const validUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)

        const res = await axios.post(`${useRssApiBaseUri()}/vessel/create_auth_code/${props.vessel._id}/${validUntil.toISOString()}`, undefined, { headers: { 'Authorization': user.jwt_token } })
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