<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import AuthenticationIndicator from './components/user/AuthenticationIndicator.vue';
import { useUser } from './composables/auth/useUser';
import { useRssOAuth } from './composables/auth/rss-oauth/useRssOAuth';
import { provide, ref } from 'vue';

const router = useRouter()

// /* eslint-disable */ 
// // @ts-ignore
// // It doesnt like me importing this because it has the any type
// import { PresetDashboard } from './assets/presets/PresetDashboard.js'


// // Add Preset Dashboard
// localStorage.setItem('DASHBOARD_RocketryPreset',JSON.stringify(PresetDashboard))

// // Get existing indices
// const existingIndices = localStorage.getItem('DASHBOARD_INDICES') || '[]'

// // Get a boolean for if the existingIndices already has a default index
// // @ts-ignore
// const hasDefault = JSON.parse(existingIndices).some((index) => index.isDefault)

// // Preset Index
// const PresetIndex = {
//   id:"RocketryPreset",
//   name:"RocketryPreset",
//   saved:true,
//   isDefault:!hasDefault,
// }

// // Add the Preset Index
// if (!existingIndices.includes(PresetIndex.id)) {
//   localStorage.setItem('DASHBOARD_INDICES',JSON.stringify([...JSON.parse(existingIndices),PresetIndex]))
// }

/* eslint-enable */
const { trySilentLogin } = useUser()
const _ = useRssOAuth()

trySilentLogin()

interface NavbarBreadcrumbItem {
  show: boolean
  loading: boolean
  title: string
  link?: string
}

const navbarTabs = ref<Array<{ label: string, value: string }>>([])
const currentNavbarTab = ref<string>('')

const navbarBreadcrumbs = ref<Array<NavbarBreadcrumbItem>>([{
  show: true,
  loading: false,
  title: 'Vessels',
  link: ''
}])

provide('navbar', {
  tabs: navbarTabs,
  breadcrumbs: navbarBreadcrumbs,
  currentTab: currentNavbarTab,
  setTabs: (tabs: Array<{ label: string, value: string }>) => {
    navbarTabs.value = tabs
  },
  setCurrentTab: (tabValue: string) => {
    currentNavbarTab.value = tabValue
  },
  clearTabs: () => {
    navbarTabs.value = []
    currentNavbarTab.value = ''
  },
  setBreadcrumbs: (breadcrumbs: Array<NavbarBreadcrumbItem>) => {
    navbarBreadcrumbs.value = breadcrumbs
  },
  clearBreadcrumbs: () => {
    navbarBreadcrumbs.value = [{
      show: true,
      loading: false,
      title: 'Vessels',
      link: ''
    }]
  },
})

</script>

<template>
  <v-layout>
    <v-app-bar density="compact">
      <template v-slot:prepend>
        <v-breadcrumbs v-if="navbarBreadcrumbs.length > 0" :items="navbarBreadcrumbs" density="compact" class="pa-0">
          <template v-slot:title="{ item }">
            <v-skeleton-loader v-if="item.loading" type="button"></v-skeleton-loader>
            <span v-else-if="item.link && item.link !== ''" @click="router.push(item.link)" class="breadcrumb-link">
              {{ item.title }}
            </span>
            <span v-else>{{ item.title }}</span>
          </template>

          <template v-slot:divider>
            <v-icon size="small">mdi-chevron-right</v-icon>
          </template>
        </v-breadcrumbs>


      </template>

      <template v-slot:append>
        <v-tabs v-if="navbarTabs.length > 0" v-model="currentNavbarTab" bg-color="transparent">
          <v-tab v-for="tab in navbarTabs" :key="tab.value" :value="tab.value">
            {{ tab.label }}</v-tab>
        </v-tabs>
        <v-divider class="mx-3" vertical></v-divider>
        <AuthenticationIndicator></AuthenticationIndicator>
      </template>
    </v-app-bar>

    <v-main class="fill-height">
      <RouterView />
    </v-main>
  </v-layout>
</template>

<style lang="scss">
@import './assets/main.scss';
@import 'node_modules/billboard.js/src/scss/billboard.scss';
@import 'node_modules/leaflet/dist/leaflet.css';

.v-layout {
  height: 100%;
}

html {
  width: 100vw;
  //overflow-y: hidden !important;
}
</style>