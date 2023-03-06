<template>
    <v-btn v-if="!loading" size="medium" :disabled="!commandType || !part" variant="outlined" color="error" @click="onDispatchCommand">Send</v-btn>

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
import { v4 } from 'uuid';
import { defineProps, ref, toRefs, watch, type Ref } from 'vue';

const props = defineProps({
    commandType: {
        type: String,
        default: undefined
    },
    part: {
        type: String,
        default: undefined
    }
})

const { commandType, part } = toRefs(props)

const { vesselId, flightId, timeRange } = useFlightViewState()

const { dispatchCommand } = useCommandStore()

const loading = ref<boolean>(false)

const error = ref<undefined | string>()

async function onDispatchCommand() {

    const command =  ({
        _id: v4(),
        _command_type: commandType!.value,
        _part_id: part!.value,
        create_time: new Date(Date.now()),
        state: 'new',
    } as Command)

    const request = dispatchCommand(flightId.value, command)

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