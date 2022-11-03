<template>


<b-table hover :items="vesselStore.getVessels"></b-table>


</template>

<script setup lang="ts">
import { useVesselStore } from '@/stores/vessels';

    const vesselStore = useVesselStore()

    vesselStore.fetchVesselsIfNecessary()

</script>