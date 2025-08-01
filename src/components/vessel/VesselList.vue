<template>
    <v-table striped="even" density="compact">
        <thead>
            <tr>
                <th class="text-left">Name</th>
                <th class="text-left">Version</th>
                <th class="text-left">Num. Parts</th>
                <th class="text-left"></th>
            </tr>
        </thead>
        <tbody>
            <tr v-if="!vessels || vessels.length === 0">
                <td colspan="4" class="text-center">
                    No vessels found.
                </td>
            </tr>
            <tr v-for="vessel in vessels" :key="vessel?._id">
                <td>
                    <v-btn @click="router.push(`./vessel/details/${vessel?._id}`)" variant="text" color="primary"
                        size="small">
                        {{ vessel?.name }}
                    </v-btn>
                </td>
                <td>
                    {{ vessel?._version }}
                </td>
                <td>
                    {{ vessel?.parts.length }}
                </td>
                <td class="text-right">
                    <v-menu v-if="
                        vessel?.permissions?.[currentUser!.uid] === 'owner' ||
                        vessel?.no_auth_permission === 'owner'">
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" icon size="small" variant="text">
                                <v-icon>mdi-dots-vertical</v-icon>
                            </v-btn>
                        </template>

                        <v-list density="compact">
                            <v-list-item @click="deleteVessel(vessel?._id)">
                                <template v-slot:prepend>
                                    <v-icon color="error" size="small">mdi-delete</v-icon>
                                </template>
                                <v-list-item-title class="text-error">Delete</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </td>
            </tr>
        </tbody>
    </v-table>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthHeaders } from '../../composables/api/getHeaders'
import axios from 'axios';
import { useRssApiBaseUri } from '../../composables/api/rssFlightServerApi'
import { useUser } from '@/composables/auth/useUser';
import { removeVessel, type Vessel } from '@/stores/vessels';

defineProps<{
    vessels: (Vessel | null)[],
}>();

const authHeaders = useAuthHeaders();
const router = useRouter()
const { currentUser } = useUser();



async function deleteVessel(vessel_id: string) {
    if (!window.confirm('Are you sure you want to delete this vessel?')) {
        return;
    }
    try {
        const result = await axios.delete(`${useRssApiBaseUri()}/v1/vessels/${vessel_id}`, { headers: authHeaders.value })
        if (result.status === 200) {
            alert("Vessel deleted successfully")
            removeVessel(vessel_id)
        } else {
            alert("Failed to delete vessel: " + result.statusText)
        }
    } catch (e) {
        alert("Error deleting vessel: " + e)
    }
}
</script>