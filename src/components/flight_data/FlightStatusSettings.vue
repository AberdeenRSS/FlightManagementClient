<template>
    <v-select density="compact" v-model="widgetData.selectedSeries" label="Select Series" no-data-text="No part selected/Part has no series" :items="series"></v-select>
</template>
    
<style lang="scss"></style>
    
<script lang="ts" setup>

import { useComponentConfiguration } from '@/composables/componentsConfiguration/componentConfiguration';
import { computed, defineProps, inject, toRefs } from 'vue'
import { DASHBOARD_WIDGET_ID } from '../misc/dashboard/DashboardComposable';
import { useWidgetData, useSelectedPart } from './flightDashboardElemStoreTypes';
import { useVesselStore } from '@/stores/vessels'
import { useFlightViewState } from '@/composables/useFlightView';

const { vesselId } = useFlightViewState()

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Flight Status not used in within a dashboard')

const widgetData = useWidgetData(dashboardWidgetId)

const { getVessel } = useVesselStore()
const vessel = computed(() => getVessel(vesselId.value))

const selectedPartId = useSelectedPart(dashboardWidgetId)
const selectedPart = computed(() => vessel.value?.parts.find(p => p._id === selectedPartId.value))

const { configurations } = useComponentConfiguration()
const relevantConfiguration = computed(() => selectedPartId.value && selectedPart.value ? configurations[selectedPart.value?.part_type] : undefined)

const dataConfig = relevantConfiguration.value?.flightDataConfig

const series = computed(() => dataConfig ? Object.keys(dataConfig).map(k => dataConfig[k].seriesName) : [])


</script>