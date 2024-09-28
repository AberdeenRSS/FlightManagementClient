<template>
  <div class="container is-fluid content-container">
    <div class="mb-5">
      <h2 class="title is-4 mb-3">Add Vessel</h2>
      <div class="field has-addons">
        <div class="control is-expanded">
          <input 
            class="input"
            type="text"
            v-model="newVesselName"
            placeholder="New Vessel Name"
          >
        </div>
        <div class="control">
          <button 
            @click="addVessel"
            class="button is-primary"
          >
            Submit
          </button>
        </div>
      </div>
    </div>

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
              <td>
                <button 
                  @click="router.push(`./vessel/details/${item.entity?._id}`)"
                  class="button is-small is-light"
                >
                  Details
                </button>
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
  import { computed, ref } from 'vue';
  import { useAuthHeaders } from '../../composables/api/getHeaders'
  import axios from 'axios';
  import { useRssApiBaseUri } from '../../composables/api/rssFlightServerApi'
  
  const newVesselName = ref('')
  const authHeaders = useAuthHeaders();
  const url = computed(() => `/vessel/create_vessel/${newVesselName.value}`)
  const router = useRouter()
  const vessels = useObservableShallow(getVessels(), { initialValue: undefined })
  
  fetchVesselsIfNecessary()
  
  async function addVessel() {
    if (newVesselName.value.length === 0) {
      alert("No name given")
      return
    }
    try {
      await axios.post(`${useRssApiBaseUri()}${url.value}`, {}, { headers: authHeaders.value })
      newVesselName.value = '' // Clear the input after successful addition
    } catch (e) {
      alert("Error creating vessel: " + e)
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