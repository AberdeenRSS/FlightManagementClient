<template>
    <div class="vessel-list">
        <Panel header="Actions" style="margin-bottom:24px">

            <InputGroup class="aligned-input">

                <InputText 
                    id="newVesselName" 
                    v-model="newVesselName" 
                    placeholder="New Vessel Name" />

                <Button label="Add Vessel" outlined @click="addVessel" />
            </InputGroup>

        </Panel>

        <Panel style="margin-bottom:24px; padding:0">
            <template #header>
                <span class="p-panel-title">Vessels
                    {{ vessels ? `(${Object.keys(vessels).length})` : '' }}
                </span>
            </template>

            <DataTable
                :value="Object.values(vessels || {})" 
                responsiveLayout="scroll"
               
                class="p-datatable-sm custom-table"
                >
                <Column field="entity.name" header="Name">
                    <template #body="slotProps">
                        <Button 
                            :label="slotProps.data.entity?.name" 
                            link
                            class="p-button-text p-button-plain"
                            @click="router.push(`/vessel/details/${slotProps.data.entity?._id}`)" />
                    </template>
                </Column>
                <Column field="entity._version" header="Version" />
                <Column field="entity.parts" header="Num. Parts">
                    <template #body="slotProps">
                        {{ slotProps.data.entity?.parts?.length || 0 }}
                    </template>
                </Column>
                <Column header="Actions">
                    <template #body="slotProps">
                        <UserPermissionsDialog :vesselId="slotProps.data.entity._id" />
                    </template>
                </Column>
            </DataTable>
          
        </Panel>
    </div>
</template>

<script setup lang="ts">
import { useObservableShallow } from '@/helper/reactivity';
import { fetchVesselsIfNecessary, getVessels } from '@/stores/vessels';

import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';
import { useAuthHeaders } from '../../composables/api/getHeaders'
import axios from 'axios';
import { useRssApiBaseUri } from '../../composables/api/rssFlightServerApi'
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputGroup from 'primevue/inputgroup';
import Panel from 'primevue/panel';
import UserPermissionsDialog from '../permissions/UserPermissionsDialog.vue';


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


.custom-table {
  width: 100% !important;
}
</style>