<template>
    <v-card style="height: 100%; width: 100%;" :widgetSize="size">
        <div class="card-content">

            <div style="height: 100%;" class="card-body">

                <div v-if="widgetData.inSettings" style="height: 100%; width: 100%;">

                    <div class="d-flex flex-column" style="height: 100%;">

                        <span class="tabs">

                            <v-tabs density="compact" align-tabs="start" v-model="selectedTab">
                                <v-tab v-for="item in tabs" :key="item" :value="item">
                                    {{ item }}
                                </v-tab>
                            </v-tabs>
                        </span>

                        <div v-if="selectedTab === 'Select View'" class="settings-item">
                            <v-select density="compact" label="View" v-model="widgetData.selectedView" :items="views"></v-select>
                        </div>

                        <div v-if="selectedTab === 'Select Part'" class="settings-item">
                            <VesselChart :vessel-id="vesselId" v-model="widgetData.selectedParts"></VesselChart>
                        </div>

                        <div v-if="selectedTab === 'Status'" class="settings-item">
                            <FlightStatusSettings></FlightStatusSettings>
                        </div>

                        <div v-if="selectedTab === 'General'" class="settings-item">

                            <DashboardResizer></DashboardResizer>
                        </div>
                        <v-btn v-if="selectedTab === 'General'" color="error" @click="deleteWidget()">Delete</v-btn>

                        <v-btn variant="outlined" @click="widgetData.inSettings = false">Done</v-btn>

                    </div>

                </div>

                <div v-if="!widgetData.inSettings" class="d-flex flex-column" style="height: 100%;">

                    <div v-if="!widgetData.inSettings" class="d-flex justify-space-between align-center">
                        <v-btn v-if="!widgetData.inSettings" icon="mdi-cog-outline" variant="plain" @click="widgetData.inSettings = true"></v-btn>
                        <div>{{ title }}</div>
                        <div><v-icon :icon="relevantConfiguration?.iconId ?? 'mdi-checkbox-blank'"></v-icon></div>
                    </div>

                    <div class="flex-grow-1" v-if="widgetData.selectedView === 'Graph'">
                        <SimpleFlightDataChart></SimpleFlightDataChart>
                    </div>

                    <div class="flex-grow-1" v-if="widgetData.selectedView === 'Status'">
                        <FlightStatus></FlightStatus>
                    </div>

                </div>

            </div>
        </div>
    </v-card>
</template>

<style lang="scss">
.card-content {

    width: 100%;

    height: 100%;

    container-type: inline-size;

    container-name: card-content;

    .card-body {

        padding: 0 1rem;

        @container card-content (max-width: 400px) {
            padding: 0;
        }
    }

    .settings-item {
        // @extend .align-self-stretch;

        align-self: stretch;

        flex-grow: 1;
    }

    .tabs {

        .v-btn__content {
            font-size: 0.6rem;
        }
    }
}
</style>

<script setup lang="ts">

import VesselChart from '@/components/vessel/VesselChart.vue';
import DashboardResizer from '@/components/misc/dashboard/DashboardResizer.vue'

import { computed, inject, ref, watch, type Ref } from 'vue';
import { toRefs, toRef } from 'vue';
import { DASHBOARD_WIDGET_ID, useDashboardWidgetStore } from '../misc/dashboard/DashboardComposable';
import SimpleFlightDataChart from '../flight_data/SimpleFlightDataChart.vue'
import FlightStatusSettings from '../flight_data/FlightStatusSettings.vue';
import FlightStatus from '../flight_data/FlightStatus.vue'
import { useFlightDataStore } from '@/stores/flight_data'
import { throttledWatch, watchDebounced, watchThrottled } from '@vueuse/shared';
import { useVesselStore } from '@/stores/vessels';
import { useSelectedPart, useWidgetData, type FlightDashboardWidgetData } from '../flight_data/flightDashboardElemStoreTypes';
import { useComponentConfiguration } from '@/composables/componentsConfiguration/componentConfiguration';
import { useFlightViewState } from '@/composables/useFlightView';

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Resizer not used in within a dashboard')

const { deleteWidget } = useDashboardWidgetStore(dashboardWidgetId)

const widgetData = useWidgetData(dashboardWidgetId)
widgetData.value.selectedParts = widgetData.value.selectedParts ?? {}
widgetData.value.selectedView = widgetData.value.selectedView ?? 'Graph'
widgetData.value.inSettings = 'inSettings' in widgetData.value ? widgetData.value.inSettings : true

const views = ['Graph', 'Status']

const baseTabs = ['Select View', 'Select Part', 'General']
const tabs = computed(() => widgetData.value.selectedView=== 'Status' ? [...baseTabs, 'Status'] : baseTabs)
const selectedTab = ref<string>('Select View')

const size = ref({ x: 2, y: 2 })

const { vesselId, flightId, timeRange, resolution, live } = useFlightViewState()

const { fetchFlightDataInTimeFrame, subscribeRealtime } = useFlightDataStore()

const { getVessel } = useVesselStore()

const selectedPartId = useSelectedPart(dashboardWidgetId)

const vessel = computed(() => getVessel(vesselId.value))

const title = computed(() => selectedPartId.value ? vessel.value?.parts.find(p => p._id === selectedPartId.value)?.name : 'No Part Selected')

const selectedPart = computed(() => vessel.value?.parts.find(p => p._id === selectedPartId.value))

const { configurations } = useComponentConfiguration()
const relevantConfiguration = computed(() => selectedPartId.value && selectedPart.value ? configurations[selectedPart.value?.part_type] : undefined)

subscribeRealtime(flightId.value)

const debouncedRange = ref(timeRange.value)

const debounceTime = computed(() => live.value ? 4000 : 300)

watchDebounced(timeRange, r => debouncedRange.value = r, {immediate: true, deep: true, debounce: debounceTime, maxWait: 5000})

watch([flightId, selectedPartId, debouncedRange, resolution], ([v, id, r, res]) => {

    if (!id)
        return

    if(res != 'eternity')
        fetchFlightDataInTimeFrame(v, id, r.start, r.end, res)
}, { immediate: true, deep: true })

</script>

