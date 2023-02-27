import { fetchRssApi, useRssWebSocket } from '@/composables/api/rssFlightServerApi';
import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowRef, watch, type Ref } from 'vue';
import { waitUntil } from '@/helper/reactivity'
import { until, type UseFetchReturn } from '@vueuse/core';
import type { LoadingStates } from '@/helper/loadingStates';
import { allocateTimeTreeAtLevel, DECISECOND, ETERNITY, getMissingRangesRecursive, insertValue, type TimeTreeData, type TimeTreeNode } from '@/helper/timeTree';

function getMeasurementRequestUrl(flightId: string, vesselPart: string, start: Date, end: Date){
    return `/flight_data/get_aggregated_range/${flightId}/${vesselPart}/decisecond/${start.toISOString()}/${end.toISOString()}`
}

const store = ref({
    version: 0,
    flight_data: {} as {[index: string]: FlightDataState},
    realtimeSubscription: false
})

async function fetchFlightDataInTimeFrame(flightId: string, vesselPart: string, start: Date, end: Date) {

    if(!store.value.flight_data)
        store.value.flight_data = {}

    const index = `${flightId}*${vesselPart}`

    let thisFlightData = store.value.flight_data[index]

    if(!thisFlightData){
        thisFlightData = store.value.flight_data[index] = {
            measurements: {start: new Date(), members: {}, loadingState: 'NOT_REQUESTED', aggregationLevel: ETERNITY, requested: {}},
            _flight_id: flightId,
            _vessel_part: vesselPart,
            loading: 'REQUESTED',
        }
    }

    const rangesToLoad = getMissingRangesRecursive(thisFlightData.measurements, start, end, DECISECOND, true)

    if(rangesToLoad.length < 1)
        return

    // Make api request for all the missing ranges
    const requests = rangesToLoad.map(c => fetchRssApi(getMeasurementRequestUrl(flightId, vesselPart, c.start, c.end)))

    // wait for all of the request to be completed
    await Promise.all(requests.map(r => until(r.isFinished).toBe(true)))

    const errored = requests.filter((r, i) => r.error.value)

    errored.forEach(e => {
        console.error(`Failed flight data request failed with code ${e.statusCode} and message ${e.error}`)
        return
    })

    const newData: FlightDataChunkAggregated[] = requests.map(r => (JSON.parse(r.data.value as string) as FlightDataChunkAggregated[])).flat()

    integrateData(newData, thisFlightData);

    store.value.version++
    
}

export function useFlightDataStore(){


    return {store, fetchFlightDataInTimeFrame}
}

// export const useFlightDataStore = defineStore({
//   id: 'flight_data',
//   actions: {
    
//     async subscribeRealtime(flightId: string){

//         throw new Error('Not implemented')

//         // if(this.realtimeSubscription)
//         //     return
        
//         // this.realtimeSubscription = true

//         // const ws$ = useRssWebSocket()

//         // watch(ws$, ws => {
            
//         //     if(!ws)
//         //         return

//         //     ws.on('flight_data.new', (data: wsFlightDataMsg) => {
    
//         //         const index = `${data.flight_id}*${data.vessel_part}`
    
//         //         let existingEntry = this.flight_data[index]
//         //         if(!this.flight_data[index])
//         //         {
//         //             this.flight_data[index] = {
//         //                 measuredValues: existingEntry?.measuredValues ?? [],
//         //                 _flight_id: flightId,
//         //                 _vessel_part: data.vessel_part,
//         //                 loadedMin: existingEntry?.loadedMin ?? new Date(Date.now()),
//         //                 loadedMax: existingEntry?.loadedMax ?? new Date(Date.now() + 1),
//         //                 loading: 'LOADED',
//         //             }
//         //         }
//         //         existingEntry = this.flight_data[index]
    
//         //         existingEntry.measuredValues = integrateData(data.measurements, existingEntry)
    
//         //     })

//         //     ws.on('error', err => {
//         //         console.log(err)
//         //     })

//         //     ws.on('connected', () => {
//         //         ws.emit('flight_data.subscribe', flightId)
//         //     })
    
//         //     ws.emit('flight_data.subscribe', flightId)
                

//         // }, {immediate: true})
        
//     }
//   }
// })

function integrateData(newData: FlightDataChunkAggregated[], store: FlightDataState) {

    newData.forEach(d => {

        const asTimeData: FlightDataChunkAggregated & TimeTreeData = {
            ...d,
            getDateTime(){ return typeof this.start_date === 'string' ? new Date(this.start_date) : this.start_date}
        }

        insertValue(store.measurements, asTimeData, DECISECOND)
    })

}

type wsFlightDataMsg = {
    flight_id: string,
    vessel_part: string,
    measurements: FlightDataChunk
}





export type MeasurementTypes = string | number | boolean

export type AggregatedMeasurements = { min: MeasurementTypes, max: MeasurementTypes, avg: MeasurementTypes }

export type FlightDataChunk = {_datetime: Date | string, measured_values: {[index: string]: MeasurementTypes } }

export type FlightDataChunkAggregated = { start_date: Date | string, measured_values: {[index: string]: AggregatedMeasurements } } 

export type MaybeFlightDataChunk = {[timeSpan: string]: FlightDataChunk | 'LOADING'}

export type MaybeFlightDataChunkAggregated = {[timeSpan: string]: FlightDataChunkAggregated | 'LOADING'}


export function isAggregatedMeasurement(obj: unknown): obj is AggregatedMeasurements{
    return !!(obj as {avg?: unknown})['avg'] || !!(obj as {min?: unknown})['min'] || !!(obj as {max?: unknown})['max']
}

export type FlightDataState = {
    _flight_id: string;
    _vessel_part: string;
    measurements: TimeTreeNode<FlightDataChunk & TimeTreeData, FlightDataChunkAggregated & TimeTreeData>;
    loading: LoadingStates;
}

