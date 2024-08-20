<template>
    <div>
      <Button severity="secondary" outlined icon="pi pi-user-edit" @click="openDialog" />
  
      <Dialog v-model:visible="visible" :style="{ width: '450px' }" header="Edit User Permissions" :modal="true">
        <div class="p-fluid">
          <div class="p-field">
            <label for="userEmail">User Email</label>
            <InputText id="userEmail" v-model="userEmail" required />
          </div>
          <div class="p-field mt-3">
            <label for="userPermission">Permission</label>
            <Dropdown id="userPermission" v-model="userPermission" :options="permissionOptions" optionLabel="label" optionValue="value" placeholder="Select Permission" />
          </div>
        </div>
        <template #footer>
          <Button label="Cancel" icon="pi pi-times" @click="closeDialog" class="p-button-text" />
          <Button label="Save" icon="pi pi-check" @click="savePermissions" autofocus />
        </template>
      </Dialog>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, computed } from 'vue';
  import Dialog from 'primevue/dialog';
  import Button from 'primevue/button';
  import InputText from 'primevue/inputtext';
  import Dropdown from 'primevue/dropdown';
  import { useAuthHeaders } from '../../composables/api/getHeaders';
  import axios from 'axios';
  import { useRssApiBaseUri } from '../../composables/api/rssFlightServerApi';
  
  const props = defineProps({
    vesselId: {
      type: String,
      required: true
    }
  });
  
  const visible = ref(false);
  const userEmail = ref('');
  const userPermission = ref('');
  
  const permissionOptions = [
    { label: 'Owner', value: 'owner' },
    { label: 'Commands', value: 'commands' },
    { label: 'View', value: 'view' },
    { label: 'None', value: 'none' }
  ];
  
  const authHeaders = useAuthHeaders();
  
  const url = computed(() => {
    return `/vessel/set_permission/${props.vesselId}/${userEmail.value}/${userPermission.value}`;
  });
  
  function openDialog() {
    visible.value = true;
  }
  
  function closeDialog() {
    visible.value = false;
    userEmail.value = '';
    userPermission.value = '';
  }
  
  async function savePermissions() {
    if (userEmail.value && userPermission.value) {
      try {
        await axios.post(`${useRssApiBaseUri()}${url.value}`, {}, { headers: authHeaders.value });
        closeDialog();
        // You might want to emit an event here to refresh the vessel data
      } catch (e) {
        console.error("Error setting permissions:", e);
        // Handle error (show message to user)
      }
    } else {
      // Show validation error to user
    }
  }
  </script>