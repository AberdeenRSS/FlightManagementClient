<template>

    <v-table>
        <thead>
            <tr>
                <th class="text-left">
                    Id
                </th>
                <th class="text-left">
                    Name
                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="item in vesselStore.vessels" :key="item.name">
                <td>{{ item._id }}</td>
                <td>{{ item.name }}</td>
            </tr>
        </tbody>
    </v-table>

</template>

<script setup lang="ts">
import { useVesselStore } from '@/stores/vessels';

const vesselStore = useVesselStore()

vesselStore.fetchVesselsIfNecessary()

</script>