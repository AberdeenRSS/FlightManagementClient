<template>
  <div>
    <button class="button" @click="openDialog">Permissions</button>

    <div class="modal" :class="{ 'is-active': dialog }">
      <div class="modal-background" @click="closeDialog"></div>
      <div class="modal-content">
        <div class="overlay-container">
          <header class="overlay-header">
            <p class="is-size-4">{{ vessel!.name }} Permissions</p>
            <button class="delete" aria-label="close" @click="closeDialog"></button>
          </header>
          <section class="overlay-body">
            <div class="container">
              <div class="field">
                <label class="label">User Email</label>
                <div class="control">
                  <input class="input" type="email" v-model="userEmail" placeholder="Enter user email">
                </div>
              </div>
              <div class="field">
                <label class="label">Permissions</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="userPermission">
                      <option value="">Select permission</option>
                      <option>Owner</option>
                      <option>Commands</option>
                      <option>View</option>
                      <option>None</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <button class="button is-primary" @click="addInputtedUser">Add</button>
              </div>
            </div>

            <div v-if="hasPermissions" class="mt-4">
              <details>
                <summary class="has-text-weight-bold mb-2">Existing Users</summary>
                <div class="table-container">
                  <table class="table is-fullwidth is-striped is-narrow">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Permission</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(permission, user) in vessel!.permissions" :key="user">
                        <td>{{ user }}</td>
                        <td>{{ permission }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, toRefs, computed } from 'vue'
import { getVessel } from '@/stores/vessels'
import { useObservableShallow } from '@/helper/reactivity'
import { useAuthHeaders } from '../../composables/api/getHeaders'
import axios from 'axios'
import { useRssApiBaseUri } from '../../composables/api/rssFlightServerApi'

const props = defineProps({
    vesselId: {
        type: String,
        required: true
    }
})

const { vesselId } = toRefs(props)

const vessel = useObservableShallow(getVessel(vesselId))

console.log(vessel)

const dialog = ref(false)
const userEmail = ref('')
const userPermission = ref('')

const authHeaders = useAuthHeaders();

const url = computed(() => {
  return `/vessel/set_permission/${vesselId.value}/${userEmail.value}/${userPermission.value.toLowerCase()}`
})

const hasPermissions = computed(() => {
  return vessel.value && vessel.value.permissions && Object.keys(vessel.value.permissions).length > 0
})

async function addInputtedUser() {
  try {
    await axios.post(`${useRssApiBaseUri()}${url.value}`, {}, { headers: authHeaders.value })
    closeDialog()
  } catch (e) {
    console.log(e)
  }
}

function openDialog() {
  dialog.value = true
}

function closeDialog() {
  dialog.value = false
  userEmail.value = ''
  userPermission.value = ''
}
</script>

<style scoped>
.modal-content {
  width: 90%;
  max-width: 1024px;
}

.overlay-container {
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.overlay-header {
  background-color: #ffffff;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #dbdbdb;
}

.overlay-body {
  padding: 1.5rem;
}

.table-container {
  max-height: 200px;
  overflow-y: auto;
}
</style>