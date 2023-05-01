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
                <VesselChart :vessel-id="vesselId" :version="flight?._vessel_version" v-model="selected" :filter="componentFilter"></VesselChart>
            </div>
        </v-menu>

        <slot>

        </slot>

        <!-- <v-btn variant="plain" size="small" :icon="cmdExpanded ? 'mdi-menu-down' : 'mdi-menu-up'"
            @click="cmdExpanded = !cmdExpanded"></v-btn> -->
    </div>
</template>

<style lang="scss">
.dispatch-container {
    padding: 0 1rem;

    // @media screen and (max-width: 800px) {

    //     padding: 0 1rem;

    // }
}

.component-select {

    background-color: rgba(112, 112, 112, 0.563);

    z-index: 701;

    height: 30vw;
    width: 20vw;

    min-height: 30vh;
    min-width: 20vw;
}

.cmd-history {}
</style>
  
<script setup lang="ts">
import { computed, ref, toRefs, watch } from 'vue';
import VesselChart from '@/components/vessel/VesselChart.vue'
import { useVesselStore, getVesselHistoric, type Vessel } from '@/stores/vessels';
import { useFlightViewState } from '@/composables/useFlightView';
import { useFlightStore } from '@/stores/flight';
import CommandDispatchButton from './CommandDispatchButton.vue';
import type { Command } from '@/stores/commands';
import { v4 } from 'uuid';
import CommandHistory from './CommandHistory.vue';

const props = defineProps({
    commandType: {
        type: String,
        default: undefined
    },
    partId: {
        type: String,
        default: undefined
    }
})

const emit = defineEmits<{
    (event: 'update:commandType', value: string | undefined): void,
    (event: 'update:partId', value: string | undefined): void,
}>()

const { commandType, partId } = toRefs(props)

const selectedCommandTypeBacking = ref<string | undefined>()

watch(commandType!, value => selectedCommandTypeBacking.value = value, {immediate: true})

const selectedCommandType = computed({
    get() {
        return selectedCommandTypeBacking.value
    },
    set(value: string | undefined) {
        selectedCommandTypeBacking.value = value
        emit('update:commandType', value)
    }
})

const selectedPartId = ref<string | undefined>()

watch(partId!, value => selectedPartId!.value = value, { immediate: true })

const cmdExpanded = ref(false)

const { vesselId, flightId } = useFlightViewState()
const vesselStore = useVesselStore()

const flightStore = useFlightStore()

const flight = computed(() => vesselId && flightId ? flightStore.vesselFlights[vesselId.value]?.flights[flightId.value]?.flight : undefined)

const selected = ref<{ [id: string]: boolean }>({})

const vessel = ref<Vessel | undefined>(undefined)

watch(flight, f => {
    if(!f)
        return
    vesselStore.fetchHistoricVessel(f._vessel_id, f._vessel_version)
    watch(getVesselHistoric(vesselStore, f._vessel_id, f._vessel_version), v =>{ 
        if(v?.entity)
            vessel.value = v.entity
    }, {immediate: true, deep: true} )
}, {immediate: true, deep: true})

const selectedPart = computed(() => vessel.value && selectedPartId.value ? vessel.value.parts.find(p => p._id === selectedPartId.value) : undefined)

const availableCommands = ref<string[]>([])

const componentFilter = ref<string[]>([])


watch(flight, f => {

    if (!f) {
        availableCommands.value = []
        return
    }

    availableCommands.value = Object.keys(f.available_commands)

}, { immediate: true, deep: true })

watch([selectedCommandType!, flight], ([commandType, f]) => {
    if (!commandType || !f) {
        componentFilter.value = []
        return
    }

    componentFilter.value = f.available_commands[commandType].supporting_parts
}, { immediate: true, deep: true })


watch(selected, s => {

    const keys = Object.keys(s).filter(k => s[k])
    if (!keys) {
        selectedPartId.value = undefined
        emit('update:partId', undefined)
    }
    else {
        selectedPartId.value = keys[0]
        emit('update:partId', keys[0])
    }
}, { immediate: true, deep: true })


</script>



  