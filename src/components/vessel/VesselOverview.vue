<template>
    <div class="vessel-list">

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
                <tr v-for="(item, key) of vessels" :key="key">
                    <td><b>{{ item.entity?.name }}</b></td>
                    <td>{{ item.entity?._version }}</td>
                    <td>{{ item.entity?.parts.length }}</td>

                    <td><v-btn @click="router.push(`./vessel/details/${item.entity?._id}`)">Flights</v-btn></td>
                </tr>
            </tbody>
        </v-table>
    </div>
</template>

<script setup lang="ts">
import { useObservableShallow } from '@/helper/reactivity';
import { fetchVesselsIfNecessary, getVessels } from '@/stores/vessels';

import { useRouter } from 'vue-router';


const router = useRouter()

const vessels = useObservableShallow(getVessels(), { initialValue: undefined })

fetchVesselsIfNecessary()

</script>

<style lang="scss">
.vessel-list {
    max-height: 80vh;
    overflow-y: scroll;
}
</style>
