<template>
   
        <div focusable class="d-flex justify-space-between dispatch-container" style="height: 40px;"
            @focusin="cmdExpanded = true">

            <v-menu :noClickAnimation="true" :transition="false" close-delay="0" open-delay="0" location="top">
                <template v-slot:activator="{ props }">
                    <v-btn variant="outlined" size="medium" dark v-bind="props">
                        {{ selectedPart?.name ?? 'Select Part' }}
                    </v-btn>
                </template>

                <div class="component-select">
                    <VesselChart :vessel-id="vesselId" :version="flight?._vessel_version" v-model="selected"></VesselChart>
                </div>
            </v-menu>
            <v-select density="compact" :single-line="true" location="top" label="Command" item-title="name" :items="availableCommands"
                v-model="selectedCommandType" transition="none"></v-select>


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

</style>
  
<script setup lang="ts">
import VesselChart from '@/components/vessel/VesselChart.vue';
import { useFlightViewState } from '@/composables/useFlightView';
import { fromImmediate, useObservableShallow } from '@/helper/reactivity';
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { combineLatest, map } from 'rxjs';
import { computed, ref, toRefs, watch } from 'vue';

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
    // eslint-disable-next-line no-unused-vars
    (event: 'update:commandType', value: string | undefined): void,
    // eslint-disable-next-line no-unused-vars
    (event: 'update:partId', value: string | undefined): void,
}>()

const { commandType, partId } = toRefs(props)

const selectedCommandTypeBacking = ref<string | undefined>()

watch(commandType!, value => selectedCommandTypeBacking.value = value, { immediate: true })

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

const { vessel$, flight$ } = getFlightAndHistoricVessel(vesselId, flightId)

const flight = useObservableShallow(flight$)

const selected = ref<{ [id: string]: boolean }>({})


const selectedPart$ = combineLatest([vessel$, fromImmediate(selectedPartId)]).pipe(
    map(([vessel, partId]) => vessel && partId ? vessel?.parts.find(p => p._id === partId) : undefined)
)

const availableCommands$ = combineLatest([flight$, fromImmediate(selectedPartId)]).pipe(
    map(([f, p]) => f && p && f.available_commands[p] ? f.available_commands[p] : [])
)

const selectedPart = useObservableShallow(selectedPart$)
const availableCommands = useObservableShallow(availableCommands$)


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



  