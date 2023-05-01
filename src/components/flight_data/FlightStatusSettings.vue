<template>
    <v-select density="compact" v-model="widgetData.selectedSeries" label="Select Series" no-data-text="No part selected/Part has no series" :items="series"></v-select>
</template>
    
<style lang="scss"></style>
    
<script lang="ts" setup>

import { useComponentConfiguration } from '@/composables/componentsConfiguration/componentConfiguration';
import { computed, defineProps, inject, ref, toRefs, watch } from 'vue'
import { DASHBOARD_WIDGET_ID } from '../misc/dashboard/DashboardComposable';
import { useWidgetData, useSelectedPart } from './flightDashboardElemStoreTypes';
import { getVesselHistoric, useVesselStore, type Vessel } from '@/stores/vessels'
import { useFlightViewState } from '@/composables/useFlightView';
import { useFlightStore } from '@/stores/flight';

const { vesselId, flightId } = useFlightViewState()

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Flight Status not used in within a dashboard')

const widgetData = useWidgetData(dashboardWidgetId)

const vesselStore = useVesselStore()

const flightStore = useFlightStore()

const flight = computed(() => vesselId && flightId ? flightStore.vesselFlights[vesselId.value]?.flights[flightId.value]?.flight : undefined)

const vessel = ref<Vessel | undefined>(undefined)

watch(flight, f => {
    if(!f)
        return
    vesselStore.fetchHistoricVessel(f._vessel_id, f._vessel_version)
    watch(getVesselHistoric(vesselStore, f._vessel_id, f._vessel_version), v =>{ 
        if(v?.entity)
            vessel.value = v.entity
    }, {immediate: true, deep: true} )
}, {immediate: true, deep: true})

const selectedPartId = useSelectedPart(dashboardWidgetId)
const selectedPart = computed(() => vessel.value?.parts.find(p => p._id === selectedPartId.value))

const { configurations } = useComponentConfiguration()
const relevantConfiguration = computed(() => selectedPartId.value && selectedPart.value ? configurations[selectedPart.value?.part_type] : undefined)

const dataConfig = relevantConfiguration.value?.flightDataConfig

const series = computed(() => dataConfig ? Object.keys(dataConfig).map(k => dataConfig[k].seriesName) : [])


</script>