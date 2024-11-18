<template>
  <div class="vessel-parts-selector">
    <input v-model="searchQuery" type="text" placeholder="Search parts..." class="search-input" />
    <div v-if="vesselData" class="radio-list-container">
      <div class="radio-list">
        <label 
          v-for="part in filteredParts" 
          :key="part._id"
          class="radio-label"
        >
          <input
            type="radio"
            :name="'vessel-part'"
            :value="part._id"
            :checked="props.modelValue[part._id]"
            :disabled="isPartDisabled(part._id)"
            @change="onSelectPart(part._id)"
          />
          <span class="radio-text">{{ part.name }} ({{ part.part_type }})</span>
        </label>
      </div>
    </div>
    <div v-else>Loading vessel data...</div>
  </div>
</template>

<script setup lang="ts">


interface VesselPart {
  _id: string;
  name: string;
  part_type: string;
}


import { ref, computed } from 'vue';
import { useObservableShallow } from '@/helper/reactivity';
import { getVesselMaybeHistoric } from '@/stores/vessels';

interface Props {
  vesselId: string;
  version?: number;
  modelValue: Record<string, boolean>;
  filter?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  version: undefined,
  filter: () => []
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: Record<string, boolean>): void;
}>();

const searchQuery = ref('');
const vessel$ = getVesselMaybeHistoric(props.vesselId, props.version);
const vesselData = useObservableShallow(vessel$);

const filteredParts = computed(() => {
  if (!vesselData.value) return [];
  return vesselData.value.parts.filter(part =>
    part.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    part.part_type.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const isPartDisabled = (partId: string): boolean => {
  return props.filter.length > 0 && !props.filter.includes(partId);
};

const onSelectPart = (partId: string): void => {
  if (!vesselData.value) return;
  
  const newSelection: Record<string, boolean> = {};
  vesselData.value.parts.forEach((part: VesselPart) => {
    newSelection[part._id] = part._id === partId;
  });
  
  emit('update:modelValue', newSelection);
};
</script>

<style scoped>
.vessel-parts-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 100%;
}

.radio-list-container {
  flex-grow: 1;
  overflow-y: auto;
}

.search-input {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.radio-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-label {
  display: flex;
  align-items: center;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.radio-label:hover:not(:has(input:disabled)) {
  background-color: #f5f5f5;
}

.radio-label:has(input:checked) {
  background-color: #edf7fd;
  border-color: #3498db;
}

.radio-label:has(input:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

input[type="radio"] {
  margin-right: 8px;
}


</style>