// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Vuetify
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { createVuetify } from 'vuetify'

export default createVuetify({
  defaults: {
    global:{
      ripple: false,
      noClickAnimation: true,
      transition: false
    }
  }
})
