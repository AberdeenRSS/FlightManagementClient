<template>
  <v-card>
    <v-card-title>
      Add User Permissions
    </v-card-title>
    <v-card-text>
      <v-alert v-if="permissionsError" type="error" 
        variant="tonal" closable @click:close="permissionsError = undefined"
        class="mb-4">
        {{ permissionsError }}
      </v-alert>

      <v-alert 
        v-if="successMessage" 
        type="success" 
        variant="tonal" 
        closable 
        @click:close="successMessage = undefined"
        class="mb-4"
      >
        {{ successMessage }}
      </v-alert>

      <v-text-field 
        v-model="userEmail" 
        label="User Email" 
        type="email" 
        placeholder="Enter user email"
        class="mb-3"
      />

      <v-select 
        v-model="userPermission" 
        :items="['Owner', 'Commands', 'View', 'None']" 
        label="Permissions"
        placeholder="Select permission"
        class="mb-4"
      />

      <v-btn 
        variant="flat" 
        color="primary" 
        @click="addUser"
        :loading="isLoading"
        :disabled="!userEmail || !userPermission"
      >
        Add User
      </v-btn>

      <v-expansion-panels v-if="hasPermissions" class="mt-6">
        <v-expansion-panel 
          title="Existing users"
          @group:selected="fetchUserNames"
        >
          <v-expansion-panel-text>
            <v-table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Permission</th>
                  <!--<th></th>-->
                </tr>
              </thead>
              <tbody>
                <tr v-for="(permission, userId) in vessel?.permissions" :key="userId">
                  <td>{{ getUserDisplayName(userId) }}</td>
                  <td>{{ permission }}</td>
                  <!--<td>
                    <v-btn
                      v-if="hasPermissions && permission !== 'Owner'"
                      variant="flat"

                      @click="editUserPermission(userId)"
                    >Edit</v-btn> 
                  </td>-->
                </tr>
              </tbody>
            </v-table>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import { ref, toRefs, computed, watch, onMounted } from 'vue'
import { getVessel } from '@/stores/vessels'
import { useObservableShallow } from '@/helper/reactivity'
import { useAuthHeaders } from '../../composables/api/getHeaders'
import axios, { AxiosError } from 'axios'
import { postRssApi, useRssApiBaseUri } from '../../composables/api/rssFlightServerApi'

const props = defineProps({
  vesselId: {
    type: String,
    required: true
  }
})

const { vesselId } = toRefs(props)

const vessel = useObservableShallow(getVessel(vesselId))
const permissionsError = ref<string | undefined>()
const successMessage = ref<string | undefined>()
const userEmail = ref('')
const userPermission = ref('')
const userNames = ref<Record<string, string>>({})
const isLoading = ref(false)
const isLoadingUsers = ref(false)

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

function getUserDisplayName(userId: string): string {
  if (isLoadingUsers.value) return 'Loading...'
  return userNames.value[userId] || userId
}

async function addUser() {
  if (!userEmail.value || !userPermission.value) {
    return
  }
  
  isLoading.value = true
  permissionsError.value = undefined
  successMessage.value = undefined

  try {
    const { error } = await postRssApi(`/vessel/set_permission/${vesselId.value}/${userEmail.value}/${permissionDisplayNameMapping[userPermission.value]}`, {})
    if (error.value) {
      throw new Error(error.value)
    }
    successMessage.value = `Successfully added ${userEmail.value}`
    userEmail.value = ''
    userPermission.value = ''
    
    // Refresh user names
    setTimeout(() => fetchUserNames(), 500)
  } catch (e) {
    const error = e as AxiosError<unknown>
    const responseData = (error.response?.data as { detail?: string })
    permissionsError.value = responseData?.detail || 'Failed to add user'
  } finally {
    isLoading.value = false
  }
}

async function fetchUserNames() {
  if (!vessel.value?.permissions) {
    return
  }
  const permissionKeys = Object.keys(vessel.value.permissions)
  if (permissionKeys.length === 0) {
    userNames.value = {}
    return
  }
  isLoadingUsers.value = true
  
  try {
    const url = `${useRssApiBaseUri()}/user/get_names`
    const response = await axios.post(url, permissionKeys, {
      headers: {
        ...authHeaders.value,
        'Content-Type': 'application/json'
      }
    })

    userNames.value = response.data
  } catch (error) {
    console.error('Failed to fetch user names:', error)
  } finally {
    isLoadingUsers.value = false
  }
}

/*
function editUserPermission(userId: string) {
  // This function can be implemented to handle editing user permissions
  // For now, it will just log the userId
  console.log(`Edit permission for user: ${userId}`)
  // Set the userEmail and userPermission to the current values
  userEmail.value = userNames.value[userId] || userId
  userPermission.value = Object.keys(permissionDisplayNameMapping).find(key => permissionDisplayNameMapping[key] === vessel.value?.permissions[userId]) || ''
}
  */

onMounted(() => {
  if (hasPermissions.value) {
    fetchUserNames()
  }
})
watch(
  () => vessel.value?.permissions,
  (newPermissions) => {
    if (newPermissions && Object.keys(newPermissions).length > 0) {
      fetchUserNames()
    }
  },
  { deep: true }
)
</script>