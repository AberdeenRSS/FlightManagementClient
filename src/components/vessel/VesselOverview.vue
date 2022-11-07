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
                <th>

                </th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(item, key) in vesselStore.vessels" :key="key">
                <td>{{ item.entity!._id }}</td>
                <td>{{ item.entity!.name }}</td>
                <td><v-btn @click="router.push(`./vessel/details/${item.entity!._id}`)">Details</v-btn></td>
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
