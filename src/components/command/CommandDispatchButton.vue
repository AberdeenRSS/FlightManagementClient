<template>

    <v-text-field label="Label" density="compact" v-if="commandSchema == '[str]'" v-model="commandContent"></v-text-field>

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
import { useObservable } from '@vueuse/rxjs';
import { combineLatest, filter, map, of, shareReplay, type Observable } from 'rxjs';
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

const  { flight$, vessel$ } = getFlightAndHistoricVessel(vesselId, flightId)
// const part$ = getPart(vessel$, part)

const flight = useObservable(flight$)

const commandSchemaAndIndex$ = combineLatest([flight$, fromImmediate(part!), fromImmediate(commandType!)]).pipe(
    filter(([f, p, t]) => !!f && !!p && !!t),
    map(([f, p, t]) => {
            const index = f!.available_commands[p!].findIndex(c => c.name == t)
            return [index, f!.available_commands[p!][index].payload_schema]
        }),
    shareReplay(1)
)

const partIndex$ = combineLatest([vessel$, fromImmediate(part!)]).pipe(
    map(([v, p]) => v?.parts.findIndex(x => x._id === p)),
    filter(i => !!i && i > -1),
    shareReplay(1)
)

const partIndex = useObservable(partIndex$)

const commandSchema$ = commandSchemaAndIndex$.pipe(map(([_, schema]) => schema), shareReplay(1))
const commandIndex$ = commandSchemaAndIndex$.pipe(map(([index, _]) => index), shareReplay(1))

const commandContent = ref<string | boolean | number>()

const commandSchema = useObservable(commandSchema$)
const commandIndex = useObservable(commandIndex$)


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
        _part_index: partIndex.value,
        create_time: new Date(Date.now()),
        response_message: '',
        state: 'new',
        command_index: commandIndex.value,
        command_schema: commandSchema.value,
        command_payload: commandContent.value
    } as Command)

    await dispatchCommand(flightId.value, vesselId.value, command)

}

</script>