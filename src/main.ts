import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import router from './router'

// import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

loadFonts()

const app = createApp(App)

app.use(vuetify)
app.use(createPinia())
app.use(router)

// setupCytoscape()

app.mount('#app')
