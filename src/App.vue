<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import AuthenticationIndicator from './components/user/AuthenticationIndicator.vue';
import { useUser } from './composables/auth/useUser';
import { useRssOAuth } from './composables/auth/rss-oauth/useRssOAuth';

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

</script>

<template>
  <v-layout>
    <v-app-bar density="compact">
      <template v-slot:prepend>
        <v-btn @click="router.push('/')">Home</v-btn>
      </template>

      <template v-slot:append>
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