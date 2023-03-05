<template>
    <v-btn v-if="!loading" size="medium" :disabled="!command" variant="outlined" color="error" @click="onDispatchCommand">Send</v-btn>

    <v-progress-circular v-if="loading" indeterminate color="primary"></v-progress-circular>

    <v-tooltip v-if="error" :text="error" location="top">
        <template v-slot:activator="{ props }">
            <v-icon v-bind="props" size="x-large" color="error" icon="mdi-alert-circle"></v-icon>
        </template>
    </v-tooltip>
</template>

<style lang="scss"></style>

<script lang="ts" setup>

import { useFlightViewState } from '@/composables/useFlightView';
import { waitUntil } from '@/helper/reactivity';
import { useCommandStore, type Command } from '@/stores/commands';
import { defineProps, ref, toRefs, watch, type Ref } from 'vue';

const props = defineProps({
    command: {
        type: Object,
    }
})

const { command } = toRefs(props)

const { vesselId, flightId, timeRange } = useFlightViewState()

const { dispatchCommand } = useCommandStore()

const loading = ref<boolean>(false)

const error = ref<undefined | string>()

async function onDispatchCommand() {
    const request = dispatchCommand(flightId.value, command!.value! as Command)

    loading.value = true

    error.value = undefined

    await waitUntil(request.isFinished, f => !!f)

    loading.value = false

    if (request.error.value){
        console.log(request.error.value)
        error.value = request.error.value
    }
}

</script>