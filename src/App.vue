<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import AuthenticationIndicator from './components/user/AuthenticationIndicator.vue';
import { useUser } from './composables/auth/useUser';
import { useRssOAuth } from './composables/auth/rss-oauth/useRssOAuth';

const router = useRouter()

const { trySilentLogin } = useUser()
const _ = useRssOAuth()

trySilentLogin()

</script>

<template>
  <v-layout>
    <v-app-bar density="compact">
      <template v-slot:prepend>
        <v-btn @click="router.push('/')">Home</v-btn>
        <v-btn @click="router.push('/about')">About</v-btn>
      </template>




      <template v-slot:append>
        <AuthenticationIndicator></AuthenticationIndicator>
      </template>
    </v-app-bar>

    <v-main>
      <div style="height: 100%;">

        <RouterView />
      </div>
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
  overflow-y: hidden !important;
}
</style>