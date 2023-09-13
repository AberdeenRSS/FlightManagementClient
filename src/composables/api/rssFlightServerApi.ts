// fetch.js
import { createFetch, until, type BeforeFetchContext } from '@vueuse/core'
import { Socket, io } from "socket.io-client"
import { shallowRef, triggerRef, type Ref } from 'vue'
import { useMsal, useUserData } from '../msal/useMsal'


const baseUri = import.meta.env.VITE_RSS_FLIGHT_SERVER_URL;
const serverScope = import.meta.env.VITE_RSS_FLIGHT_SERVER_SCOPE;


async function beforeFetch({ options }: BeforeFetchContext): Promise<Partial<BeforeFetchContext>> {

    return {options}

    const { activeAccount } = useUserData()
    const { msalInstance } = useMsal()

    // Wait until there is current (logged in account)
    const account = await until(activeAccount).toBeTruthy()

    // Get an authentication token to make an authenticated request to the api (should be cached most of the time)
    const token = await msalInstance.value.acquireTokenSilent({ scopes: [serverScope], account: account! })

    if(!options.headers)
        options.headers = {} as Record<string, string>

    (options.headers as Record<string, string>)['Authorization'] = `Bearer ${token.accessToken}`

    return { options }
}

/**
 * Method to make a request to the rss flight server with authentication 
 *
 * @param relativeUri The relative uri to the resource to get (Has to start with a /)
 * @returns the fetched data
 */
export const fetchRssApi = createFetch({
    baseUrl: baseUri,
    options: {
        beforeFetch
    },
    fetchOptions: {
        mode: 'cors',
    },
})

export const postRssApi = createFetch({
    baseUrl: baseUri,
    options: {
        beforeFetch
    },
    fetchOptions: {
        mode: 'cors',
        method: 'post',
    },
})

const socketIoManager: { [namespace: string]: Ref<Socket | undefined> } = {}
const BASE_NAMESPACE = '__BASE_NAMESPACE__'


export function useRssWebSocket(namespace?: string) {

    if (!socketIoManager[namespace ?? BASE_NAMESPACE]) {
        socketIoManager[namespace ?? BASE_NAMESPACE] = shallowRef(undefined)
        buildNewWebsocketConnection(namespace)
    }

    return socketIoManager[namespace ?? BASE_NAMESPACE]

}

async function buildNewWebsocketConnection(namespace?: string) {
    // const { activeAccount } = useUserData()
    // const { msalInstance } = useMsal()

    // Wait until there is current (logged in account)
    // const account = await until(activeAccount).toBeTruthy()

    // Get an authentication token to make an authenticated request to the api (should be cached most of the time)
    // const token = await msalInstance.value.acquireTokenSilent({ scopes: [serverScope], account: account! })

    const ws = socketIoManager[namespace ?? BASE_NAMESPACE].value = io(`${baseUri}`, {
        // auth: { token: token.accessToken },
        transports: ['websocket'],
        // extraHeaders: { Authorization: `${token.accessToken}` },
        autoConnect: true
    })


    ws.on('error', err => {
        console.error(err)
    })

    triggerRef(socketIoManager[namespace ?? BASE_NAMESPACE])

    return ws
}
