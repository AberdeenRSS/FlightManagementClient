// fetch.js
import { waitUntil } from '@/helper/reactivity'
import { useMsal, useUserData } from '../msal/useMsal'
import axios from 'axios'
import process from 'process'
import { createFetch, until, useFetch } from '@vueuse/core'
import { ref, shallowRef, type Ref } from 'vue'
import { io, Manager, Socket } from "socket.io-client";


const baseUri = import.meta.env.VITE_RSS_FLIGHT_SERVER_URL;
const serverScope = import.meta.env.VITE_RSS_FLIGHT_SERVER_SCOPE;

/**
 * Method to make a request to the rss flight server with authentication 
 *
 * @param relativeUri The relative uri to the resource to get (Has to start with a /)
 * @returns the fetched data
 */
export const fetchRssApi = createFetch({
  baseUrl: baseUri,
  options: {
    async beforeFetch({ options }: {options: any}) {

      const { activeAccount } = useUserData()
      const { msalInstance } = useMsal()

      // Wait until there is current (logged in account)
      const account = await until(activeAccount).toBeTruthy()

      // Get an authentication token to make an authenticated request to the api (should be cached most of the time)
      const token = await msalInstance.value.acquireTokenSilent({scopes: [serverScope], account: account!})

      options.headers.Authorization = `Bearer ${token.accessToken}`

      return { options }
    },
  },
  fetchOptions: {
    mode: 'cors',
  },
})

const socketIoManager: {[namespace: string]: Ref<Socket | undefined>} = {}
const BASE_NAMESPACE = '__BASE_NAMESPACE__'


export function useRssWebSocket(namespace?: string){

  if(!socketIoManager[namespace ?? BASE_NAMESPACE]?.value){
    socketIoManager[namespace ?? BASE_NAMESPACE] = shallowRef(undefined)
    buildNewWebsocketConnection(namespace)
  }

  return socketIoManager[namespace ?? BASE_NAMESPACE]

}

async function buildNewWebsocketConnection(namespace?: string){
  const { activeAccount } = useUserData()
  const { msalInstance } = useMsal()

  // Wait until there is current (logged in account)
  const account = await until(activeAccount).toBeTruthy()

  // Get an authentication token to make an authenticated request to the api (should be cached most of the time)
  const token = await msalInstance.value.acquireTokenSilent({scopes: [serverScope], account: account!})

  socketIoManager[namespace ?? BASE_NAMESPACE].value = io(`${baseUri}`, { 
    auth: { token: token.accessToken },
    transports: ['websocket'],
    extraHeaders: {Authorization: `${token.accessToken}`},
    autoConnect: true
  })

  socketIoManager[namespace ?? BASE_NAMESPACE].value?.on('connect', () => console.log('connect'))
}
