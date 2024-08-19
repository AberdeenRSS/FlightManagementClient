<script setup lang="ts">
import { RouterView } from 'vue-router'
import AuthenticationIndicator from './components/user/AuthenticationIndicator.vue';
import { useUser } from './composables/auth/useUser';
import { useRssOAuth } from './composables/auth/rss-oauth/useRssOAuth';
import Menubar from 'primevue/menubar';
import Button from 'primevue/button';
import router from './router';
import DynamicDialog from 'primevue/dynamicdialog';

//const router = useRouter()

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

function navigateHome() {
  router.push('/');
}

trySilentLogin()

</script>

<template>
  <div class="layout">
    <Menubar>
      <template #start>
        <Button label="Home" class="p-button-text" @click="navigateHome" />
      </template>
      
      <template #end>
        <div>
          
          <AuthenticationIndicator />
        </div>
      </template>
    </Menubar>

    <div class="content">
      <DynamicDialog />
      <RouterView />
    </div>
  </div>
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

.content {
  padding:24px
}
</style>