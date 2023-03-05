<template>
    <div class="cmd-history">
        <CommandHistory></CommandHistory>
    </div>
    <div focusable class="d-flex justify-space-between dispatch-container" style="height: 40px;"
        @focusin="cmdExpanded = true">
        <v-select density="compact" :single-line="true" location="top" label="Command" :items="availableCommands"
            v-model="selectedCommandType" transition="none"></v-select>
        <v-menu :noClickAnimation="true" :transition="false" close-delay="0" open-delay="0" location="top">
            <template v-slot:activator="{ props }">
                <v-btn variant="outlined" size="medium" dark v-bind="props">
                    {{ selectedPart?.name ?? 'Select Part' }}
                </v-btn>
            </template>

            <div class="component-select">
                <VesselChart :vessel-id="vesselId" v-model="selected" :filter="componentFilter"></VesselChart>
            </div>
        </v-menu>

        <CommandDispatchButton :command="command"></CommandDispatchButton>
        <!-- <v-btn variant="plain" size="small" :icon="cmdExpanded ? 'mdi-menu-down' : 'mdi-menu-up'"
            @click="cmdExpanded = !cmdExpanded"></v-btn> -->
    </div>
</template>

<style lang="scss">
.dispatch-container {
    padding: 0 4rem;

    @media screen and (max-width: 800px) {

        padding: 0 1rem;

    }
}

.component-select {

    background-color: rgba(112, 112, 112, 0.563);

    z-index: 700;

    height: 30vw;
    width: 20vw;

    min-height: 30vh;
    min-width: 20vw;
}

.cmd-history {
}
</style>
  
<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue';
import VesselChart from '@/components/vessel/VesselChart.vue'
import { useVesselStore } from '@/stores/vessels';
import { useFlightViewState } from '@/composables/useFlightView';
import { useFlightStore } from '@/stores/flight';
import CommandDispatchButton from './CommandDispatchButton.vue';
import type { Command } from '@/stores/commands';
import { v4 } from 'uuid';
import CommandHistory from './CommandHistory.vue';

const cmdExpanded = ref(false)

const { vesselId, flightId, timeRange } = useFlightViewState()
const vesselStore = useVesselStore()

const flightStore = useFlightStore()

const flight = computed(() => vesselId && flightId ? flightStore.vesselFlights[vesselId.value]?.flights[flightId.value]?.flight : undefined)

const selected = ref<{ [id: string]: boolean }>({})

const selectedPartId = ref<string | undefined>()

const vessel = vesselStore.getVessel(vesselId.value)

const selectedPart = computed(() => vessel && selectedPartId.value ? vessel.parts.find(p => p._id === selectedPartId.value) : undefined)

const availableCommands = ref<string[]>([])

const selectedCommandType = ref<string | undefined>(undefined)

const command = ref<Command | undefined>()

const componentFilter = ref<string[]>([])


watch(flight, f => {

    if (!f) {
        availableCommands.value = []
        return
    }

    availableCommands.value = Object.keys(f.available_commands)

}, { immediate: true, deep: true })

watch([selectedCommandType, flight], ([commandType, f]) => {
    if(!commandType || !f){
        componentFilter.value = []
        return
    }

    componentFilter.value = f.available_commands[commandType].supporting_parts
},  { immediate: true, deep: true })


watch(selected, s => {

    const keys = Object.keys(s).filter(k => s[k])
    if (!keys)
        selectedPartId.value = undefined
    else
        selectedPartId.value = keys[0]
}, {immediate: true, deep: true})

watch([selectedCommandType, selectedPartId], ([commandType, part]) => {
    command.value = commandType && part ? ({
        _id: v4(),
        _command_type: commandType,
        _part_id: part,
        create_time: new Date(Date.now()),
        state: 'new',
    } as Command) : undefined
}, { immediate: true })

</script>



  