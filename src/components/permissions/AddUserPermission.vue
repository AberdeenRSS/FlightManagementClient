<template>
   
  <v-row justify="center">
    <v-dialog
      v-model="dialog"
      persistent
      width="1024"
    >
      <template v-slot:activator="{ props }">
        <button class="button"
          v-bind="props">Permissions</button>
      </template>
      <v-card>
        <v-card-title>
          <span class="text-h5">{{vessel!.name}}</span>
        </v-card-title>
        <v-card-text>
          <v-container>
                <p>Give User Permissions</p>
                <v-text-field v-model="userEmail"
                    label="User Email"
                    required
                ></v-text-field>
              
                <v-select
                  v-model="userPermission"
                  :items="['Owner', 'Commands', 'View', 'None']"
                  label="Permissions"
                  required
                ></v-select>
              
            
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue-darken-1"
            variant="text"
            @click="dialog = false"
          >
            Cancel
          </v-btn>
          
          <v-btn
            color="blue-darken-1"
            variant="text"
            @click="addInputtedUser"
          >
            Add
          </v-btn>
          
         
        </v-card-actions>

        <v-expansion-panels v-if="hasPermissions">
            <v-expansion-panel
                title="Existing Users">
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
    const userEmail = ref()
    const userPermission = ref()

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
      } catch (e) {
        console.log(e)
      }
    }

</script>