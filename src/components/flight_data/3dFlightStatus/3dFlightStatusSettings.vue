<template>
    <v-select v-if="series" density="compact" v-model="widgetData.selectedSeriesMulti['orientation']" label="Select Orientation"  no-data-text="No part selected/Part has no series" :items="series"></v-select>
</template>
    
<style lang="scss"></style>
    
<script lang="ts" setup>

import { useFlightViewState } from '@/composables/useFlightView';
import { fromImmediate, useObservableShallow } from '@/helper/reactivity';
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { } from '@/stores/flight';
import { combineLatest, map } from 'rxjs';
import { toRefs } from 'vue';
import { useSelectedPart, useWidgetData } from '../flightDashboardElemStoreTypes';

const props = defineProps({
    dashboardWidgetId: {
        type: Array,
        required: true
    }
})
const { dashboardWidgetId } = toRefs(props)
const { vesselId, flightId } = useFlightViewState()
const widgetData = useWidgetData(dashboardWidgetId.value as [string, string])
const { vessel$, flight$ } = getFlightAndHistoricVessel(vesselId, flightId)

if (!widgetData.value.selectedSeriesMulti)
    widgetData.value.selectedSeriesMulti = {}

const selectedPartId = useSelectedPart(dashboardWidgetId.value as [string, string])
const selectedPart$ = combineLatest([vessel$, fromImmediate(selectedPartId)]).pipe(
    map(([vessel, _]) => vessel?.parts.find(p => p._id === selectedPartId.value))
)

const series$ = combineLatest([flight$, selectedPart$]).pipe(
    map(([flight, selectedPart]) => flight && selectedPart ? flight.measured_parts[selectedPart._id].filter(s => Array.isArray(s.type) && s.type.length == 4).map(s => s.name) : undefined)
)

const series = useObservableShallow(series$)

</script>