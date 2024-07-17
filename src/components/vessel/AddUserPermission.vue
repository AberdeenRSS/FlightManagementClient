<template>

  <v-row justify="center">
    <v-dialog v-model="dialog" persistent width="1024">
      <template v-slot:activator="{ props }">
        <v-btn color="primary" v-bind="props">Permissions</v-btn>
      </template>
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ vessel!.name }}</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <p>Give User Permissions</p>
            <v-text-field v-model="userEmail" label="User Email" required></v-text-field>

            <v-select v-model="userPermission" :items="['Owner', 'Commands', 'Read', 'View', 'None']" label="Permissions"
              required></v-select>


          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue-darken-1" variant="text" @click="dialog = false">
            Cancel
          </v-btn>

          <v-btn color="blue-darken-1" variant="text" @click="addInputtedUser">
            Add
          </v-btn>


        </v-card-actions>

        <v-expansion-panels>
          <v-expansion-panel title="Existing Users">
            <v-expansion-panel-text>
              <v-card v-for="(item, key) of Object.keys(vessel!.permissions)" :key="key">
                <v-card-title>{{ item }}</v-card-title>
                <v-card-text>{{ vessel!.permissions[item] }}</v-card-text>
              </v-card>

            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

      </v-card>



    </v-dialog>
  </v-row>


</template>

<script lang="ts" setup>

import { ref, toRefs, computed, onMounted } from 'vue'
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

// Key is display name, value is permission name in backend


const { vesselId } = toRefs(props)

const vessel = useObservableShallow(getVessel(vesselId))

console.log(vessel)

const dialog = ref(false)
const userEmail = ref()
const userPermission = ref()
const authHeaders = useAuthHeaders();

async function fetchUserNames() {
  if (vessel.value && vessel.value.permissions) {
    const permissionKeys = Object.keys(vessel.value.permissions);

    try {
      // Sending the UUIDs in the request body as a JSON array
      const url = `${useRssApiBaseUri()}/user/get_names`;
      const response = await axios.post(url, 
        permissionKeys  // The list of UUIDs expected by the API
      , {
        headers: {
          ...authHeaders.value,
          'Content-Type': 'application/json'
        }
      });
      console.log('API response:', response.data);
      // Handle the response data as needed
    } catch (error) {
      console.error('Failed to fetch user names:', error);
    }
  } else {
    console.error('Vessel permissions data is not available');
  }
}

onMounted(() => {
  fetchUserNames(); // Fetch user names as soon as the component mounts
});




type PermissionDisplayNameMapping = {
  [key: string]: string
}

const permissionDisplayNameMapping: PermissionDisplayNameMapping = {
  'Owner': 'owner',
  'Commands': 'write',
  'Read': 'read',
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
    console.log(e)
  }
}
// Get all users with permissions and display

// Remove user button

// Update user button

//            <v-alert v-if="error && error!=''" :text="error" type="error"></v-alert>
</script>
