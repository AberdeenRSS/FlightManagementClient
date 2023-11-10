import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import checker from 'vite-plugin-checker';
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vite-plugin
import vuetify from 'vite-plugin-vuetify'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
		vue(),
		vuetify({ autoImport: true }),
    checker({
      vueTsc: {
        tsconfigPath: './tsconfig.app.json'
      },
      // typescript: {
      //   buildMode: true,
      //   tsconfigPath: './tsconfig.app.json'
      // },
      eslint: {
        lintCommand: 'eslint "./src/**/*.{ts,tsx,vue}"'
      }
    }),
    basicSsl()
	],
  resolve: {
    alias: {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
