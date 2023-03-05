<template>

<div class="d-flex dashboard-resize-body">

    <div class="d-flex flex-column flex-grow">
        <v-btn density="compact" icon="" class="resize-btn-invisible" :disabled="true"></v-btn>
        <v-btn density="compact" icon="mdi-minus" :disabled="!canResize.shrinkHorizontal" @click="resize('shrinkHorizontal')"></v-btn>
        <v-btn density="compact" icon="" class="resize-btn-invisible" :disabled="true"></v-btn>
    </div>
    <div class="d-flex flex-column flex-grow">
        <v-btn density="compact" icon="mdi-minus" :disabled="!canResize.shrinkVertical" @click="resize('shrinkVertical')"></v-btn>
        <v-btn density="compact" icon="mdi-border-outside" :disabled="true"></v-btn>
        <v-btn density="compact" icon="mdi-plus" :disabled="!canResize.enlargeVertical" @click="resize('enlargeVertical')"></v-btn>
    </div>
    <div class="d-flex flex-column flex-grow">
        <v-btn density="compact" icon="" class="resize-btn-invisible" :disabled="true" ></v-btn>
        <v-btn density="compact" icon="mdi-plus" :disabled="!canResize.enlargeHorizontal" @click="resize('enlargeHorizontal')"></v-btn>
        <v-btn density="compact" icon="" class="resize-btn-invisible" :disabled="true"></v-btn>
    </div>
</div>
</template>

<style lang="scss">

.dashboard-resize-body {
    container-type: inline-size;
    container-name: dashboard-resize-body;

    button {
        border-radius: 0 !important;
    }

    .resize-btn-invisible{
                opacity: 0;
    }

}

</style>

<script lang="ts" setup>
import { inject } from 'vue';
import { DASHBOARD_WIDGET_ID, useDashboardWidgetStore as useDashboardWidgetStore, type ResizeDirections } from './DashboardComposable';

    const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

    if (!dashboardWidgetId)
        throw new Error('Resizer not used in within a dashboard')

    const { canResize, resizeWidget } = useDashboardWidgetStore(dashboardWidgetId)

    function resize(direction: ResizeDirections){
        resizeWidget(direction)
    }

</script>

<style lang="scss">
</style>