// fetch.js
import { createFetch, type BeforeFetchContext } from '@vueuse/core'
import { shallowRef, triggerRef, type Ref } from 'vue'
import { useUser } from '../auth/useUser';
import mqtt from 'mqtt'


const baseUri = import.meta.env.VITE_RSS_FLIGHT_SERVER_URL;
const mqttUri = import.meta.env.VITE_RSS_MQTT_URL;

export function useRssApiBaseUri(){
    return baseUri
}

async function beforeFetch({ options }: BeforeFetchContext): Promise<Partial<BeforeFetchContext>> {

    const { currentUser } = useUser()        

    if(!options.headers)
        options.headers = {} as Record<string, string>

    if(currentUser.value)
        (options.headers as Record<string, string>)['Authorization'] = `Bearer ${currentUser.value.jwt_token}`

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
        beforeFetch,
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

export const deleteRssApi = createFetch({
    baseUrl: baseUri,
    options: {
        beforeFetch
    },
    fetchOptions: {
        mode: 'cors',
        method: 'delete',
    },
})

//const socketIoManager: { [namespace: string]: Ref<Socket | undefined> } = {}
const BASE_NAMESPACE = '__BASE_NAMESPACE__'


// export function useRssWebSocket(namespace?: string) {

//     if (!socketIoManager[namespace ?? BASE_NAMESPACE]) {
//         socketIoManager[namespace ?? BASE_NAMESPACE] = shallowRef(undefined)
//         buildNewWebsocketConnection(namespace)
//     }

//     return socketIoManager[namespace ?? BASE_NAMESPACE]

// }
/*
async function buildNewWebsocketConnection(namespace?: string) {
    const { currentUser } = useUser()

    // Wait until there is current (logged in account)
    const account = await until(currentUser).toBeTruthy()

    const ws = socketIoManager[namespace ?? BASE_NAMESPACE].value = io(`${baseUri}`, {
        auth: { token: account.jwt_token },
        transports: ['websocket'],
        extraHeaders: { Authorization: `${account.jwt_token}` },
        autoConnect: true
    })


    ws.on('error', err => {
        console.error(err)
    })

    triggerRef(socketIoManager[namespace ?? BASE_NAMESPACE])

    return ws
}*/

const mqttManager: { [namespace: string]: Ref<mqtt.MqttClient | undefined> } = {}


export function useRSSMqtt(namespace?: string) {

    if (!mqttManager[namespace ?? BASE_NAMESPACE]) {
        mqttManager[namespace ?? BASE_NAMESPACE] = shallowRef(undefined)
        buildNewMqttConnection(namespace)
    }

    return mqttManager[namespace ?? BASE_NAMESPACE]

}

async function buildNewMqttConnection(namespace?: string) {
    // const { currentUser } = useUser()

    // Wait until there is current (logged in account)
    // const account = await until(currentUser).toBeTruthy()

    const client = mqttManager[namespace ?? BASE_NAMESPACE].value= await mqtt.connectAsync(mqttUri)

    triggerRef(mqttManager[namespace ?? BASE_NAMESPACE])

    return client
}