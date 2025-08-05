<template>
  <div class="-container px-2">
    <div v-if="!!vessel" style="height: 100%;">
      <h1>
        {{ vessel.name }}
      </h1>

      <!-- Actions Panel -->
          <div v-if="currentUser && vessel?.permissions[currentUser.uid] === 'owner'">
            
          </div>

 
      <v-card>
        <v-tabs
          v-model="tab"
          bg-color="primary">
          <v-tab value="flights">Flights</v-tab>       
          <v-tab value="parts">Parts</v-tab>
          <v-tab value="settings" v-if="hasOwnerPermission">Settings</v-tab>
        </v-tabs>

        <v-card-text>
          <v-window v-model="tab">
            <v-window-item value="flights">
              <FlightList :vessel-id="id"></FlightList>
            </v-window-item>
            <v-window-item value="parts">
              <VesselPartsList :vessel="vessel"></VesselPartsList>
            </v-window-item>
            <v-window-item value="settings">
              <VesselCreateAuthCode :vessel="vessel"></VesselCreateAuthCode>
              <v-divider class="my-4"></v-divider>
              <AddUserPermission :vesselId="vessel!._id"></AddUserPermission>
            </v-window-item>
          </v-window>
        </v-card-text>
      </v-card>

    </div>
  </div>
     



     
                  
            


</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { fetchVesselsIfNecessary, getVessel } from '@/stores/vessels';
import { useObservableShallow } from '@/helper/reactivity';
import { useUser } from '@/composables/auth/useUser';
import AddUserPermission from '@/components/vessel/VesselUserPermissions.vue';
import FlightList from '@/components/flights/FlightList.vue';
import VesselCreateAuthCode from '@/components/vessel/VesselCreateAuthCode.vue';
import VesselPartsList from '@/components/vessel/VesselPartsList.vue';

const route = useRoute()
const id = route.params.id as string

const { currentUser } = useUser()



fetchVesselsIfNecessary()

const vessel = useObservableShallow(getVessel(id))
const tab = ref('flights')

const hasOwnerPermission = computed(() => {
  if (!vessel.value || !vessel.value.permissions || !currentUser.value) return false;
  return vessel.value.permissions[currentUser.value.uid] === 'owner';
});


</script>
