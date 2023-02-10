import { fetchRssApi, useRssWebSocket } from '@/composables/api/rssFlightServerApi';
import { defineStore } from 'pinia'
import { computed, reactive, ref, watch, type Ref } from 'vue';
import { waitUntil } from '@/helper/reactivity'
import { until, type UseFetchReturn } from '@vueuse/core';

function getMeasurementRequestUrl(flightId: string, vesselPart: string, start: Date, end: Date){
    return `/flight_data/get_aggregated_range/${flightId}/${vesselPart}/decisecond/${start.toISOString()}/${end.toISOString()}`
}

export const useFlightDataStore = defineStore({
  id: 'commands',
  state: () => ({
    flight_data: {} as {[index: string]: FlightDataState},
    realtimeSubscription: false
  }),
  actions: {
    async fetchFlightDataInTimeFrame(flightId: string, vesselPart: string, min: Date, max: Date) {

        if(!this.flight_data)
            this.flight_data = {}

        const index = `${flightId}*${vesselPart}`

        let existingEntry = this.flight_data[index]

        const oldMin: Date | undefined = existingEntry?.loadedMin
        const oldMax: Date | undefined = existingEntry?.loadedMax

        this.flight_data[index] = {
            measuredValues: existingEntry?.measuredValues ?? [],
            _flight_id: flightId,
            _vessel_part: vesselPart,
            loadedMin: min,
            loadedMax: max,
            loading: 'REQUESTED',
        }

        existingEntry = this.flight_data[index]

        const startWindowDelta = oldMin ? oldMin.getTime()- min.getTime() : undefined
        const endWindowDelta = oldMax ? max.getTime() - (oldMax?.getTime() ?? 0) : undefined

        let startWindowRequest: UseFetchReturn<unknown> | undefined = undefined

        if(!oldMin && !oldMax){
            startWindowRequest = await fetchRssApi(getMeasurementRequestUrl(flightId, vesselPart, min, max))
        }
        else {
            startWindowRequest = startWindowDelta && startWindowDelta > 0 ? await fetchRssApi(getMeasurementRequestUrl(flightId, vesselPart, min, oldMin)) : undefined
        }
        const endWindowRequest = endWindowDelta && endWindowDelta > 0 ? await fetchRssApi(getMeasurementRequestUrl(flightId, vesselPart, oldMax, max)) : undefined

        if(startWindowRequest)
            await until(startWindowRequest.isFinished).toBe(true)
        if(endWindowRequest)
            await until(endWindowRequest.isFinished).toBe(true)

        if(startWindowRequest?.error.value || endWindowRequest?.error.value){
            existingEntry.loading = 'ERROR'
            existingEntry.loadedMin = oldMin
            existingEntry.loadedMax = oldMax
            return
        }

        const newData: FlightDataTimeline = []

        if(startWindowRequest)
            newData.push(...(JSON.parse(startWindowRequest.data.value as string) as FlightDataTimeline))

        if(endWindowRequest)
            newData.push(...(JSON.parse(endWindowRequest.data.value as string) as FlightDataTimeline))

        existingEntry.measuredValues = integrateData(newData, existingEntry);
        
        existingEntry.loading = 'LOADED'

        this.flight_data[index] = existingEntry
    },
    async subscribeRealtime(flightId: string){

        if(this.realtimeSubscription)
            return
        
        this.realtimeSubscription = true

        const ws$ = useRssWebSocket()

        watch(ws$, ws => {
            
            if(!ws)
                return

            ws.on('flight_data.new', (data: wsFlightDataMsg) => {
    
                const index = `${data.flight_id}*${data.vessel_part}`
    
                let existingEntry = this.flight_data[index]
                if(!this.flight_data[index])
                {
                    this.flight_data[index] = {
                        measuredValues: existingEntry?.measuredValues ?? [],
                        _flight_id: flightId,
                        _vessel_part: data.vessel_part,
                        loadedMin: existingEntry?.loadedMin ?? new Date(Date.now()),
                        loadedMax: existingEntry?.loadedMax ?? new Date(Date.now() + 1),
                        loading: 'LOADED',
                    }
                }
                existingEntry = this.flight_data[index]
    
                existingEntry.measuredValues = integrateData(data.measurements, existingEntry)
    
            })

            ws.on('error', err => {
                console.log(err)
            })

            ws.on('connected', () => {
                ws.emit('flight_data.subscribe', flightId)
            })
    
            ws.emit('flight_data.subscribe', flightId)
                

        }, {immediate: true})
        
    }
  }
})

function integrateData(newData: FlightDataTimeline, existingEntry: FlightDataState) {
    const newMeasurements: FlightDataTimeline = [];


    // Convert to actual dates
    newData.forEach(d => {
        if (d._datetime)
            d._datetime = new Date(d._datetime);
        if (d.start_date)
            d.start_date = new Date(d.start_date);
    });

    if (existingEntry.measuredValues.length < 1)
        return newData;
 
    let newDataIndex = 0;
    const newDataLength = newData.length;
    let existingDataIndex = 0;
    const existingDataLength = existingEntry.measuredValues.length;

    while (existingDataIndex < existingDataLength) {

        const currentExistingData = existingEntry.measuredValues[existingDataIndex];
        const nextExistingData = existingDataIndex < existingDataLength ? existingEntry.measuredValues[existingDataIndex + 1] : undefined;

        newMeasurements.push(currentExistingData);

        if (newDataIndex >= newDataLength) {
            existingDataIndex++;
            continue;
        }

        let currentNewData = newData[newDataIndex];

        const currentNewDate = (currentNewData._datetime ?? currentNewData.start_date)!
        const currentExDate = (currentExistingData._datetime ?? currentExistingData.start_date)!
        const nxtExDate =  (nextExistingData?._datetime ?? nextExistingData?.start_date)

        while (currentNewDate.getTime() > currentExDate.getTime() && currentNewDate.getTime() < (nxtExDate?.getTime() ?? Number.MAX_SAFE_INTEGER)) {
            newMeasurements.push(currentNewData);
            newDataIndex++;
            if (newDataIndex >= newDataLength)
                break;
            currentNewData = newData[newDataIndex];
        }

        existingDataIndex++;
    }

    return newMeasurements;
    
}

function shouldRequest(l: LoadingStates){
  return l === 'NOT_REQUESTED' || l === 'ERROR'
}

type wsFlightDataMsg = {
    flight_id: string,
    vessel_part: string,
    measurements: FlightDataTimeline
}

export type LoadingStates = 
    'NOT_REQUESTED'
  | 'REQUESTED'
  | 'LOADED'
  | 'ERROR'

export type MeasurementTypes = string | number | boolean

export type AggregatedMeasurements = { min: MeasurementTypes, max: MeasurementTypes, avg: MeasurementTypes }

export type FlightDataTimeline = {_datetime?: Date, start_date?: Date, measured_values: {[index: string]: AggregatedMeasurements | MeasurementTypes } }[]

export function isAggregatedMeasurement(obj: unknown): obj is AggregatedMeasurements{
    return !!(obj as {avg?: unknown})['avg']
}

export type FlightDataState = {
    _flight_id: string;
    _vessel_part: string;
    measuredValues: FlightDataTimeline;
    loading: LoadingStates;
    loadedMin: Date;
    loadedMax: Date;
}

