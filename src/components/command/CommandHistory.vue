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
import { ALL_STORE_PLACEHOLDER, useCommandStore, type Command, type CommandStates } from '@/stores/commands';
import { ref, watch } from 'vue';

type EnrichedCommand = Command & {
    stateIcon: string,
    stateIconColor: string,
    formattedDate: string,
}


const { vesselId, flightId, timeRange } = useFlightViewState()

const { store, getOrInitStore  } = useCommandStore()

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

watch([flightId, store, timeRange], ([f, s, range]) => {

    const scopedStore = getOrInitStore(f, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)

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

}, { immediate: true, deep: true })


</script>