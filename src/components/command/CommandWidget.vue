<template>
    <div class="command-widget d-flex flex-column justify-space-between" style="height: 100%;">

        <div>
            <LastDispatchedCommand v-if="selectedPart && widgetData.commandDispatchSelectedCommandType" :part="selectedPart"
                :command-type="widgetData.commandDispatchSelectedCommandType"></LastDispatchedCommand>
        </div>

        <div class="w-100 flex-shrink-1 command-widget-dispatch-btn">
            <CommandDispatchButton :part="selectedPart" :command-type="widgetData.commandDispatchSelectedCommandType"
                :text="btnText"></CommandDispatchButton>
        </div>
    </div>
</template>

<style lang="scss">
    .command-widget {

        .command-widget-dispatch-btn{
            flex-basis: 2rem;
        }

        .dispatch-btn{
            width: 100%;
            height: 100%;
        }
    }

</style>

<script setup lang="ts">

import CommandDispatchButton from './CommandDispatchButton.vue';

import { inject } from 'vue';
import { useWidgetData } from '../flight_data/flightDashboardElemStoreTypes';
import { DASHBOARD_WIDGET_ID } from '../misc/dashboard/DashboardComposable';
import { fromImmediate, useObservableShallow } from '@/helper/reactivity';
import { map } from 'rxjs'
import LastDispatchedCommand from './LastDispatchedCommand.vue';

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Resizer not used in within a dashboard')

const widgetData = useWidgetData(dashboardWidgetId)

const selectedPart$ = fromImmediate(widgetData).pipe(
    map(wd => Object.keys(wd.selectedParts).filter(k => wd.selectedParts[k])),
    map(p => p.length > 0 ? p[0] : undefined)
)

const selectedPart = useObservableShallow(selectedPart$)

const btnText$ = fromImmediate(widgetData).pipe(
    map(wd => wd.commandDispatchSelectedCommandType),
    // map(t => `Dispatch ${t}`)
)

const btnText = useObservableShallow(btnText$)


</script>