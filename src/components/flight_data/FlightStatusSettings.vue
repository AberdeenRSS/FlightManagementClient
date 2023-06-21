<template>
    <v-select v-if="series" density="compact" v-model="widgetData.selectedSeries" label="Select Series" no-data-text="No part selected/Part has no series" :items="series"></v-select>
</template>
    
<style lang="scss"></style>
    
<script lang="ts" setup>

import { toRefs } from 'vue'
import { useSelectedPart, useWidgetData } from './flightDashboardElemStoreTypes';
import { useFlightViewState } from '@/composables/useFlightView';
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { combineLatest, map } from 'rxjs';
import { fromImmediate, useObservableShallow } from '@/helper/reactivity';

const props = defineProps({
    dashboardWidgetId: {
        type: Array,
        required: true
    }
})
const { dashboardWidgetId } = toRefs(props)
const { vesselId, flightId } = useFlightViewState()
const { vessel$, flight$ } = getFlightAndHistoricVessel(vesselId, flightId)

const widgetData = useWidgetData(dashboardWidgetId.value as [string, string])


const selectedPartId = useSelectedPart(dashboardWidgetId.value as [string, string])
const selectedPart$ = combineLatest([vessel$, fromImmediate(selectedPartId)]).pipe(
    map(([vessel, _]) => vessel?.parts.find(p => p._id === selectedPartId.value))
)

const series$ = combineLatest([flight$, selectedPart$]).pipe(
    map(([flight, selectedPart]) => flight && selectedPart ? flight.measured_parts[selectedPart._id].map(s => s.name) : undefined)
)

const series = useObservableShallow(series$)


// const { configurations } = useComponentConfiguration()
// const relevantConfiguration = computed(() => selectedPartId.value && selectedPart.value ? configurations[selectedPart.value?.part_type] : undefined)

// const dataConfig = relevantConfiguration.value?.flightDataConfig

// const series = computed(() =>  dataConfig ? Object.keys(dataConfig).map(k => dataConfig[k].seriesName) : [])


</script>