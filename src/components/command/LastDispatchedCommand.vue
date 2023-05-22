<template>
    <div>
        <div v-if="command">
            State: {{ command.state }}
            <br/>
            Time: {{ command.formattedDate }}
            <br/>
            Response: {{ command.response_message }}

        </div>

    </div>
</template>

<style lang="scss">


</style>

<script lang="ts" setup>
import { useFlightViewState } from '@/composables/useFlightView';
// import { getClosest } from '@/helper/timeTree';
import { useCommandStore, type Command, type CommandStates } from '@/stores/commands';
import { toRefs } from 'vue';
import { fromImmediate, useObservableShallow } from '@/helper/reactivity';

import { switchMap, combineLatest, map, filter } from 'rxjs'

const props = defineProps({
    commandType: {
        type: String,
        required: true
    },
    part: {
        type: String,
        required: true
    }
})

const { commandType, part } = toRefs(props)

type EnrichedCommand = Command & {
    stateIcon: string,
    stateIconColor: string,
    formattedDate: string,
}

const { flightId  } = useFlightViewState()

// const timeRangeThrottled$ = fromImmediate(timeRange).pipe(throttleTime(100))

const { getOrInitLastCommand } = useCommandStore()


const stateIconMap: { [P in CommandStates]: string } = {
    success: 'mdi-progress-check',
    dispatched: 'mdi-progress-upload',
    received: 'mdi-progress-clock',
    new: 'mdi-alert-circle',
    failed: 'mdi-alert-circle'
}

const stateIconColorMap: { [_ in CommandStates]: string } = {
    success: 'light-green-accent-4',
    dispatched: 'black',
    received: 'black',
    new: 'black',
    failed: 'red-darken-2'
}


const store$ = combineLatest([fromImmediate(flightId), fromImmediate(part), fromImmediate(commandType)]).pipe(
    switchMap(([f, p, t]) => fromImmediate(getOrInitLastCommand(f, p, t))),
)

const command$ = store$.pipe(
    filter(s => !!s),
    // map(([store, range]) => getClosest(store.commands, range!.cur)),
    map(c => !c ? undefined : ({
        ...c,
        stateIcon: stateIconMap[c.state],
        stateIconColor: stateIconColorMap[c.state],
        formattedDate: c.start.toLocaleTimeString()
    } as EnrichedCommand))
)

const command = useObservableShallow(command$)


</script>