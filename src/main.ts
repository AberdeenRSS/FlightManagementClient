import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@/App.vue'
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura'
import { loadFonts } from './plugins/webfontloader'
import router from './router'

// import '@mdi/font/css/materialdesignicons.css'
import { useChartJs } from './plugins/chart'
import DiaglogService from 'primevue/dialogservice';
import { definePreset } from '@primevue/themes';

loadFonts()

useChartJs()

const app = createApp(App);

const MyPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{zinc.50}',
            100: '{zinc.100}',
            200: '{zinc.200}',
            300: '{zinc.300}',
            400: '{zinc.400}',
            500: '{zinc.500}',
            600: '{zinc.600}',
            700: '{zinc.700}',
            800: '{zinc.800}',
            900: '{zinc.900}',
            950: '{zinc.950}'
        },
        colorScheme: {
            light: {
                primary: {
                    color: '{zinc.950}',
                    inverseColor: '#ffffff',
                    hoverColor: '{zinc.900}',
                    activeColor: '{zinc.800}'
                },
                highlight: {
                    background: '{zinc.950}',
                    focusBackground: '{zinc.700}',
                    color: '#ffffff',
                    focusColor: '#ffffff'
                }
            },
            dark: {
                primary: {
                    color: '{zinc.50}',
                    inverseColor: '{zinc.950}',
                    hoverColor: '{zinc.100}',
                    activeColor: '{zinc.200}'
                },
                highlight: {
                    background: 'rgba(250, 250, 250, .16)',
                    focusBackground: 'rgba(250, 250, 250, .24)',
                    color: 'rgba(255,255,255,.87)',
                    focusColor: 'rgba(255,255,255,.87)'
                }
            }
        }
    }
});


app.use(PrimeVue, {
    theme: {
        preset: MyPreset
    },
    unstyled: false
});
app.use(DiaglogService)
app.use(createPinia())
app.use(router)

// setupCytoscape()

app.mount('#app')
