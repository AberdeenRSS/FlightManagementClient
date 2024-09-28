import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import router from './router'
import './assets/style.scss'

// import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { useChartJs } from './plugins/chart'

loadFonts()
useChartJs()

const app = createApp(App)

app.use(vuetify)
app.use(createPinia())
app.use(router)

// setupCytoscape()

app.mount('#app')
