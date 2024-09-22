<template>
    <v-container fluid>
      <div v-if="!!vessel" style="height: 100%;" class="d-flex flex-column">
        <div class="ma-2 font-weight-light text-h3">
          {{ vessel.name }}
        </div>
        
        <!-- Actions Panel -->
        <v-card class="mb-4">
          <v-card-title>Actions</v-card-title>
          <v-card-text>
            <div class="d-flex flex-row align-center">
              <div class="flex-grow-1" style="max-width: 600px">
                <div class="d-flex align-center">
                  <v-text-field
                    v-if="token"
                    :model-value="token"
                    readonly
                    label="Auth Code"
                    hide-details
                    class="flex-grow-1 mr-2"
                    append-inner-icon="mdi-content-copy"
                    @click:append-inner="copyAuthToken"
                  >
                    <template v-slot:append>
                      <v-icon :color="copyIconColor" v-if="copySuccess">mdi-check</v-icon>
                    </template>
                  </v-text-field>
                  <v-btn @click="createAuthCode" :loading="tokenLoading" v-if="!token">
                    Create Auth Code
                  </v-btn>
                  <v-btn @click="clearAuthToken" v-if="token" color="error" class="ml-2">
                    Clear
                  </v-btn>
                </div>
                <v-alert v-if="tokenError" :text="tokenError" type="error" class="mt-2"></v-alert>
              </div>
              <div class="ml-4">
                <AddUserPermission :vesselId="vessel._id"></AddUserPermission>
              </div>
            </div>
          </v-card-text>
        </v-card>
  
        <!-- Tabs -->
        <v-card class="flex-grow-1">
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
    </v-container>
  </template>
  
  <script setup lang="ts">
  import { ref, computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { fetchVesselsIfNecessary, getVessel } from '@/stores/vessels';
  import { subscribeRealtime } from '@/stores/flight';
  import { useObservableShallow } from '@/helper/reactivity';
  import { useUser } from '@/composables/auth/useUser';
  import axios from 'axios';
  import { useRssApiBaseUri } from '@/composables/api/rssFlightServerApi';
  import { until } from '@vueuse/core';
  import FlightList from '@/components/flights/FlightList.vue';
  import VesselComponentsList from '@/components/vessel/VesselComponentsList.vue';
  import AddUserPermission from '@/components/permissions/AddUserPermission.vue';
  
  const route = useRoute()
  const id = route.params.id as string
  
  const { currentUser } = useUser()
  
  const token = ref<string | undefined>(undefined)
  const tokenError = ref<string | undefined>(undefined)
  const tokenLoading = ref<boolean>(false)
  const copySuccess = ref<boolean>(false)
  
  fetchVesselsIfNecessary()
  subscribeRealtime()
  
  const vessel = useObservableShallow(getVessel(id))
  
  const selected = ref({})
  
  const tab = ref('flights')
  
  const copyIconColor = computed(() => copySuccess.value ? 'green' : undefined)
  
  function copyAuthToken() {
    if (token.value) {
      navigator.clipboard.writeText(token.value);
      copySuccess.value = true;
      setTimeout(() => {
        copySuccess.value = false;
      }, 5000); // Reset to copy icon after 5 seconds
    }
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
    height: calc(100vh - 300px); 
    overflow-y: auto;
  }
  </style>