<template>
  <v-card>
    <v-card-title class="text-h6">
      Add User Permissions
    </v-card-title>

    <v-card-text>
      <v-alert v-if="permissionsError" type="error" variant="tonal" closable @click:close="permissionsError = undefined"
        class="mb-4">
        {{ permissionsError }}
      </v-alert>

      <v-text-field v-model="userEmail" label="User Email" type="email" placeholder="Enter user email"></v-text-field>

      <v-select v-model="userPermission" :items="['Owner', 'Commands', 'View', 'None']" label="Permissions"
        placeholder="Select permission"></v-select>

      <v-btn variant="flat" color="primary" @click="addInputtedUser">Add</v-btn>

      <v-expansion-panels @update:model-value="onToggleExistingUsers" v-if="hasPermissions">
        <v-expansion-panel title="Existing users">
          <v-expansion-panel-text>
            <table class="table is-fullwidth is-striped is-narrow">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Permission</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(permission, userId) in vessel!.permissions" :key="userId">
                  <td>{{ userNames && userNames[userId] || 'Loading...' }}</td>
                  <td>{{ permission }}</td>
                </tr>
              </tbody>
            </table>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import { ref, toRefs, computed } from 'vue'
import { getVessel } from '@/stores/vessels'
import { useObservableShallow } from '@/helper/reactivity'
import { useAuthHeaders } from '../../composables/api/getHeaders'
import axios, { AxiosError } from 'axios'
import { useRssApiBaseUri } from '../../composables/api/rssFlightServerApi'

const props = defineProps({
  vesselId: {
    type: String,
    required: true
  }
})

const { vesselId } = toRefs(props)

const vessel = useObservableShallow(getVessel(vesselId))
const permissionsError = ref<string | undefined>()
const userEmail = ref('')
const userPermission = ref('')
const userNames = ref()

const authHeaders = useAuthHeaders();

const hasPermissions = computed(() => {
  return vessel.value && vessel.value.permissions && Object.keys(vessel.value.permissions).length > 0
})

type PermissionDisplayNameMapping = {
  [key: string]: string
}

const permissionDisplayNameMapping: PermissionDisplayNameMapping = {
  'Owner': 'owner',
  'Commands': 'write',
  'View': 'view',
  'None': 'none'
}

const url = computed(() => {
  return `/vessel/set_permission/${vesselId.value}/${userEmail.value}/${permissionDisplayNameMapping[userPermission.value]}`
})

async function addInputtedUser() {
  try {
    await axios.post(`${useRssApiBaseUri()}${url.value}`, {}, { headers: authHeaders.value })
  } catch (e) {
    const error = e as AxiosError<unknown>
    const responseData = (error.response?.data as { detail?: string })
    permissionsError.value = responseData?.detail;
  }
}

async function fetchUserNames() {
  if (vessel.value && vessel.value.permissions) {
    const permissionKeys = Object.keys(vessel.value.permissions);
    try {
      const url = `${useRssApiBaseUri()}/user/get_names`;
      const response = await axios.post(url,
        permissionKeys,
        {
          headers: {
            ...authHeaders.value,
            'Content-Type': 'application/json'
          }
        }
      );

      userNames.value = response.data;
    } catch (error) {
      console.error('Failed to fetch user names:', error);
    }
  } else {
    console.error('Vessel permissions data is not available');
  }
}


function onToggleExistingUsers(event: Event) {
  if ((event.target as HTMLDetailsElement).open) {
    fetchUserNames()
  }
}
</script>
