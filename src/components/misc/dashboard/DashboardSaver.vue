<template>
    <div>
        xxx
    </div>

</template>

<style lang="scss">

</style>

<script lang="ts" setup>

import {defineProps, onMounted, toRefs} from 'vue'
import { useDashboardStore } from './DashboardComposable';

const props = defineProps({
    dashboardId: {
        type: String,
        required: true
    }
})

const {dashboardId} = toRefs(props)

onMounted(() => {
    const {store} = useDashboardStore(dashboardId.value)

    store.value

})




</script>