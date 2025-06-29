import { fetchRssApi } from '@/composables/api/rssFlightServerApi';
import { asObservable, fromImmediate } from '@/helper/reactivity';
import { until } from '@vueuse/core';
import { combineLatest, map, of, shareReplay, switchMap, type Observable } from 'rxjs';
import { ref, shallowRef, triggerRef, watch, type Ref, type ShallowRef } from 'vue';

export const state = {
    vesselFlights: {} as { [index: string]: ShallowRef<FlightsState> },
    realtimeSubscription: ref(false)
}

export function getOrInitStore(vesselId: string){
    state.vesselFlights[vesselId] = state.vesselFlights[vesselId] ?? shallowRef({ flights: {}, loading: 'NOT_REQUESTED'} )
    return state.vesselFlights[vesselId]
}

export function getFlights(vesselId$:  Observable<string> | string){
    return asObservable(vesselId$).pipe(
        switchMap(v => fromImmediate(getOrInitStore(v))),
    )
}

export function getFlight(vesselId$:  Observable<string> | string, flightId$: Observable<string> | string){
    return combineLatest([asObservable(flightId$), getFlights(vesselId$)]).pipe(
        map(([f, flights]) => flights.flights[f]?.flight),
        switchMap(flight => flight ? fromImmediate(flight) : of(undefined)),
        shareReplay()
    )
}

export async function fetchFlightsForVesselIfNecessary(vesselId: string) {

    const storeObj = getOrInitStore(vesselId)
    const existingEntry = storeObj.value

    // Return if the data was already successfully requested
    if (existingEntry && existingEntry.loading !== 'NOT_REQUESTED' && existingEntry.loading !== 'ERROR')
        return;

    existingEntry.loading = 'REQUESTED'

    const { data, error, isFinished } = await fetchRssApi(`/flight/get_all/${vesselId}`)

    await until(isFinished).toBe(true)

    if (error.value) {
        existingEntry.loading = 'ERROR'
        console.log(error)
        return
    }

    JSON.parse(data.value as string).forEach((v: Flight) => {

        // Don't overwrite vessels already loaded
        if (existingEntry.flights[v._id])
            return

        existingEntry.flights[v._id] = {
            flight: shallowRef(v),
            loading: ref('NOT_REQUESTED')
        }
    });

    existingEntry.loading = 'LOADED'

    triggerRef(storeObj)
}
// export async function subscribeRealtime() {

//     if (state.realtimeSubscription.value)
//         return

//     state.realtimeSubscription.value = true

//     const ws$ = useRssWebSocket()

//     watch(ws$, ws => {

//         if (!ws)
//             return

//         ws.on('flights.new', (data: Flight) => {

//             const vesselFlights = getOrInitStore(data._vessel_id)

//             vesselFlights.value.flights[data._id] = { flight: shallowRef(data), loading: ref('LOADED') }

//             triggerRef(vesselFlights)

//         })

//         ws.on('flights.update', (data: Flight) => {

//             const vesselFlights = getOrInitStore(data._vessel_id)

//             if(!vesselFlights.value.flights[data._id]){
//                 vesselFlights.value.flights[data._id] = { flight: shallowRef(data), loading: ref('LOADED') }
//                 return
//             }

//             const flightState = vesselFlights.value.flights[data._id]
            
//             flightState.flight.value = data

//             flightState.loading.value = 'LOADED'

//             triggerRef(flightState.flight)

//         })

//         ws.on('connect', () => {
//             ws.emit('flights.subscribe')

//         })

//         ws.emit('flights.subscribe')


//     }, { immediate: true })

// }

export type LoadingStates =
    'NOT_REQUESTED'
    | 'REQUESTED'
    | 'LOADED'
    | 'ERROR'

export type CommandInfo = {

    name: string

    payload_schema: undefined | string | [string, string][]
}

export type Flight = {
    _id: string;
    _vessel_id: string;
    _vessel_version: number;
    name: string;
    start: string;
    end: string | undefined;
    available_commands: { [partId: string]: CommandInfo[] }
    measured_parts: { [part_id: string]: ({ name: string, type: string | [string, string][] })[] }
}

type FlightState = {
    flight: ShallowRef<Flight>;
    loading: Ref<LoadingStates>
}

type FlightsState = {
    flights: { [id: string]: FlightState };
    loading: LoadingStates
}


