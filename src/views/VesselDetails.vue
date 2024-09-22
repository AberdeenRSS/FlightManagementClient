<template>
    <div v-if="!!vessel" style="height: 100%; flex-direction: column;" class="d-flex flex-column">
      <div>
        <div class="ma-2 font-weight-light text-h3">
          {{ vessel.name }}
        </div>
      </div>
      <div>
        <h3>Actions</h3>
        <div class="d-flex flex-row">
          <div class="d-flex flex-column" style="max-width:400px">
            <v-alert v-if="tokenError" :text="tokenError" type="error"></v-alert>
            <div v-if="token">
              <p style="overflow-wrap: break-word;padding:1rem;">{{ token }}</p>
            </div>
            <div class="mx-auto">
              <v-btn @click="createAuthCode" :loading="tokenLoading" v-if="!token">Create Auth Code</v-btn>
              <v-btn @click="copyAuthToken" v-if="token">Copy Code</v-btn>
              <v-btn @click="clearAuthToken" v-if="token">Clear</v-btn>
            </div>
          </div>
        </div>
      </div>
      <v-card class="p-5">
        <v-tabs v-model="tab" bg-color="primary">
          <v-tab value="flights">Flights</v-tab>
          <v-tab value="components">Parts</v-tab>
        </v-tabs>
        <v-card-text class="tab-content">
          <div v-if="tab === 'flights'">
            <FlightList :vessel-id="id"></FlightList>
          </div>
          <div v-else-if="tab === 'components'">
            <VesselComponentsList v-model="selected" :vessel-id="id"></VesselComponentsList>
          </div>
        </v-card-text>
      </v-card>
    </div>
    <div v-else>
      <v-progress-circular indeterminate></v-progress-circular>
    </div>
  </template>
  
  <script setup lang="ts">
  import FlightList from '@/components/flights/FlightList.vue';
  import { useRoute } from 'vue-router';
  import { ref } from 'vue';
  import { fetchVesselsIfNecessary, getVessel } from '@/stores/vessels';
  import { subscribeRealtime } from '@/stores/flight';
  import { useObservableShallow } from '@/helper/reactivity';
  import { useUser } from '@/composables/auth/useUser';
  import axios from 'axios';
  import { useRssApiBaseUri } from '@/composables/api/rssFlightServerApi';
  import { until } from '@vueuse/core';
  import VesselComponentsList from '@/components/vessel/VesselComponentsList.vue';
  
  const route = useRoute()
  const id = route.params.id as string
  
  const { currentUser } = useUser()
  
  const token = ref<string | undefined>(undefined)
  const tokenError = ref<string | undefined>(undefined)
  const tokenLoading = ref<boolean>(false)
  
  fetchVesselsIfNecessary()
  subscribeRealtime()
  
  const vessel = useObservableShallow(getVessel(id))
  
  const selected = ref({})
  
  const tab = ref('flights')
  
  function copyAuthToken() {
    navigator.clipboard.writeText(token.value!);
    alert("Successfully copied token!")
  }
  
  function clearAuthToken() {
    token.value = undefined
  }
  
  async function createAuthCode() {
    tokenError.value = undefined
    tokenLoading.value = true
  
    const loadedVessel = await until(vessel).toBeTruthy()
    const user = await until(currentUser).toBeTruthy()
  
    const validUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)
  
    try {
      const res = await axios.post(`${useRssApiBaseUri()}/vessel/create_auth_code/${loadedVessel._id}/${validUntil.toISOString()}`, undefined, { headers: { 'Authorization': user.jwt_token } })
      token.value = res.data['_id']
    }
    catch (e) {
      tokenError.value = String(e)
    }
    finally {
      tokenLoading.value = false
    }
  }
  </script>
  
  <style scoped>
  .tab-content {
    height: 100%; /* Adjust this value as needed */
    overflow-y: auto;
  }
  </style>