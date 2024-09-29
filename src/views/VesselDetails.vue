<template>
  <div class="container is-fluid content-container">
    <div v-if="!!vessel" class="is-flex is-flex-direction-column" style="height: 100%;">
      <h1 class="title is-3 mb-3">
        {{ vessel.name }}
      </h1>

      <!-- Actions Panel -->
    

        <div class="is-flex is-align-items-center is-flex-wrap-wrap">
          <div class="is-flex-grow-1" style="max-width: 600px">
            <div class="field has-addons">
              <div class="control is-expanded">
                <input v-if="token" :value="token" readonly class="input" type="text" placeholder="Auth Code">
              </div>
              <div class="control">
                <button class="button is-info" @click="copyAuthToken" v-if="token">
                  <span class="icon">
                    <i :class="['fas', copySuccess ? 'fa-check' : 'fa-copy']"></i>
                  </span>
                </button>
              </div>
              <div class="control">
                <button class="button is-danger" @click="clearAuthToken" v-if="token">
                  Clear
                </button>
              </div>
            </div>
            <button @click="createAuthCode" :class="['button is-primary mt-2', { 'is-loading': tokenLoading }]"
              v-if="!token">
              Create Auth Code
            </button>
            <p v-if="tokenError" class="has-text-danger mt-2">{{ tokenError }}</p>
          </div>


          <div class="ml-4 mt-2" v-if="currentUser && vessel?.permissions[currentUser.uid] === 'owner'">
            <AddUserPermission :vesselId="vessel!._id"></AddUserPermission>
          </div>
          <div v-else-if="!hasOwnerPermission">
            <ClaimVessel :vesselId="vessel!._id"></ClaimVessel>
          </div>
        </div>
 

      <!-- Tabs -->
      <div class="is-flex-grow-1 d-flex flex-column">
        <div class="tabs">
          <ul>
            <li :class="{ 'is-active': tab === 'flights' }">
              <a @click="tab = 'flights'">Flights</a>
            </li>
            <li :class="{ 'is-active': tab === 'components' }">
              <a @click="tab = 'components'">Parts</a>
            </li>
          </ul>
        </div>
        <div class="tab-content">
          <div v-if="tab === 'flights'">
            <FlightList :vessel-id="id"></FlightList>
          </div>
          <div v-else-if="tab === 'components'" class="parts-list-container">
            <div class="columns is-gapless" style="height: 100%;">
              <div class="column is-3" style="height: 100%; overflow-y: auto; border-right: 1px solid #dbdbdb;">
                <aside class="menu">
                  <p class="menu-label px-2 py-1">
                    Parts List
                  </p>
                  <ul class="menu-list">
                    <li v-for="part in vessel.parts" :key="part._id">
                      <a @click="selectPart(part._id)" :class="{ 'is-active': selectedPartId === part._id }">
                        {{ part.name }}
                      </a>
                    </li>
                  </ul>
                </aside>
              </div>
              <div class="column" style="height: 100%; overflow-y: auto;">
                <div v-if="selectedPart" class="part-details p-3">
                  <h3 class="title is-4">{{ selectedPart.name }}</h3>
                  <div class="content">
                    <p><strong>Type:</strong> {{ selectedPart!.part_type || "No type available" }}</p>
                    <p><strong>Virtual:</strong> {{ selectedPart!.virtual }}</p>
                    <!-- Add more part details as needed -->
                  </div>
                </div>
                <div v-else class="has-text-centered p-3">
                  <p class="is-italic">Select a part to view details</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="has-text-centered mt-6">
      <button class="button is-loading">Loading</button>
    </div>
  </div>
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
import AddUserPermission from '@/components/permissions/AddUserPermission.vue';
import ClaimVessel from '@/components/permissions/ClaimVessel.vue';

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
console.log(vessel)
const tab = ref('flights')

const selectedPartId = ref<string | null>(null)
const selectedPart = computed(() => {
  if (!vessel.value || !selectedPartId.value) return null;
  return vessel.value.parts.find(part => part._id === selectedPartId.value) || null;
})

function selectPart(partId: string) {
  selectedPartId.value = partId;
}

const hasOwnerPermission = computed(() => {
  if (!vessel.value || !vessel.value.permissions) return false;
  return Object.values(vessel.value.permissions).includes('owner');
});

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
.content-container {
  padding-top: 2rem;
}

.tab-content {
  height: calc(100vh - 250px);
  overflow-y: auto;
}

.parts-list-container {
  height: 100%;
}

.part-details {
  background-color: #f5f5f5;
  border-radius: 4px;
}

.panel {
  box-shadow: none;
  border: 1px solid #dbdbdb;
}

.panel-heading {
  background-color: #f5f5f5;
  border-bottom: 1px solid #dbdbdb;
}

.panel-block {
  border-bottom: none;
}

.tabs ul {
  border-bottom-color: #dbdbdb;
}
</style>