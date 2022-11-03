<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import AuthenticationIndicator from '@/components/user/AuthenticationIndicator.vue';

</script>

<template>
  <header>
    <b-navbar toggleable="lg" type="dark" variant="primary">

      <b-navbar-brand href="#">Rocket Control Board</b-navbar-brand>
      <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

      <b-collapse id="nav-collapse" is-nav>
        <b-navbar-nav>

          <b-nav-form>
            <AuthenticationIndicator></AuthenticationIndicator>
          </b-nav-form>


        </b-navbar-nav>

      </b-collapse>
    </b-navbar>

    
  </header>

  <RouterView />
</template>

<style lang="scss">
@import './assets/main.scss';
</style>