import { fetchRssApi, useRssWebSocket } from '@/composables/api/rssFlightServerApi';
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch, type Ref } from 'vue';
import { waitUntil } from '@/helper/reactivity'
import { until } from '@vueuse/core';

export const useFlightStore = defineStore({
    id: 'flights',
    state: () => ({
        vesselFlights: {} as { [index: string]: FlightsState },
        realtimeSubscription: false
    }),
    actions: {
        async fetchFlightsForVesselIfNecessary(vesselId: string) {

            if (!this.vesselFlights[vesselId])
                this.vesselFlights[vesselId] = { flights: {}, loading: 'NOT_REQUESTED' }

            const existingEntry = this.vesselFlights[vesselId]

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
                    flight: v,
                    loading: 'NOT_REQUESTED'
                }
            });

            existingEntry.loading = 'LOADED'
        },
        async subscribeRealtime() {

            if (this.realtimeSubscription)
                return

            this.realtimeSubscription = true

            const ws$ = useRssWebSocket()

            watch(ws$, ws => {

                if (!ws)
                    return

                ws.on('flights.new', (data: Flight) => {

                    let vesselFlights = this.vesselFlights[data._vessel_id]

                    if (!vesselFlights)
                        vesselFlights = this.vesselFlights[data._vessel_id] = { flights: {}, loading: 'NOT_REQUESTED' }

                    vesselFlights.flights[data._id] = { flight: data, loading: 'LOADED' }

                })

                ws.on('flights.update', (data: Flight) => {

                    let vesselFlights = this.vesselFlights[data._vessel_id]

                    if (!vesselFlights)
                        vesselFlights = this.vesselFlights[data._vessel_id] = { flights: {}, loading: 'NOT_REQUESTED' }

                    vesselFlights.flights[data._id] = { flight: data, loading: 'LOADED' }

                })

                ws.on('connect', () => {
                    ws.emit('flights.subscribe')

                })

                ws.emit('flights.subscribe')


            }, { immediate: true })

        }
    }
})

export type LoadingStates =
    'NOT_REQUESTED'
    | 'REQUESTED'
    | 'LOADED'
    | 'ERROR'

function shouldRequest(l: LoadingStates) {
    return l === 'NOT_REQUESTED' || l === 'ERROR'
}

export type CommandInfo = {

    supported_on_vehicle_level: boolean

    supporting_parts: string[]

    payload_schema: any;

    response_schema: any
}

export type Flight = {
    _id: string;
    _vessel_id: string;
    name: string;
    start: string;
    end: string | undefined;
    available_commands: { [commandType: string]: CommandInfo }
}

type FlightState = {
    flight: Flight;
    loading: LoadingStates
}

type FlightsState = {
    flights: { [id: string]: FlightState };
    loading: LoadingStates
}


