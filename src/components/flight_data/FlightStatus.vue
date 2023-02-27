<template>

</template>

<style lang="scss">

</style>

<script lang="ts" setup>

import { defineProps, inject } from 'vue'
import { DASHBOARD_WIDGET_ID, useDashboardWidgetStore } from '../misc/dashboard/DashboardComposable';

defineProps({
    vesselId: {
        type: String,
        required: true
    },
    flightId: {
        type: String,
        required: true
    },
    selectedTimeRange: {
        type: Object,
        required: true
    }
})

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)

if (!dashboardWidgetId)
    throw new Error('Resizer not used in within a dashboard')

const { widget } = useDashboardWidgetStore(dashboardWidgetId)

</script>