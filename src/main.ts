import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { loadFonts } from './plugins/webfontloader'
import { widgedSizeDirective } from './components/misc/dashboard/widgedSizeDirective'

// import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { setupCytoscape } from './plugins/cytoscape'

loadFonts()

const app = createApp(App)

app.use(vuetify)
app.use(createPinia())
app.use(router)

setupCytoscape()

app.directive('widgedSize', widgedSizeDirective)

app.mount('#app')



