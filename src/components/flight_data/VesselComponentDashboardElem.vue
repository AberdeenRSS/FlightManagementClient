<template>

    <v-card style="height: 100%; width: 100%;" :widgetSize="size">


        <v-layout style="height: 100%; width: 100%;">

            <v-navigation-drawer permanent expand-on-hover rail location="left" :model-value="drawerExpanded">

                <v-list density="compact" nav>
                    <v-list-item prepend-icon="mdi-shape" title="Select Parts" :active="selectedView === 'part'" @click="selectedView = 'part'"></v-list-item>
                    <v-list-item prepend-icon="mdi-chart-timeline-variant" title="Data" :active="selectedView === 'data'" @click="selectedView = 'data'">
                    </v-list-item>
                    <v-list-item prepend-icon="mdi-poll" title="Status" :active="selectedView === 'status'" @click="selectedView = 'status'">
                    </v-list-item>
                    <v-list-item prepend-icon="mdi-console" title="Send command" :active="selectedView === 'command'" @click="selectedView = 'command'">
                    </v-list-item>
                </v-list>

                <template v-slot:append>
                    <v-list density="compact" nav>
                        <v-list-item prepend-icon="mdi-arrow-split-horizontal" title="Resize" :active="selectedView === 'resize'" @click="selectedView = 'resize'"></v-list-item>
                        <v-list-item>
                            <template v-slot:prepend><v-icon icon="mdi-delete-forever" color="error"></v-icon></template>
                            <v-btn
                                class="ma-2"
                                color="error"
                                @click="deleteWidget()"
                            >Delete</v-btn>
                        </v-list-item>
                    </v-list>
                </template>

            </v-navigation-drawer>

            <template v-if="selectedView === 'part'">
                <VesselChart :vessel-id="vesselId" @selected-parts="onPartsSelected"></VesselChart>
            </template>

            <template v-if="selectedView === 'data' && selected">
                <SimpleFlightDataChart :vessel-id="vesselId" :flight-id="flightId" :vessel-part-id="selected"></SimpleFlightDataChart>
            </template>

            <template v-if="selectedView === 'resize'">
                <v-main>
                    <DashboardResizer></DashboardResizer>
                </v-main>
            </template>

        </v-layout>

    </v-card>


</template>

<script setup lang="ts">

import VesselChart from '@/components/vessel/VesselChart.vue';
import DashboardResizer from '@/components/misc/dashboard/DashboardResizer.vue'

import { inject, ref } from 'vue';
import { toRefs } from 'vue';
import { DASHBOARD_WIDGET_ID, useDashboardWidgetStore } from '../misc/dashboard/DashboardComposable';
import SimpleFlightDataChart from './SimpleFlightDataChart.vue'

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Resizer not used in within a dashboard')

const { deleteWidget } = useDashboardWidgetStore(dashboardWidgetId)

type Views = 'part' | 'data' | 'status' | 'command' | 'resize'

const size = ref({x: 2, y: 2})

const props = defineProps({
    vesselId: {
        type: String,
        required: true
    },
    flightId: {
        type: String,
        required: true
    },
});

const { vesselId, flightId } = toRefs(props)

const drawerExpanded = ref(true)

const selectedView = ref<Views>('part')

const selected = ref<string | undefined>(undefined)

async function onPartsSelected(parts: { [id: string]: boolean }) {
    const new_selected = Object.keys(parts).filter(k => parts[k])
    if (new_selected.length < 1) {
        selected.value = undefined
        return
    }

    selected.value = new_selected[0]

}

</script>