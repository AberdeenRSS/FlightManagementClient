<template>
  <div v-if="!!vessel" style="height: 100%;">
    <v-window v-model="navbar.currentTab.value" class="no-transition">
      <v-window-item value="flights">
        <FlightList :vessel-id="id"></FlightList>
      </v-window-item>
      <v-window-item value="parts">
        <VesselPartsList :vessel="vessel"></VesselPartsList>
      </v-window-item>
      <v-window-item value="settings">
        <VesselCreateAuthCode :vessel="vessel"></VesselCreateAuthCode>
        <v-divider class="my-4"></v-divider>
        <AddUserPermission :vesselId="vessel!._id"></AddUserPermission>
      </v-window-item>
    </v-window>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { fetchVesselsIfNecessary, getVessel } from '@/stores/vessels';
import { useObservableShallow } from '@/helper/reactivity';
import { useUser } from '@/composables/auth/useUser';
import AddUserPermission from '@/components/vessel/VesselUserPermissions.vue';
import FlightList from '@/components/flights/FlightList.vue';
import VesselCreateAuthCode from '@/components/vessel/VesselCreateAuthCode.vue';
import VesselPartsList from '@/components/vessel/VesselPartsList.vue';

const route = useRoute()
const id = route.params.id as string

const { currentUser } = useUser()

const navbar: any = inject('navbar')

fetchVesselsIfNecessary()

const vessel = useObservableShallow(getVessel(id))

const hasOwnerPermission = computed(() => {
  if (!vessel.value || !vessel.value.permissions || !currentUser.value) return false;
  return vessel.value.permissions[currentUser.value.uid] === 'owner';
});

onMounted(() => {
  const tabs = [
    { label: 'Flights', value: 'flights' },
    { label: 'Parts', value: 'parts' }
  ]

  if (hasOwnerPermission.value) {
    tabs.push({ label: 'Settings', value: 'settings' })
  }

  navbar.setTabs(tabs)
  navbar.setCurrentTab('flights')
  if (vessel.value) {
    navbar.setBreadcrumbs([
      {
        show: true,
        loading: false,
        title: 'Vessels',
        link: '/'
      },
      {
        show: true,
        loading: false,
        title: vessel.value.name,
        link: `/vessel/details/${vessel.value._id}`
      }
    ])
  } else {
    navbar.setBreadcrumbs([
      {
        show: true,
        loading: false,
        title: 'Vessels',
        link: '/'
      },
      {
        show: true,
        loading: true,
        title: 'Loading',
        link: ''
      }
    ])
  }
})

watch(hasOwnerPermission, (newHasOwnerPermissions) => {
  const tabs = [
    { label: 'Flights', value: 'flights' },
    { label: 'Parts', value: 'parts' }
  ]

  if (newHasOwnerPermissions) {
    tabs.push({ label: 'Settings', value: 'settings' })
  }

  navbar.setTabs(tabs)
})

watch(vessel, (newVessel) => {
  if (newVessel?.name) {
    navbar.setBreadcrumbs([
      {
        show: true,
        loading: false,
        title: 'Vessels',
        link: '/'
      },
      {
        show: true,
        loading: false,
        title: newVessel.name,
        link: `/vessel/details/${newVessel._id}`
      }
    ])
  } else {
    navbar.setBreadcrumbs([
      {
        show: true,
        loading: false,
        title: 'Vessels',
        link: '/'
      },
      {
        show: true,
        loading: true,
        title: 'Loading...',
        link: ''
      }
    ])
  }
})

onUnmounted(() => {
  navbar.clearTabs()
  navbar.setCurrentTab('')
  navbar.clearBreadcrumbs()
})

</script>

<style scoped>
.no-transition :deep(.v-window__container) {
  transition: none !important;
}

.no-transition :deep(.v-window-item) {
  transition: none !important;
}
</style>