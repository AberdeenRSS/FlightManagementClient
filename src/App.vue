<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import AuthenticationIndicator from '@/components/user/AuthenticationIndicator.vue';

</script>

<template>
  <v-layout>
    <v-app-bar>
      <template v-slot:prepend>
        <v-app-bar-nav-icon></v-app-bar-nav-icon>
      </template>

      <v-app-bar-title>Rocket Control Board</v-app-bar-title>

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
</style>