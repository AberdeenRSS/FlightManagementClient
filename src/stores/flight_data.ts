import { fetchRssApi, useRssWebSocket } from '@/composables/api/rssFlightServerApi';
import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowRef, triggerRef, watch, type Ref, type ShallowRef } from 'vue';
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

const MinRealtimePeriod = 2000

const store = {
    flight_data: {} as { [index: string]: ShallowRef<FlightDataState> },
    realtimeSubscription: ref<boolean>(false),
    last_data_receive: ref(undefined as number | undefined)
}

function getOrInitStore(flightId: string, vesselPart: string) {
    const index = `${flightId}*${vesselPart}`

    let thisFlightData = store.flight_data[index]

    if (!thisFlightData) {
        thisFlightData = store.flight_data[index] = shallowRef<FlightDataState>({
            measurements: { start: new Date(), members: {}, loadingState: 'NOT_REQUESTED', aggregationLevel: ETERNITY, requested: {} },
            _flight_id: flightId,
            _vessel_part: vesselPart,
            loading: 'REQUESTED',
        })
    }

    return thisFlightData
}

async function fetchFlightDataInTimeFrame(flightId: string, vesselPart: string, start: Date, end: Date, resolution: Exclude<AggregationLevels | 'smallest', 'eternity'>) {

    if (!store.flight_data)
        store.flight_data = {}

    const thisFlightData = getOrInitStore(flightId, vesselPart)

    const rangesToLoad = getMissingRangesRecursive(thisFlightData.value.measurements, start, end, resolution, true)

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

    const newData: Measurements[] = requests.map(r => (JSON.parse(r.data.value as string) as Measurements[])).flat()

    integrateData(newData, thisFlightData.value, resolution);

    triggerRef(thisFlightData)

}

export function useFlightDataStore() {


    return { store, fetchFlightDataInTimeFrame, subscribeRealtime, getOrInitStore }
}

async function subscribeRealtime(flightId: string) {

    if (store.realtimeSubscription.value)
        return

    store.realtimeSubscription.value = true

    const ws$ = useRssWebSocket()

    watch(ws$, ws => {

        if (!ws)
            return

        // const now = Date.now()

        // if (store.last_data_receive.value && (now - store.last_data_receive.value) < MinRealtimePeriod)
        //     return

        // store.last_data_receive.value = now

        ws.on('flight_data.new', (data: wsFlightDataMsg) => {

            data.measurements.forEach(d => {

                const flightData = getOrInitStore(data.flight_id, d.part_id)

                const asTimeData: Measurements & TimeTreeData = {
                    ...d,
                    getDateTime() { return new Date(this._start_time) }
                }

                insertValue(flightData.value.measurements, asTimeData)

                triggerRef(flightData)
            })

        })


        ws.on('connect', () => {
            ws.emit('flight_data.subscribe', flightId)
        })

        ws.emit('flight_data.subscribe', flightId)


    }, { immediate: true })

}

function integrateData(newData: (Measurements[]), store: FlightDataState, resolution: Exclude<AggregationLevels | 'smallest', 'eternity'>) {

    newData.forEach(d => {

        const asTimeData: Measurements & TimeTreeData = {
            ...d,
            getDateTime() { return typeof this._start_time === 'string' ? new Date(this._start_time) : this._start_time }
        }
        insertValue(store.measurements, asTimeData, resolution != 'smallest' ? resolution : undefined)
        
    })

}

type wsFlightDataMsg = {
    flight_id: string,
    measurements: Measurements[]
}

export type MeasurementTypes = string | number | boolean

export type Measurements = { 
    measurements: [ number, MeasurementTypes[] ][],
    measurements_aggregated: {[seriesName:  string]: [ number, number, number ] },
    part_id: string,
    _start_time: string,
    _end_time: string
}

export type MaybeFlightDataChunk = { [timeSpan: string]: Measurements | 'LOADING' }


export type FlightDataState = {
    _flight_id: string;
    _vessel_part: string;
    measurements: TimeTreeNode<Measurements & TimeTreeData, Measurements & TimeTreeData>;
    loading: LoadingStates;
}

