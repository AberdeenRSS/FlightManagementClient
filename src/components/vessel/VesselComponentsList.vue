<template>
    <div style="padding:2rem">
      <h2>Vessel Components ({{ vesselParts.length }})</h2>

    <ul style="list-style-position: inside;">
      <li v-for="part in vesselParts" :key="part.id">
        {{ part.name }}
      </li>
    </ul>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, watch } from 'vue';
  import { useObservableShallow } from '@/helper/reactivity';
  import { getVesselMaybeHistoric } from '@/stores/vessels';
  import { map } from 'rxjs';
  
  const props = defineProps({
    vesselId: {
      type: String,
      required: true
    },
    version: {
      type: Number,
      required: false,
      default: undefined
    }
  });
  
  const vesselParts = ref<Array<{ id: string; name: string; type: string }>>([]);
  
  const vessel$ = getVesselMaybeHistoric(props.vesselId, props.version);
  
  const vesselPartsData$ = vessel$.pipe(
    map(vessel => vessel?.parts.map(p => ({ id: p._id, name: p.name, type: p.part_type })))
  );
  
  watch(useObservableShallow(vesselPartsData$), parts => {
    if (parts) {
      vesselParts.value = parts;
    }
  }, { immediate: true });
  </script>