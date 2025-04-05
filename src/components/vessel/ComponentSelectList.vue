<template>
    <v-item-group selected-class="bg-primary" v-if="vessel">
        <div v-for="v in vessel.parts" :key="v._id">
            <v-item v-slot="{ selectedClass, toggle }">
                <v-card :class="['d-flex align-center', selectedClass]" height="40" dark @click="toggle(); selectedPartID=v._id">
                    <div class="flex-grow-1">
                        {{ v.name }}
                    </div>
                </v-card>
            </v-item>
        </div>
    </v-item-group>
</template>

<script lang="ts" setup>

import { useFlightViewState } from '@/composables/useFlightView'
import { useObservableShallow } from '@/helper/reactivity'
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods'
import { computed, ref, toRefs, watch } from 'vue'


const props = defineProps({
    partId: {
        type: String,
        default: undefined
    }
})

const emit = defineEmits<{
    // eslint-disable-next-line no-unused-vars
    (event: 'update:partId', value: string | undefined): void,
}>()

const { partId } = toRefs(props)

const { vesselId, flightId } = useFlightViewState()

const { vessel$, flight$ } = getFlightAndHistoricVessel(vesselId, flightId)


const vessel = useObservableShallow(vessel$)

const selectedPartIDBacking = ref()

watch(partId!, value => selectedPartIDBacking.value = value, { immediate: true })

const selectedPartID = computed({
    get() {
        return selectedPartIDBacking.value
    },
    set(value: string | undefined) {
        selectedPartIDBacking.value = value
        emit('update:partId', value)
    }
})


</script>