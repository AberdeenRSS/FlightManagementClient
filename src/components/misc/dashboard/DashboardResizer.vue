<template>

<div class="d-flex">

    <div class="d-flex flex-column flex-grow">
        <v-btn :disabled="true"></v-btn>
        <v-btn :disabled="!canResize.shrinkHorizontal" @click="resize('shrinkHorizontal')">-</v-btn>
        <v-btn :disabled="true"></v-btn>
    </div>
    <div class="d-flex flex-column flex-grow">
        <v-btn :disabled="!canResize.shrinkVertical" @click="resize('shrinkVertical')">-</v-btn>
        <v-btn :disabled="true"></v-btn>
        <v-btn :disabled="!canResize.enlargeVertical" @click="resize('enlargeVertical')">+</v-btn>
    </div>
    <div class="d-flex flex-column flex-grow">
        <v-btn :disabled="true"></v-btn>
        <v-btn :disabled="!canResize.enlargeHorizontal" @click="resize('enlargeHorizontal')">+</v-btn>
        <v-btn :disabled="true"></v-btn>
    </div>
</div>
</template>

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