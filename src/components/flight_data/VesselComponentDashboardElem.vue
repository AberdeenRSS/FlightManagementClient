<template>
    <v-card style="height: 100%; width: 100%;" :widgetSize="size">
        <div style="height: 100%; padding: 0 1rem;">

            <span v-if="inSettings">

                <div class="d-flex flex-column" style="height: 100%;">

                    <span class="tabs">

                        <v-tabs  density="compact" align-tabs="start" v-model="selectedTab" >
                            <v-tab v-for="item in tabs" :key="item" :value="item">
                                {{ item }}
                            </v-tab>
                        </v-tabs>
                    </span>


                    <!-- <span v-if="selectedTab === 'Select View'"> -->

                    <div v-if="selectedTab === 'Select View'">
                        <v-select label="View" v-model="selectedView" :items="views"></v-select>
                    </div>

                    <div v-if="selectedTab === 'Select Part'" class="align-self-stretch" style="flex-grow: 1;">
                        <!-- <label>Select Part</label> -->
                        <VesselChart :vessel-id="vesselId" v-model="selectedParts"></VesselChart>
                    </div>


                    <!-- </span> -->

                    <v-template v-if="selectedTab === 'General'">

                        <div>
                            <DashboardResizer></DashboardResizer>
                        </div>


                        <div>
                            <v-btn color="error" @click="deleteWidget()">Delete</v-btn>
                        </div>

                    </v-template>

                        <v-btn variant="outlined" @click="inSettings = false">Done</v-btn>

                </div>

            </span>

            <div v-if="!inSettings && selectedView === 'Graph'" class="d-flex flex-column" style="height: 100%;">

                <div v-if="!inSettings" class="d-flex justify-space-between align-center">
                    <v-btn v-if="!inSettings" icon="mdi-cog-outline" variant="plain" @click="inSettings = true"></v-btn>
                    <div>{{ title }}</div>
                    <div><v-icon icon="mdi-engine"></v-icon></div>
                </div>

                <div  class="flex-grow-1">
                    <SimpleFlightDataChart :vessel-id="vesselId" :flight-id="flightId" :vessel-part-id="selected!" :selected-time-range="selectedTimeRange"></SimpleFlightDataChart>
                </div>

            </div>

        </div>
    </v-card>

</template>

<style lang="scss">

.tabs {

    .v-btn__content {
        font-size: 0.6rem;
    }
}

</style>

<script setup lang="ts">

import VesselChart from '@/components/vessel/VesselChart.vue';
import DashboardResizer from '@/components/misc/dashboard/DashboardResizer.vue'

import { computed, inject, ref, watch } from 'vue';
import { toRefs } from 'vue';
import { DASHBOARD_WIDGET_ID, useDashboardWidgetStore } from '../misc/dashboard/DashboardComposable';
import SimpleFlightDataChart from './SimpleFlightDataChart.vue'
import { useFlightDataStore } from '@/stores/flight_data'
import { throttledWatch, watchDebounced, watchThrottled } from '@vueuse/shared';
import { useVesselStore } from '@/stores/vessels';

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Resizer not used in within a dashboard')

const { deleteWidget } = useDashboardWidgetStore(dashboardWidgetId)

type Views = 'part' | 'data' | 'status' | 'command' | 'resize'

const tabs = ['Select View', 'Select Part', 'General']

const selectedTab = ref<string>('Select View')

const views = ['Graph']

const selectedView = ref('Graph')

const size = ref({ x: 2, y: 2 })

const props = defineProps({
    vesselId: {
        type: String,
        required: true
    },
    flightId: {
        type: String,
        required: true
    },
    selectedTimeRange: {
        type: Object,
        required: true
    }
});

const { fetchFlightDataInTimeFrame } = useFlightDataStore()

const { getVessel } = useVesselStore()

const { vesselId, flightId, selectedTimeRange } = toRefs(props)

const vessel = computed(() => getVessel(vesselId.value)) 

const title = computed(() => selected.value ? vessel.value?.parts.find(p => p._id === selected.value)?.name : 'No Part Selected')

const inSettings = ref(true)

const selected = ref<string | undefined>(undefined)

const selectedParts = ref<{[id: string]: boolean}>({})

watch(selectedParts, onPartsSelected, {immediate: true})

async function onPartsSelected(parts: { [id: string]: boolean }) {

    const newSelected = Object.keys(parts).filter(k => parts[k])

    if (newSelected.length < 1) {
        selected.value = undefined
        return
    }

    selected.value = newSelected[0]
}

watchThrottled([flightId, selected, selectedTimeRange], ([v, id, timeRange]) => {

    if (!id)
        return

    fetchFlightDataInTimeFrame(v, id, timeRange.start, timeRange.end)
}
    , { immediate: true, deep: true, debounce: true, throttle: 200 })

</script>

