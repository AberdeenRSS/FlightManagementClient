import { fetchRssApi, useRSSMqtt } from '@/composables/api/rssFlightServerApi';
import type { LoadingStates } from '@/helper/loadingStates';
import { asUtcString } from '@/helper/time';
import { ETERNITY, getMissingRangesRecursive, insertValue, type AggregationLevels, type TimeTreeData, type TimeTreeNode } from '@/helper/timeTree';
import { until } from '@vueuse/core';
import { ref, shallowRef, triggerRef, type Ref, type ShallowRef } from 'vue';
import { getOrInitStore as getOrInitFlightStore, type Flight } from './flight';
import struct, { type DataType } from 'python-struct'
import { decodePayload } from '@/helper/struct_helper';

function getMeasurementRequestUrl(flightId: string, vesselPart: string, seriesName: string, start: Date, end: Date, resolution: Exclude<AggregationLevels | 'smallest', 'eternity'>) {
    if (resolution == 'smallest')
        return `/flight_data/get_range/${flightId}/${vesselPart}/${seriesName}/${start.toISOString()}/${end.toISOString()}`
    else
        return `/flight_data/get_aggregated_range/${flightId}/${vesselPart}/${seriesName}/${resolution}/${start.toISOString()}/${end.toISOString()}`
}

const store = {
    flight_data: {} as { [index: string]: ShallowRef<FlightDataState> },
    realtimeSubscription:  {} as { [index: string]: Ref<boolean> },
    last_data_receive: ref(undefined as number | undefined)
}

function getOrInitStore(flightId: string, vesselPart: string, seriesName: string) {
    const index = `${flightId}*${vesselPart}*${seriesName}`

    let thisFlightData = store.flight_data[index]

    if (!thisFlightData) {
        thisFlightData = store.flight_data[index] = shallowRef<FlightDataState>({
            last_realtime: 0,
            measurements: { start: new Date(), members: {}, loadingState: 'NOT_REQUESTED', aggregationLevel: ETERNITY, requested: {} },
            _flight_id: flightId,
            _vessel_part: vesselPart,
            _series_name: seriesName,
            loading: 'REQUESTED',
        })
    }

    return thisFlightData
}

function getRealtimeSubscriptionState(flightId: string){

    if(!store.realtimeSubscription[flightId])
        store.realtimeSubscription[flightId] = ref(false);

    return store.realtimeSubscription[flightId]
}

async function fetchFlightDataInTimeFrame(flightId: string, vesselPart: string, seriesName: string, start: Date, end: Date, resolution: Exclude<AggregationLevels | 'smallest', 'eternity'>) {

    if (!store.flight_data)
        store.flight_data = {}

    const thisFlightData = getOrInitStore(flightId, vesselPart, seriesName)

    const rangesToLoad = getMissingRangesRecursive(thisFlightData.value.measurements, start, end, resolution, true)

    if (rangesToLoad.length < 1)
        return

    // Make api request for all the missing ranges
    const requests = rangesToLoad.map(c => fetchRssApi(getMeasurementRequestUrl(flightId, vesselPart, seriesName, c.start, c.end, resolution)))

    // wait for all of the request to be completed
    await Promise.all(requests.map(r => until(r.isFinished).toBe(true)))

    const errored = requests.filter((r) => r.error.value)

    errored.forEach(e => console.error(`Failed flight data request failed with code ${e.statusCode} and message ${e.error}`))

    if(errored.length > 0)
        return

    const newData: ServerMeasurement[] = requests.map(r => (JSON.parse(r.data.value as string) as ServerMeasurement[])).flat()

    integrateData(newData, thisFlightData.value, resolution);

    triggerRef(thisFlightData)

}

export function useFlightDataStore() {


    return { store, fetchFlightDataInTimeFrame, subscribeRealtime, getOrInitStore }
}

async function subscribeRealtime(flight: Flight) {

    // if (store.realtimeSubscription.value)
    //     return

    // store.realtimeSubscription.value = true

    const subscribed = getRealtimeSubscriptionState(flight._id)

    if(subscribed.value == true)
        return

    subscribed.value = true

    const mqtt = await until(useRSSMqtt()).toBeTruthy()

    const {getOrInitStore} = useFlightDataStore()

    const partDict = Object.keys(flight.measured_parts)

    const FLOAT_SIZE = struct.sizeOf('d')

    const flightStore = getOrInitFlightStore(flight._vessel_id)
    const curFlight = flightStore.value.flights[flight._id].flight

    const textDecorder = new TextDecoder()

    function parseMessage(topic: string, payload: Buffer, _pck: unknown){

        const splitTopic = topic.split('/')

        if(splitTopic[1] !== 'm' || splitTopic[0] !== flight._id)
            return

        const partIndex = Number.parseInt(splitTopic[2])
        const seriesIndex = Number.parseInt(splitTopic[3])

        const partName = partDict[partIndex]
        const series = flight.measured_parts[partName][seriesIndex]

        const store = getOrInitStore(flight._id, partName, series.name)

        // const time = (struct.unpack('!d', payload.subarray(0, FLOAT_SIZE))[0] as number)

        let [time, data] = decodePayload(series.type, payload)

        const date = new Date(time*1000)

        const dateIso = date.toISOString()

        // let data: DataType | DataType[] | string

        // if (series.type === '[str]'){

        //     data = textDecorder.decode(payload.subarray(FLOAT_SIZE, payload.length))
        //     console.log(data)
        // }
        // else if (series.type.length == 1) {
        //     data = struct.unpack(`!${series.type}`, payload.subarray(FLOAT_SIZE, payload.length))
        // }
        // else if (Array.isArray(series.type) && series.type[0].length == 2){

        //     const condensedFormat = series.type.map(s => s[1]).join()

        //     data = struct.unpack(`!${condensedFormat}`, payload.subarray(FLOAT_SIZE, payload.length))

        // }
        // else{
        //     return
        // }
        
        const singleValue = !Array.isArray(data) || data.length < 2

        data = singleValue && data.length < 2 ? data[0] : data


        const m = { 
            measurements: [[time, data]],
            min: singleValue ? data : undefined,
            avg: singleValue ? data : undefined,
            max: singleValue ? data : undefined,
            first: [time, data],
            last: [time, data],
            p_index: partIndex,
            m_index: seriesIndex,
            _start_time: dateIso,
            _end_time: dateIso,
            part_id: partName,
            series_name:series.name,
            getDateTime:() => date
        } as ServerMeasurement & TimeTreeData

        insertValue(store.value.measurements, m, undefined)

        const epochDate = date.getTime()
        const curEnd = typeof curFlight.value.end == 'string' ? new Date(curFlight.value.end).getTime() : curFlight.value.end

        // console.log(curEnd - (epochDate + 30*1000))
        if(!curEnd || (epochDate + (30*1000)) > curEnd){
            curFlight.value.end = new Date(epochDate + 60*1000).toISOString()
            triggerRef(curFlight)
        }


    }


    mqtt.on('message', parseMessage)
    mqtt.on('error', (err) => console.log(err))
    mqtt.on('connect', (pck) => console.log(pck))

    mqtt.subscribeAsync(`${flight._id}/#`)



    // watch(ws$, ws => {

    //     if (!ws)
    //         return

    //     // const now = Date.now()

    //     // if (store.last_data_receive.value && (now - store.last_data_receive.value) < MinRealtimePeriod)
    //     //     return

    //     // store.last_data_receive.value = now

    //     ws.on('flight_data.new', (data: wsFlightDataMsg) => {

    //         data.measurements.forEach(d => {

    //             const flightData = getOrInitStore(data.flight_id, d.part_id)

    //             const asTimeData: Measurements & TimeTreeData = {
    //                 ...d,
    //                 getDateTime() { return new Date(this._start_time) }
    //             }

    //             insertValue(flightData.value.measurements, asTimeData)

    //             triggerRef(flightData)
    //         })

    //     })


    //     ws.on('connect', () => {
    //         ws.emit('flight_data.subscribe', flightId)
    //     })

    //     ws.emit('flight_data.subscribe', flightId)


    // }, { immediate: true })

}

function integrateData(newData: (ServerMeasurement[]), store: FlightDataState, resolution: Exclude<AggregationLevels | 'smallest', 'eternity'>) {

    newData.forEach(d => {

        const asTimeData: ServerMeasurement & TimeTreeData = {
            ...d,
            getDateTime() { return typeof this._start_time === 'string' ? new Date(asUtcString(this._start_time)) : this._start_time }
        }
        insertValue(store.measurements, asTimeData, resolution != 'smallest' ? resolution : undefined)
        
    })

}


export type NumericalTypes = number | boolean
export type MeasurementTypes = string | NumericalTypes

export type ServerMeasurement = { 
    measurements: [ number, MeasurementTypes | NumericalTypes[] ][],
    min?: NumericalTypes,
    avg?: NumericalTypes,
    max?: NumericalTypes,
    first: [ number, MeasurementTypes | NumericalTypes[] ],
    last: [ number, MeasurementTypes | NumericalTypes[] ],
    p_index: number,
    m_index: number,
    part_id: string,
    series_name: string,
    _start_time: string,
    _end_time: string
}

export type Measurements = { 
    measurements: [ number, MeasurementTypes[] ][],
    measurements_aggregated: {[seriesName:  string]: [ number, number, number ] },
    part_id: string,
    _start_time: string,
    _end_time: string
}

export type MaybeFlightDataChunk = { [timeSpan: string]: Measurements | 'LOADING' }


export type FlightDataState = {
    last_realtime: number;
    _flight_id: string;
    _vessel_part: string;
    _series_name: string;
    measurements: TimeTreeNode<ServerMeasurement & TimeTreeData, ServerMeasurement & TimeTreeData>;
    loading: LoadingStates;
}

