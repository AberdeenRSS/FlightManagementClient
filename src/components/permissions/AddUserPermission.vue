<template>
      <template v-slot:activator="{ props }">
        <v-btn
          color=""
          v-bind="props">Permissions</v-btn>
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

        <v-expansion-panels>
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

    import { ref,toRefs,computed } from 'vue'
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

    // async function getPermittedUserNames() {
    //     try {
    //       const res = await axios.post(`${useRssApiBaseUri()}/user/get_names`, permittedUserIds.value, { headers: authHeaders.value })
    //       console.log(res)
    //     } catch (e) {
    //       console.log(e)
    //     }
    // }

    

    const authHeaders = useAuthHeaders();
    
    const url = computed(() => {
      return `/vessel/set_permission/${vesselId.value}/${userEmail.value}/${userPermission.value.toLowerCase()}`
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

