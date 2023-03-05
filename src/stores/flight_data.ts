import { fetchRssApi, useRssWebSocket } from '@/composables/api/rssFlightServerApi';
import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowRef, watch, type Ref } from 'vue';
import { waitUntil } from '@/helper/reactivity'
import { until, type UseFetchReturn } from '@vueuse/core';
import type { LoadingStates } from '@/helper/loadingStates';
import { allocateTimeTreeAtLevel, DECISECOND, ETERNITY, getMissingRangesRecursive, insertValue, type AggregationLevels, type TimeTreeData, type TimeTreeNode } from '@/helper/timeTree';

function getMeasurementRequestUrl(flightId: string, vesselPart: string, start: Date, end: Date, resolution: Exclude<AggregationLevels | 'smallest', 'eternity'>) {
    if (resolution == 'smallest')
        return `/flight_data/get_range/${flightId}/${vesselPart}/${start.toISOString()}/${end.toISOString()}`
    else
        return `/flight_data/get_aggregated_range/${flightId}/${vesselPart}/${resolution}/${start.toISOString()}/${end.toISOString()}`
}

const store = shallowRef({
    version: 0,
    flight_data: {} as { [index: string]: FlightDataState },
    realtimeSubscription: false
})

function getOrInitStore(flightId: string, vesselPart: string) {
    const index = `${flightId}*${vesselPart}`

    let thisFlightData = store.value.flight_data[index]

    if (!thisFlightData) {
        thisFlightData = store.value.flight_data[index] = {
            measurements: { start: new Date(), members: {}, loadingState: 'NOT_REQUESTED', aggregationLevel: ETERNITY, requested: {} },
            _flight_id: flightId,
            _vessel_part: vesselPart,
            loading: 'REQUESTED',
        }
    }

    return thisFlightData
}

async function fetchFlightDataInTimeFrame(flightId: string, vesselPart: string, start: Date, end: Date, resolution: Exclude<AggregationLevels | 'smallest', 'eternity'>) {

    if (!store.value.flight_data)
        store.value.flight_data = {}

    const thisFlightData = getOrInitStore(flightId, vesselPart)

    const rangesToLoad = getMissingRangesRecursive(thisFlightData.measurements, start, end, resolution == 'smallest' ? 'decisecond' : resolution, true)

    if (rangesToLoad.length < 1)
        return

    // Make api request for all the missing ranges
    const requests = rangesToLoad.map(c => fetchRssApi(getMeasurementRequestUrl(flightId, vesselPart, c.start, c.end, resolution)))

    // wait for all of the request to be completed
    await Promise.all(requests.map(r => until(r.isFinished).toBe(true)))

    const errored = requests.filter((r, i) => r.error.value)

    errored.forEach(e => {
        console.error(`Failed flight data request failed with code ${e.statusCode} and message ${e.error}`)
        return
    })

    const newData: FlightDataChunkAggregated[] = requests.map(r => (JSON.parse(r.data.value as string) as FlightDataChunkAggregated[])).flat()

    integrateData(newData, thisFlightData, resolution);

    store.value.version++

}

export function useFlightDataStore() {


    return { store, fetchFlightDataInTimeFrame, subscribeRealtime }
}

async function subscribeRealtime(flightId: string) {

    if (store.value.realtimeSubscription)
        return

    store.value.realtimeSubscription = true

    const ws$ = useRssWebSocket()

    watch(ws$, ws => {

        if (!ws)
            return

        ws.on('flight_data.new', (data: wsFlightDataMsg) => {

            const flightData = getOrInitStore(data.flight_id, data.vessel_part)

            data.measurements.forEach(d => {

                const asTimeData: FlightDataChunk & TimeTreeData = {
                    ...d,
                    getDateTime() { return typeof this._datetime === 'string' ? new Date(this._datetime) : this._datetime }
                }

                insertValue(flightData.measurements, asTimeData)
            })

            store.value.version++

        })


        ws.on('connect', () => {
            ws.emit('flight_data.subscribe', flightId)
        })

        ws.emit('flight_data.subscribe', flightId)


    }, { immediate: true })

}

function integrateData(newData: (FlightDataChunkAggregated[] | FlightDataChunk[]), store: FlightDataState, resolution: Exclude<AggregationLevels | 'smallest', 'eternity'>) {

    newData.forEach(d => {

        if (resolution == 'smallest') {
            const asTimeData: FlightDataChunk & TimeTreeData = {
                ...d as FlightDataChunk,
                getDateTime() { return typeof this._datetime === 'string' ? new Date(this._datetime) : this._datetime }
            }
            insertValue(store.measurements, asTimeData)
        }
        else {
            const asTimeData: FlightDataChunkAggregated & TimeTreeData = {
                ...d as FlightDataChunkAggregated,
                getDateTime() { return typeof this.start_date === 'string' ? new Date(this.start_date) : this.start_date }
            }
            insertValue(store.measurements, asTimeData, resolution)
        }
    })

}

type wsFlightDataMsg = {
    flight_id: string,
    vessel_part: string,
    measurements: FlightDataChunk[]
}



export type MeasurementTypes = string | number | boolean

export type AggregatedMeasurements = { min: MeasurementTypes, max: MeasurementTypes, avg: MeasurementTypes }

export type FlightDataChunk = { _datetime: Date | string, measured_values: { [index: string]: MeasurementTypes } }

export type FlightDataChunkAggregated = { start_date: Date | string, measured_values: { [index: string]: AggregatedMeasurements } }

export type MaybeFlightDataChunk = { [timeSpan: string]: FlightDataChunk | 'LOADING' }

export type MaybeFlightDataChunkAggregated = { [timeSpan: string]: FlightDataChunkAggregated | 'LOADING' }


export function isAggregatedMeasurement(obj: unknown): obj is AggregatedMeasurements {

    if (typeof obj !== 'object')
        return false

    const asDict = obj as { [p in 'avg' | 'min' | 'max']: unknown }

    return 'avg' in asDict || 'min' in asDict || 'max' in asDict
}

export type FlightDataState = {
    _flight_id: string;
    _vessel_part: string;
    measurements: TimeTreeNode<FlightDataChunk & TimeTreeData, FlightDataChunkAggregated & TimeTreeData>;
    loading: LoadingStates;
}

