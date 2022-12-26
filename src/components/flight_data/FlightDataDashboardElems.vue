<template>

    <v-layout>

        <v-navigation-drawer permanent expand-on-hover rail location="left" :model-value="drawerExpanded">
                <v-list>
                    <v-list-item prepend-icon="mdi-view-grid" title="Arrange" ></v-list-item>
                </v-list>

                <v-divider></v-divider>

                <v-list density="compact" nav>
                    <v-list-item prepend-icon="mdi-folder" title="My Files" value="myfiles"></v-list-item>
                    <v-list-item prepend-icon="mdi-account-multiple" title="Shared with me" value="shared">
                       
                    </v-list-item>
                    <v-list-item prepend-icon="mdi-star" title="Starred" value="starred"></v-list-item>
                </v-list>
            </v-navigation-drawer>

        <SimpleFlightDataChart :vessel-id="vesselId" :flight-id="flightId" :vessel-part-id="vesselPartIdPreview"></SimpleFlightDataChart>

    </v-layout>

</template>

<script setup lang="ts">
import SimpleFlightDataChart from '@/components/flight_data/SimpleFlightDataChart.vue'
import { ref } from 'vue';
import { toRefs } from 'vue';

const drawerExpanded = ref(true)

    const props = defineProps({
        vesselId: {
            type: String,
            required: true
        },
        flightId: {
            type: String,
            required: true
        },
        vesselPartIdPreview: {
            type: String,
            required: true
        },
        
    });

    const { flightId, vesselPartIdPreview, vesselId } = toRefs(props)
</script>