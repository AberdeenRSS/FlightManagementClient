<template>
   
    <v-row justify="center">
    <v-dialog
      v-model="dialog"
      persistent
      width="1024"
    >
      <template v-slot:activator="{ props }">
        <v-btn
          color="primary"
          v-bind="props">Permissions</v-btn>
      </template>
      <v-card>
        <v-card-title>
          <span class="text-h5">{{vessel!.name}}</span>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-alert v-if="error && error!=''" :text="error" type="error"></v-alert>
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
            :loading="!isFinished"
          >
            Add
          </v-btn>
          
         
        </v-card-actions>

        <v-expansion-panels>
            <v-expansion-panel
                title="Existing Users">
                <v-expansion-panel-text>
                    <p>User Table Goes Here</p>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>

      </v-card>

      

    </v-dialog>
  </v-row>
   

</template>

<script lang="ts" setup>

    import { ref,toRefs } from 'vue'
    import { getVessel } from '@/stores/vessels'
    import { useObservableShallow } from '@/helper/reactivity'

    import { postRssApi } from '@/composables/api/rssFlightServerApi';

    const {error, isFinished, post} = postRssApi('/vessel/give-permisssion', {}, {immediate: false})
   

    const props = defineProps({
        vesselId: {
            type: String,
            required: true
        }
    })

    const { vesselId } = toRefs(props)

    const vessel = useObservableShallow(getVessel(vesselId))

    const dialog = ref(false)
    const userEmail = ref()
    const userPermission = ref()
    
    console.log(error)


    function addInputtedUser() {
      if (!userEmail.value || !userPermission.value) {
        return
      }
      

      post({email: userEmail.value, permission: userPermission.value, vesselId: vesselId.value},'json')

      dialog.value = false
    }

</script>