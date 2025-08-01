<template>
  <div class="container is-fluid content-container">
    <v-row class="mb-5">
      <v-col>
        <h2 class="title is-4 mb-3">Vessels</h2>
      </v-col>
      <v-col>
        <VesselCreate @vessel-created="fetchVesselsIfNecessary()"></VesselCreate>

      </v-col>
    </v-row>
    <div>
      <div class="table-container" style="max-height: calc(80vh - 120px); overflow-y: auto;">
        <table class="table is-fullwidth is-hoverable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
              <th>Num. Parts</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, key) of vessels" :key="key">
              <td>
                <a 
                  @click="router.push(`./vessel/details/${item.entity?._id}`)"
                  class="has-text-link"
                >
                  {{ item.entity?.name }}
                </a>
              </td>
              <td>{{ item.entity?._version }}</td>
              <td>{{ item.entity?.parts.length }}</td>
              <td class="buttons">
                <button 
                  @click="router.push(`./vessel/details/${item.entity?._id}`)"
                  class="button is-small is-light"
                >
                  Details
                </button>
                <button v-if="
                  item.entity?.permissions?.[currentUser!.uid] === 'owner' ||
                  item.entity?.no_auth_permission === 'owner'
                  "
                  @click="deleteVessel(item.entity?._id)"
                  class="button is-small is-danger is-light"
                >Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-container {
  padding-top: 3rem; /* Adjust this value based on your navbar height */
}
</style>
  
  <script setup lang="ts">
  import { useObservableShallow } from '@/helper/reactivity';
  import { fetchVesselsIfNecessary, getVessels } from '@/stores/vessels';
  import { useRouter } from 'vue-router';
  import { useAuthHeaders } from '../../composables/api/getHeaders'
  import axios from 'axios';
  import { useRssApiBaseUri } from '../../composables/api/rssFlightServerApi'

  import { useUser } from '@/composables/auth/useUser';
  import VesselCreate from '../vessels/VesselCreate.vue';

  
  const authHeaders = useAuthHeaders();

  const url = computed(() => `/vessel/create_vessel/${newVesselName.value}`)

  const { currentUser } = useUser();


  const router = useRouter()
  const vessels = useObservableShallow(getVessels(), { initialValue: undefined })
  
  fetchVesselsIfNecessary()
  
  async function deleteVessel(vessel_id: string){
    if (!window.confirm('Are you sure you want to delete this vessel?')) {
      return;
    }
    try {
      const result = await axios.delete(`${useRssApiBaseUri()}/v1/vessels/${vessel_id}`, { headers: authHeaders.value })
      if (result.status === 200) {
        alert("Vessel deleted successfully")
      } else {
        alert("Failed to delete vessel: " + result.statusText)
      }
    } catch (e) {
      alert("Error deleting vessel: " + e)
    }
  }
  </script>
  
  <style lang="scss" scoped>
  .vessel-list-card {
    .vessel-list {
      max-height: calc(80vh - 120px); // Adjusted for card padding and title
      overflow-y: auto;
    }
  }
  </style>