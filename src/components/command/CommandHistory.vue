<template>
    <div class="history-container">

    <v-list lines="one">
        <v-list-item v-for="item in allCommands" :key="item._id" :title="item._command_type" >
            <template  v-slot:prepend>
                {{ item.formattedDate }}
            </template>
            <template v-if="item.response_message" v-slot:subtitle>
                {{ item.response_message }}
            </template>
            <template v-slot:append>
                <v-icon :icon="item.stateIconColor" :color="item.stateIconColor"></v-icon>
                <div :style="`text-color: ${item.stateIconColor};`">{{ item.state.toUpperCase() }}</div>
            </template>
        </v-list-item>
    </v-list>
</div>

</template>

<style lang="scss">
.history-container {
    padding: 0 4rem;

    @media screen and (max-width: 800px) {

        padding: 0 1rem;

    }
}

.v-list-item__prepend {
    padding-right: 1rem;
}
</style>

<script lang="ts" setup>
import { useFlightViewState, type TimeRange } from '@/composables/useFlightView';
import { getValues } from '@/helper/timeTree';
import { ALL_STORE_PLACEHOLDER, useCommandStore, type Command, type CommandStates } from '@/stores/commands';
import { ref, shallowRef, triggerRef, watch, type WatchStopHandle } from 'vue';
import { watchDebounced } from '@vueuse/core';

type EnrichedCommand = Command & {
    stateIcon: string,
    stateIconColor: string,
    formattedDate: string,
}

const { flightId, timeRange } = useFlightViewState()

const timeRangeDebounced = shallowRef<TimeRange | undefined>(undefined)
watchDebounced(timeRange, r => {timeRangeDebounced.value = r ? {...r} : undefined; triggerRef(timeRangeDebounced)}, {immediate: true, deep: true, debounce: 300, maxWait: 1000 })

const { getOrInitStore  } = useCommandStore()

const allCommands = ref<EnrichedCommand[]>([])

const stateIconMap: {[P in CommandStates]: string} = {
    success: 'mdi-progress-check',
    dispatched: 'mdi-progress-upload',
    received: 'mdi-progress-clock',
    new: 'mdi-alert-circle',   
    failed: 'mdi-alert-circle'
}

const stateIconColorMap: {[_ in CommandStates]: string} = {
    success: 'light-green-accent-4',
    dispatched: 'black',
    received: 'black',
    new: 'black',   
    failed: 'red-darken-2'
}

let oldWatch: WatchStopHandle | undefined

watch(flightId, f => {

    if(!f)
        return

    const store$ = getOrInitStore(f, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)

    if(oldWatch)
        oldWatch()

    oldWatch = watch([store$, timeRangeDebounced], ([scopedStore, range]) => {

        if(!range)
            return

        const commands = getValues(scopedStore.commands, range.start, range.cur)

        const enriched: EnrichedCommand[] = []

        commands.forEach(c => {

            const date = typeof c.create_time == 'string' ? new Date(c.create_time) : c.create_time;

            enriched.push({
                ...c,
                stateIcon: stateIconMap[c.state],
                stateIconColor: stateIconColorMap[c.state],
                formattedDate: date.toLocaleTimeString()
            })
        })

        allCommands.value = enriched

    }, {immediate: true, deep: false})


}, { immediate: true, deep: true })


</script>