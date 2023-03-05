<template>

    <v-table>
        <thead>
            <tr>

                <th class="text-left">
                    Name
                </th>
                <th class="text-left">
                    Version
                </th>
                <th class="text-left">
                    Num. Parts
                </th>
                <th class="text-left">
                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(item, key) in vesselStore.vessels" :key="key">
                <td><b>{{ item.entity!.name }}</b></td>
                <td>{{ item.entity!._version }}</td>
                <td>{{ item.entity!.parts.length }}</td>

                <td><v-btn @click="router.push(`./vessel/details/${item.entity!._id}`)">Flights</v-btn></td>
            </tr>
        </tbody>
    </v-table>

</template>

<script setup lang="ts">
import { useVesselStore } from '@/stores/vessels';
import { useRouter } from 'vue-router';

const vesselStore = useVesselStore()

const router = useRouter()

vesselStore.fetchVesselsIfNecessary()

</script>
