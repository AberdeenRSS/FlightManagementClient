<template>
    <div class="d-flex flex-row" style="height: 100%;">

        <span class="tabs">
      <v-list density="compact">
        <v-list-item
          v-for="item in tabs"
          :key="item"
          :value="item"
          :active="selectedTab === item"
          @click="selectedTab = item"
        >
          {{ item }}
        </v-list-item>
      </v-list>
      <v-divider></v-divider>
      <v-list density="compact">
        <v-list-item>
          <v-btn block variant="outlined" @click="onDone">Done</v-btn>
        </v-list-item>
        <v-list-item>
          <v-btn block color="error" @click="onDelete">Delete</v-btn>
        </v-list-item>
      </v-list>
    </span>

        <div class="d-flex flex-column flex-grow" style="width:100%; height: 100%;">

            <div v-if="selectedTab === 'Select View'" class="settings-item mt-3">
                <v-radio-group v-for="(view,index) in views" :key="index" density="compact" v-model="widgetData.selectedView">
                    <v-radio :label="view" :value="view"></v-radio>
                </v-radio-group>
            </div>
            
            <div v-if="selectedTab === 'Select Part'" class="settings-item" style="height: 80%;">
                <VesselChart :vessel-id="vesselId" :version="flight?._vessel_version" v-model="widgetData.selectedParts">
                </VesselChart>
            </div>

            <div v-if="selectedTab === 'Graph'" class="settings-item">
                <SimpleFlightDataChartSettings :dashboard-widget-id="dashboardWidgetId"></SimpleFlightDataChartSettings>
            </div>

            <div v-if="selectedTab === 'Status'" class="settings-item">
                <FlightStatusSettings :dashboard-widget-id="dashboardWidgetId"></FlightStatusSettings>
            </div>

            <div v-if="selectedTab === '3D Model'" class="settings-item">
                <FlightStatus3dSettings :dashboard-widget-id="dashboardWidgetId"></FlightStatus3dSettings>
            </div>

            <div v-if="selectedTab === 'Map'" class="settings-item">
                <GeoMapSettings :dashboard-widget-id="dashboardWidgetId"></GeoMapSettings>
            </div>

            <div v-if="selectedTab === 'Select Command'" class="settings-item">
                <CommandDispatchBar v-model:command-type="widgetData.commandDispatchSelectedCommandType"
                    v-model:part-id="commandSelectedPart"></CommandDispatchBar>
            </div>

            <!-- <div v-if="selectedTab === 'General'" class="settings-item">
             <DashboardResizer></DashboardResizer>
            </div> -->
            
        </div>

    </div>
</template>

<script lang="ts" setup>

import FlightStatus3dSettings from '@/components/flight_data/3dFlightStatus/3dFlightStatusSettings.vue';
import VesselChart from '@/components/vessel/VesselChart.vue';
import CommandDispatchBar from '../command/CommandDispatchBar.vue';
import FlightStatusSettings from '../flight_data/FlightStatusSettings.vue';
import GeoMapSettings from '../flight_data/map/GeoMapSettings.vue';
import SimpleFlightDataChartSettings from '../flight_data/SimpleFlightDataChartSettings.vue';

import { useFlightViewState } from '@/composables/useFlightView';
import { useObservableShallow } from '@/helper/reactivity';
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { getPart } from '@/stores/vessels';
import { computed, ref, toRefs, watch } from 'vue';
import { useSelectedPart, useWidgetData } from '../flight_data/flightDashboardElemStoreTypes';
import { useDashboardWidgetStore } from '../misc/dashboard/DashboardComposable';



const props = defineProps({
    dashboardWidgetId: {
        type: Array,
        required: true
    }
})
const { dashboardWidgetId } = toRefs(props)

const { deleteWidget } = useDashboardWidgetStore(dashboardWidgetId.value as [string, string])
const widgetData = useWidgetData(dashboardWidgetId.value as [string, string])
const selectedPartId = useSelectedPart(dashboardWidgetId.value as [string, string])

widgetData.value.selectedParts = widgetData.value.selectedParts ?? {}
widgetData.value.selectedView = widgetData.value.selectedView ?? 'Graph'
widgetData.value.inSettings = 'inSettings' in widgetData.value ? widgetData.value.inSettings : true

const { vesselId, flightId, setElementInSettings} = useFlightViewState()
const { vessel$, flight$ } = getFlightAndHistoricVessel(vesselId, flightId)
const flight = useObservableShallow(flight$)
const selectedPart$ = getPart(vessel$, selectedPartId)
const selectedPart = useObservableShallow(selectedPart$)

const views = ['Graph', 'Status', '3D Model', 'Map', 'Command']

const baseTabs = ['Select View', 'Select Part']
const tabs = ref<string[]>(baseTabs)
const selectedTab = ref<string>('Select View')

watch([widgetData], ([wd]) => {

    const view = wd.selectedView

    if (view === 'Graph')
        tabs.value = [...baseTabs, 'Graph']
    else if (view === 'Status')
        tabs.value = ['Select View', 'Select Part', 'Status']
    else if (view === '3D Model')
        tabs.value = ['Select View', 'Select Part', '3D Model']
    else if (view === 'Map')
        tabs.value = ['Select View', 'Select Part', 'Map']
    else if (view === 'Command')
        tabs.value = ['Select View', 'Select Command']
    else
        tabs.value = baseTabs

    // Reset tab if it is no longer available
    if (!tabs.value.some(t => t === selectedTab.value))
        selectedTab.value = tabs.value[0]

}, { immediate: true, deep: true })


const commandSelectedPart = computed({
    get() {
        return selectedPart.value?._id
    },
    set(value: string | undefined) {
        widgetData.value.selectedParts = value ? { [value]: true } : {}
    }
})

function onDone(){
    setElementInSettings(undefined)
}

function onDelete(){
    setElementInSettings(undefined)
    deleteWidget()
}
</script>
