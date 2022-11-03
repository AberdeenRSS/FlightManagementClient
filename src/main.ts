import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { BootstrapVue3 } from 'bootstrap-vue-3'

import App from './App.vue'
import router from './router'

const app = createApp(App).use(BootstrapVue3)

app.use(createPinia())
app.use(router)

app.mount('#app')
