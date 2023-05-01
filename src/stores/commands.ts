import { fetchRssApi, useRssWebSocket } from '@/composables/api/rssFlightServerApi';
import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowRef, triggerRef, watch, type Ref } from 'vue';
import { waitUntil } from '@/helper/reactivity'
import { until, type UseFetchReturn } from '@vueuse/core';
import type { LoadingStates } from '@/helper/loadingStates';
import { allocateTimeTreeAtLevel, DECISECOND, ETERNITY, getMissingRangesRecursive, insertValue, type TimeTreeData, type TimeTreeNode } from '@/helper/timeTree';

function getCommandsRequestUrl(flightId: string, start: Date, end: Date, commandType?: string, vesselPart?: string, ){

    if(!commandType)
        commandType = 'all'
    if(!vesselPart)
        vesselPart = 'all'

    return `command/get_range/${flightId}/${start.toISOString()}/${end.toISOString()}/${commandType}/${vesselPart}`
}

function getDispatchCommandUrl(flightId: string){
    return `/command/dispatch/${flightId}`
}

const store = shallowRef({
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

export const ALL_STORE_PLACEHOLDER = 'ALL_TYPES_OR_PARTS'

async function fetchCommandsInTimeFrame(flightId: string, start: Date, end: Date, vesselPart?: string, commandType?: string,) {

    return

    if(!store.value.commands)
        store.value.commands = {}

    // In case all parts/types are getting requested, use a dummy tree
    // to store the request tracking info. Those trees won't be used to store
    // the actual commands
    const rangeCheckVesselPart = vesselPart ?? ALL_STORE_PLACEHOLDER
    const rangeCheckCommandType = commandType ?? ALL_STORE_PLACEHOLDER

    const allCommandData = getOrInitStore(flightId, rangeCheckVesselPart, rangeCheckCommandType)
    const rangesToLoad = getMissingRangesRecursive(allCommandData.commands, start, end, 'minute', true)

    if(rangesToLoad.length < 1)
        return

    // Make api request for all the missing ranges
    const requests = rangesToLoad.map(c => fetchRssApi(getCommandsRequestUrl(flightId, c.start, c.end, commandType, vesselPart)))


   
    // wait for all of the request to be completed
    await Promise.all(requests.map(r => until(r.isFinished).toBe(true)))

    const errored = requests.filter((r, i) => r.error.value)

    errored.forEach(e => {
        console.error(`Failed flight data request failed with code ${e.statusCode} and message ${e.error}`)
        return
    })

    const newData: Command[] = requests.map(r => (JSON.parse(r.data.value as string) as Command[])).flat()

    if(!vesselPart || !commandType){
        const commandsByPartAndType: {[index: string]: { part: string, type: string, commands: Command[]  }} = {}

        newData.forEach(c => {
            const index = `${c._part_id}*${c._command_type}`
            let group = commandsByPartAndType[index]
            if(!group)
                group = commandsByPartAndType[index] = {part: c._part_id, type: c._command_type, commands: []}
            group.commands.push(c)
        })

        Object.keys(commandsByPartAndType).forEach(k => {
            const group = commandsByPartAndType[k]
            const scopedStore = getOrInitStore(flightId, group.part, group.type)
            
            integrateData(group.commands, scopedStore);
        })
    }

    integrateData(newData, allCommandData)

    triggerRef(store)
    
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

            const allCommandData = getOrInitStore(data.flight_id, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)

            data.commands.forEach(cmd => {

                const thisCommandData = getOrInitStore(data.flight_id, cmd._part_id, cmd._command_type)
                const allPartsCommandData = getOrInitStore(data.flight_id, ALL_STORE_PLACEHOLDER, cmd._command_type)
                const allTypesCommandData = getOrInitStore(data.flight_id, cmd._part_id, ALL_STORE_PLACEHOLDER)


                const asTimeData: Command & TimeTreeData = {
                    ...cmd,
                    getDateTime(){ return typeof this.create_time === 'string' ? new Date(this.create_time) : this.create_time}
                }

                insertValue(thisCommandData.commands, asTimeData)
                insertValue(allPartsCommandData.commands, asTimeData)
                insertValue(allTypesCommandData.commands, asTimeData)
                insertValue(allCommandData.commands, asTimeData)

            });

            triggerRef(store)

        })

        ws.on('command.update', (data: wsCommandUpdateMsg) => {

            const cmd = data.command

            const thisCommandData = getOrInitStore(data.flight_id, cmd._part_id, cmd._command_type)
            const allPartsCommandData = getOrInitStore(data.flight_id, ALL_STORE_PLACEHOLDER, cmd._command_type)
            const allTypesCommandData = getOrInitStore(data.flight_id, cmd._part_id, ALL_STORE_PLACEHOLDER)
            const allCommandData = getOrInitStore(data.flight_id, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)

            const asTimeData: Command & TimeTreeData = {
                ...cmd,
                getDateTime(){ return typeof this.create_time === 'string' ? new Date(this.create_time) : this.create_time}
            }

            insertValue(thisCommandData.commands, asTimeData)
            insertValue(allPartsCommandData.commands, asTimeData)
            insertValue(allTypesCommandData.commands, asTimeData)
            insertValue(allCommandData.commands, asTimeData)

            triggerRef(store)
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


    return {store, fetchCommandsInTimeFrame, dispatchCommand, subscribeRealtime, getAllForFlight, getOrInitStore}
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
