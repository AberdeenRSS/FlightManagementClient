import { fetchRssApi, useRssWebSocket } from '@/composables/api/rssFlightServerApi';
import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowRef, watch, type Ref } from 'vue';
import { waitUntil } from '@/helper/reactivity'
import { until, type UseFetchReturn } from '@vueuse/core';
import type { LoadingStates } from '@/helper/loadingStates';
import { allocateTimeTreeAtLevel, DECISECOND, ETERNITY, getMissingRangesRecursive, insertValue, type TimeTreeData, type TimeTreeNode } from '@/helper/timeTree';

function getCommandsRequestUrl(flightId: string, vesselPart: string, start: Date, end: Date){
    return `/flight_data/get_aggregated_range/${flightId}/${vesselPart}/decisecond/${start.toISOString()}/${end.toISOString()}`
}

function getDispatchCommandUrl(flightId: string){
    return `/command/dispatch/${flightId}`
}

const store = ref({
    version: 0,
    commands: {} as {[index: string]: CommandState},
    realtimeSubscription: false
})

function getOrInitStore(flightId: string, vesselPart: string, commandType: string){
    const index = `${flightId}*${vesselPart}*${commandType}`

    let thisCommandData = store.value.commands[index]

    if(!thisCommandData){
        thisCommandData = store.value.commands[index] = {
            _command_type: commandType,
            _flight_id: flightId,
            _vessel_part: vesselPart,
            commands: {start: new Date(), members: {}, loadingState: 'NOT_REQUESTED', aggregationLevel: ETERNITY, requested: {}},
            loading: 'REQUESTED',
        }
    }

    return thisCommandData
}

async function fetchFlightDataInTimeFrame(flightId: string, vesselPart: string, commandType: string, start: Date, end: Date) {

    if(!store.value.commands)
        store.value.commands = {}

    const thisCommandData = getOrInitStore(flightId, vesselPart, commandType)

    const rangesToLoad = getMissingRangesRecursive(thisCommandData.commands, start, end, DECISECOND, true)

    if(rangesToLoad.length < 1)
        return

    // Make api request for all the missing ranges
    const requests = rangesToLoad.map(c => fetchRssApi(getCommandsRequestUrl(flightId, vesselPart, c.start, c.end)))

    // wait for all of the request to be completed
    await Promise.all(requests.map(r => until(r.isFinished).toBe(true)))

    const errored = requests.filter((r, i) => r.error.value)

    errored.forEach(e => {
        console.error(`Failed flight data request failed with code ${e.statusCode} and message ${e.error}`)
        return
    })

    const newData: Command[] = requests.map(r => (JSON.parse(r.data.value as string) as Command[])).flat()

    integrateData(newData, thisCommandData);

    store.value.version++
    
}

function dispatchCommand(flightId: string, command: Command){
    const req = fetchRssApi(getDispatchCommandUrl(flightId))
    return req.post([command], 'json')
}



    
async function subscribeRealtime(flightId: string){

    if(store.value.realtimeSubscription)
        return
    
    store.value.realtimeSubscription = true

    const ws$ = useRssWebSocket()

    watch(ws$, ws => {
        
        if(!ws)
            return

        ws.on('command.new', (data: wsCommandNewMsg) => {

            data.commands.forEach(cmd => {

                const thisCommandData = getOrInitStore(data.flight_id, cmd._part_id, cmd._command_type)

                const asTimeData: Command & TimeTreeData = {
                    ...cmd,
                    getDateTime(){ return typeof this.create_time === 'string' ? new Date(this.create_time) : this.create_time}
                }

                insertValue(thisCommandData.commands, asTimeData)
            });

        })

        ws.on('command.update', (data: wsCommandUpdateMsg) => {

            const cmd = data.command

            const thisCommandData = getOrInitStore(data.flight_id, cmd._part_id, cmd._command_type)

            const asTimeData: Command & TimeTreeData = {
                ...cmd,
                getDateTime(){ return typeof this.create_time === 'string' ? new Date(this.create_time) : this.create_time}
            }

            insertValue(thisCommandData.commands, asTimeData)
        })

        ws.on('connect', () => {
            ws.emit('command.subscribe', flightId)
        })

        ws.emit('command.subscribe', flightId)
            

    }, {immediate: true})
    
}

function integrateData(newData: Command[], store: CommandState) {

    newData.forEach(d => {

        const asTimeData: Command & TimeTreeData = {
            ...d,
            getDateTime(){ return typeof this.create_time === 'string' ? new Date(this.create_time) : this.create_time}
        }

        insertValue(store.commands, asTimeData)
    })

}

function getAllForFlight(flight_id: string){
    return Object.keys(store.value.commands).filter(k => k.startsWith(flight_id)).map(k => store.value.commands[k])
}

export function useCommandStore(){


    return {store, fetchFlightDataInTimeFrame, dispatchCommand, subscribeRealtime, getAllForFlight}
}

type wsCommandNewMsg = {
    flight_id: string,
    commands: Command[]
}

type wsCommandUpdateMsg = {
    flight_id: string,
    command: Command
}


export type CommandStates =  ('new')|('dispatched')|('received')|('completed')|('failed')

/**
 * Commands are issued to vessels to make them perform and action
    The vessel's computer has to retrieve them and report if they where
    completed successfully
 */
export type Command = {

    _id: string
   
    _command_type: string

    _part_id: string

    create_time: Date | string

    dispatch_time?: Date | string

    receive_time?: Date | string

    complete_time?: Date | string

    state: CommandStates

    command_payload?: {[key: string]: any}

    response?:     {[key: string]: any}
}

export type CommandState = {
    _flight_id: string;
    _vessel_part: string;
    _command_type: string;
    commands: TimeTreeNode<Command & TimeTreeData, never>;
    loading: LoadingStates;
}

