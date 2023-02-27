<template>
    <div class="d-flex justify-space-between align-center">
        <v-icon icon="mdi-console-line" size="x-large"></v-icon>
        <v-menu location="top">
            <template v-slot:activator="{ props }">
                <v-btn variant="outlined" dark v-bind="props">
                    {{ selectedPart ?? 'Select Part' }}
                </v-btn>
            </template>

            <div class="component-select">
                <VesselChart :vessel-id="vesselId" v-model="selected" ></VesselChart> 
            </div>
        </v-menu>
        <v-select
        density="compact"
        :single-line="true"
        label="Command"
        :items="['Ignite']"
        ></v-select>
        <v-btn variant="outlined" color="error">Send</v-btn>
        <v-btn variant="plain" size="x-large" :icon="cmdExpanded ? 'mdi-menu-down' : 'mdi-menu-up'"></v-btn>
    </div>
</template>

<style lang="scss">

    .component-select {

        background-color: rgba(112, 112, 112, 0.563);

        height: 30vw;
        width: 20vw;

        min-height: 30vh;
        min-width: 20vw;
    }

</style>
  
<script setup lang="ts">
import { ref, toRefs, watch } from 'vue';
import VesselChart from '@/components/vessel/VesselChart.vue'

const cmdExpanded = ref(false)

const props = defineProps({
    vesselId: {
        type: String,
        required: true
    },
    flightId: {
        type: String,
        required: true
    }
});

const { vesselId, flightId } = toRefs(props)

const selected = ref<{[id: string]: boolean}>({})

const selectedPart = ref<string | undefined>()

watch(selected, s => {

    const keys = Object.keys(s).filter(k => s[k])
    if(!keys)
        selectedPart.value = undefined
    else
        selectedPart.value = keys[0]
})

</script>



  