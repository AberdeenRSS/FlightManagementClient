<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import AuthenticationIndicator from '@/components/user/AuthenticationIndicator.vue';

const router = useRouter()

</script>

<template>
  <v-layout>
    <v-app-bar>
      <template v-slot:prepend>
        <v-app-bar-nav-icon></v-app-bar-nav-icon>
      </template>

      <v-app-bar-title  @click="router.push('/')">Rocket Control Board</v-app-bar-title>

      <template v-slot:append>
        <AuthenticationIndicator></AuthenticationIndicator>
      </template>
    </v-app-bar>

    <v-main>

      <RouterView />
    </v-main>
  </v-layout>




</template>

<style lang="scss">
@import './assets/main.scss';
@import 'node_modules/billboard.js/src/scss/billboard.scss';

</style>