<template>
    <v-btn class="dispatch-btn" v-if="!loading" size="medium" :disabled="!commandType || !part || !commandAvailable" variant="outlined" color="error" @click="onDispatchCommand">
        {{ text ?? 'Send' }}
    </v-btn>

    <v-progress-circular v-if="loading" indeterminate color="primary"></v-progress-circular>

    <v-tooltip v-if="error" :text="error" location="top">
        <template v-slot:activator="{ props }">
            <v-icon v-bind="props" size="x-large" color="error" icon="mdi-alert-circle"></v-icon>
        </template>
    </v-tooltip>
</template>

<style lang="scss">

</style>

<script lang="ts" setup>

import { useFlightViewState } from '@/composables/useFlightView';
import { fromImmediate, useObservableShallow, waitUntil } from '@/helper/reactivity';
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { useCommandStore, type Command } from '@/stores/commands';
import { combineLatest, map, of, type Observable } from 'rxjs';
import { v4 } from 'uuid';
import { ref, toRefs } from 'vue';

const props = defineProps({
    commandType: {
        type: String,
        default: undefined
    },
    part: {
        type: String,
        default: undefined
    },
    text: {
        type: String
    }
})

const { commandType, part, text } = toRefs(props)

const { flightId, vesselId } = useFlightViewState()

const  {  flight$ } = getFlightAndHistoricVessel(vesselId, flightId)
// const part$ = getPart(vessel$, part)

const { dispatchCommand } = useCommandStore()

let commandAvailable$: Observable<boolean>;

if(part && commandType){

    commandAvailable$ = combineLatest([flight$, fromImmediate(part), fromImmediate(commandType)]).pipe(
        map(([f, p, t]) => !!f && !!p && !!t)
    )
}
else{
    commandAvailable$ = of(false)
}

const commandAvailable = useObservableShallow(commandAvailable$)

const loading = ref<boolean>(false)

const error = ref<undefined | string>()

async function onDispatchCommand() {

    const command =  ({
        _id: v4(),
        _command_type: commandType!.value,
        _part_id: part!.value,
        create_time: new Date(Date.now()),
        response_message: '',
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