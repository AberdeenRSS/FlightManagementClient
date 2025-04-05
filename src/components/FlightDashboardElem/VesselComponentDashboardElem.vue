<template>
    <v-card style="height: 100%; width: 100%;" :widgetSize="size" >
        <div class="card-content">

            <div style="height: 100%;" class="card-body">


                <div  class="d-flex flex-column" style="height: 100%;">

                    <div  class="d-flex justify-space-between align-center">
                        <v-btn  icon="mdi-cog-outline" variant="plain"
                            @click="onSettings"></v-btn>
                        <div>{{ title }}</div>
                        <div><v-icon :icon="relevantConfiguration?.iconId ?? 'mdi-checkbox-blank'"></v-icon></div>
                    </div>

                    <div class="flex-grow-from-small" v-if="widgetData.selectedView === 'Graph'">
                        <SimpleFlightDataChart></SimpleFlightDataChart>
                    </div>

                    <div class="flex-grow-1" v-if="widgetData.selectedView === 'Status'">
                        <FlightStatus></FlightStatus>
                    </div>

                    <div class="flex-grow-1" v-if="widgetData.selectedView === 'Command'">
                        <CommandWidget></CommandWidget>
                    </div>

                    <div class="flex-grow-1" v-if="widgetData.selectedView === '3D Model'">
                        <FlightStatus3D></FlightStatus3D>
                    </div>

                    <div class="flex-grow-1" v-if="widgetData.selectedView === 'Map'">
                        <GeoMap></GeoMap>
                    </div>

                </div>

            </div>
        </div>
    </v-card>
</template>

<style lang="scss">

.flex-grow-from-small {
    height: 100px;
    flex-grow: 1;
}


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


import FlightStatus3D from '../flight_data/3dFlightStatus/3dFlightStatus.vue';
import FlightStatus from '../flight_data/FlightStatus.vue';
import SimpleFlightDataChart from '../flight_data/SimpleFlightDataChart.vue';
import CommandWidget from '../command/CommandWidget.vue';
import GeoMap from '../flight_data/map/GeoMap.vue';

import { useComponentConfiguration } from '@/composables/componentsConfiguration/componentConfiguration';
import { useFlightViewState } from '@/composables/useFlightView';
import { useObservableShallow } from '@/helper/reactivity';
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { getPart } from '@/stores/vessels';
import { map, shareReplay } from 'rxjs';
import {  inject, ref } from 'vue';
import { useSelectedPart, useWidgetData } from '../flight_data/flightDashboardElemStoreTypes';
import { DASHBOARD_WIDGET_ID } from '../misc/dashboard/DashboardComposable';


const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Resizer not used in within a dashboard')

const { vesselId, flightId, setElementInSettings } = useFlightViewState()
const widgetData = useWidgetData(dashboardWidgetId)

if (!('inSettings' in widgetData.value) && dashboardWidgetId)
    setElementInSettings(dashboardWidgetId)

widgetData.value.selectedParts = widgetData.value.selectedParts ?? {}
widgetData.value.selectedView = widgetData.value.selectedView ?? 'Graph'
widgetData.value.inSettings = 'inSettings' in widgetData.value ? widgetData.value.inSettings : true

const selectedPartId = useSelectedPart(dashboardWidgetId)

const { vessel$ } = getFlightAndHistoricVessel(vesselId, flightId)
const selectedPart$ = getPart(vessel$, selectedPartId).pipe(shareReplay())
// const selectedPart = useObservableShallow(selectedPart$)

const size = ref({ x: 2, y: 2 })

const title = useObservableShallow(selectedPart$.pipe(map(p => p?.name ?? 'No part selected')))

const { configurations } = useComponentConfiguration()
const relevantConfiguration$ = selectedPart$.pipe(map(part => part ? configurations[part.part_type] : undefined))
const relevantConfiguration = useObservableShallow(relevantConfiguration$)

// const debouncedRange = ref(timeRange.value)
// const debounceTime = computed(() => live.value ? 4000 : 300)
// watchDebounced(timeRange, r => debouncedRange.value = r, { immediate: true, deep: true, debounce: debounceTime, maxWait: 5000 })

// watch([flightId, selectedPartId, debouncedRange, resolution, live], ([v, id, r, res, l]) => {

//     if (!id)
//         return

//     if (!r)
//         return

//     if (!l)
//         return

//     if (res == 'eternity')
//         return

//     fetchFlightDataInTimeFrame(v, id, r.start, r.end, res)
// }, { immediate: true, deep: true })

function onSettings(){
    setElementInSettings(dashboardWidgetId)
}

</script>

