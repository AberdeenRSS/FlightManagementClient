<template>
    <div class="history-container">

    <v-list lines="one">
        <v-list-item v-for="item in allCommands" :key="item._id" :title="item._command_type"
            :subtitle="item.formattedDate">
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
</style>

<script lang="ts" setup>
import { useFlightViewState } from '@/composables/useFlightView';
import { getValues } from '@/helper/timeTree';
import { useCommandStore, type Command, type CommandStates } from '@/stores/commands';
import { ref, watch } from 'vue';

type EnrichedCommand = Command & {
    stateIcon: string,
    stateIconColor: string,
    formattedDate: string,
}


const { vesselId, flightId, timeRange } = useFlightViewState()

const { store, getAllForFlight } = useCommandStore()

const allCommands = ref<EnrichedCommand[]>([])

const stateIconMap: {[P in CommandStates]: string} = {
    completed: 'mdi-progress-check',
    dispatched: 'mdi-progress-upload',
    received: 'mdi-progress-clock',
    new: 'mdi-alert-circle',   
    failed: 'mdi-alert-circle'
}

const stateIconColorMap: {[P in CommandStates]: string} = {
    completed: 'light-green-accent-4',
    dispatched: 'black',
    received: 'black',
    new: 'black',   
    failed: 'red-darken-2'
}

watch([store, timeRange], ([s, range]) => {
    const commandTimelines = getAllForFlight(flightId.value)

    const res: Command[] = []

    commandTimelines.forEach(t => {
        const commands = getValues(t.commands, range.start, range.cur)

        res.push(...commands)
    });

    res.sort((a, b) => (typeof a.create_time === 'string' ? Date.parse(a.create_time) : a.create_time.getTime()) - (typeof b.create_time === 'string' ? Date.parse(b.create_time) : b.create_time.getTime()))

    const enriched: EnrichedCommand[] = []

    res.forEach(c => {

        const date = typeof c.create_time == 'string' ? new Date(c.create_time) : c.create_time;

        enriched.push({
            ...c,
            stateIcon: stateIconMap[c.state],
            stateIconColor: stateIconColorMap[c.state],
            formattedDate: date.toLocaleTimeString()
        })
    })

    allCommands.value = enriched

}, { immediate: true, deep: true })


</script>