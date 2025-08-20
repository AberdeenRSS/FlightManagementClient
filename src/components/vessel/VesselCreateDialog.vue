<template>
    <v-dialog>
        <template v-slot:activator="{props:activatorProps}">
            <v-btn
                v-bind="activatorProps" 
                variant="flat"
                class="rounded"
                color="primary">
                 Create Vessel
            </v-btn>
        </template>

        <template v-slot:default="{ isActive }">
            <v-card title="Create Vessel">
                <v-card-text>
                    <v-text-field
                        v-model="newVesselName"
                        label="Vessel Name"
                        placeholder="Enter vessel name"
                        variant="outlined"
                        density="compact"
                        :disabled="loading"
                        @keyup.enter="addVessel"
                    ></v-text-field>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn
                        @click="isActive.value=false"
                        :disabled="loading"
                        variant="text">
                        Cancel
                    </v-btn>
                    <v-btn
                        @click="addVessel(isActive)"
                        variant="flat"
                        :loading="loading"
                        color="primary">
                        Create
                    </v-btn>
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>


<script setup lang="ts">
    import { ref, computed } from 'vue'
    import axios from 'axios';
    import { useRssApiBaseUri } from '../../composables/api/rssFlightServerApi'
    import { useAuthHeaders } from '../../composables/api/getHeaders'
    import { insertVessel } from '@/stores/vessels';

    const emit = defineEmits<{
        vesselCreated: [vesselName:string]
    }>()

    const url = computed(() => `/vessel/create_vessel/${newVesselName.value}`)

    const newVesselName = ref('')
    const loading = ref(false)
    const authHeaders = useAuthHeaders();

    async function addVessel(isActive: { value: boolean }) {
    if (newVesselName.value.length === 0) {
        alert("No name given")
        return
    }

    loading.value = true

    try {
        const result = await axios.post(`${useRssApiBaseUri()}${url.value}`, {}, { headers: authHeaders.value });
        if (result.status == 200){
            insertVessel(result.data)
            emit('vesselCreated', newVesselName.value)
            newVesselName.value = '' // Clear the input after successful addition
            isActive.value = false
        }
        else {
            throw new Error("Failed to create vessel")
        }
    } catch (e) {
        alert("Error creating vessel: " + e)
    } finally {
        loading.value = false
    }
    }

</script>