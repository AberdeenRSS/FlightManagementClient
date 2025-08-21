<template>
    <v-container fluid class="pa-2">
        <v-row v-if="vessel.parts.length > 0">
            <!-- Part Details Column - Shows first on mobile -->
            <v-col cols="12" md="6" lg="7" xl="8" order="1" order-md="2">
                <v-card elevation="2" class="h-100">
                    <v-card-title class="bg-grey-lighten-4">
                        Details
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text>
                        <div v-if="selectedPart">
                            <h3 class="text-h5 mb-4">{{ selectedPart.name }}</h3>
                            <v-list density="comfortable">
                                <v-list-item class="px-0">
                                    <v-list-item-title class="font-weight-bold">Type</v-list-item-title>
                                    <v-list-item-subtitle>
                                        {{ selectedPart.part_type || "No type available" }}
                                    </v-list-item-subtitle>
                                </v-list-item>
                                <v-list-item class="px-0">
                                    <v-list-item-title class="font-weight-bold">Virtual</v-list-item-title>
                                    <v-list-item-subtitle>
                                        {{ selectedPart.virtual }}
                                    </v-list-item-subtitle>
                                </v-list-item>
                            </v-list>
                        </div>
                        <div v-else class="d-flex align-center justify-center" style="min-height: 200px;">
                            <v-empty-state icon="mdi-select" text="Select a part to view details" />
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- Parts List Column - Shows second on mobile -->
            <v-col cols="12" md="6" lg="5" xl="4" order="2" order-md="1">
                <v-card elevation="2">
                    <v-card-title class="bg-primary text-white d-flex">
                        <p>Parts</p>
                    </v-card-title>
                    <v-divider></v-divider>
                    <v-card-text class="pa-0">
                        <v-text-field class="pa-4" v-model="partSearchQuery" prepend-inner-icon="mdi-magnify"
                            variant="outlined" density="compact" clearable hide-details placeholder="Search parts...">
                        </v-text-field>
                        <v-list :items="filteredParts" item-value="_id" item-title="name"
                            v-model:selected="selectedItems" select-strategy="single-independent" density="comfortable"
                            color="primary">
                        </v-list>
                        <div v-if="filteredParts.length === 0 && partSearchQuery" class="text-center pa-4">
                            No parts found matching "{{ partSearchQuery }}"
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <v-row v-else>
            <v-col cols="12">
                <p>No parts</p>
            </v-col>
        </v-row>
    </v-container>
</template>

<script setup lang="ts">
import type { Vessel } from '@/stores/vessels';
import { computed, ref } from 'vue';

const props = defineProps<{
    vessel: Vessel
}>();

const selectedItems = ref<string[]>([])
const partSearchQuery = ref<string>('')

const filteredParts = computed(() => {
    if (!partSearchQuery.value) {
        return props.vessel.parts;
    }

    const query = partSearchQuery.value.toLowerCase();
    return props.vessel.parts.filter(part =>
        part.name.toLowerCase().includes(query) 
        || 
        (part.part_type && part.part_type.toLowerCase().includes(query))
        ||
        (part.virtual && "virtual".includes(query)) 
    );
});

const selectedPartId = computed(() => selectedItems.value[0] || null)

const selectedPart = computed(() => {
    if (!props.vessel._id || !selectedPartId.value) return null;
    return props.vessel.parts.find(part => part._id === selectedPartId.value) || null;
})
</script>