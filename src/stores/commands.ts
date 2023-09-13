import { fetchRssApi, useRssWebSocket } from '@/composables/api/rssFlightServerApi';
import type { LoadingStates } from '@/helper/loadingStates';
import { ETERNITY, getMissingRangesRecursive, insertValue, type TimeTreeData, type TimeTreeNode } from '@/helper/timeTree';
import { until } from '@vueuse/core';
import { ref, shallowRef, triggerRef, watch, type ShallowRef } from 'vue';

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

const store = {
    commands: {} as Record<string, ShallowRef<CommandState>>,
    lastCommand: {} as Record<string, ShallowRef<(Command & {start: Date}) | undefined>>,
    realtimeSubscription: ref(false)
}

function getOrInitStore(flightId: string, vesselPart?: string, commandType?: string){

    if(!vesselPart)
        vesselPart = ''

    if(!commandType)
        commandType = ''

    const index = `${flightId}*${vesselPart}*${commandType}`

    if(!store.commands[index]){
        store.commands[index] = shallowRef<CommandState>({
            _command_type: commandType,
            _flight_id: flightId,
            _vessel_part: vesselPart,
            commands: {start: new Date(), members: {}, loadingState: 'NOT_REQUESTED', aggregationLevel: ETERNITY, requested: {}},
            loading: 'REQUESTED',
        })
    }

    return store.commands[index]
}

function getOrInitLastCommand(flightId: string, vesselPart?: string, commandType?: string){

    if(!vesselPart)
        vesselPart = ''

    if(!commandType)
        commandType = ''

    const index = `${flightId}*${vesselPart}*${commandType}`

    if(!store.lastCommand[index]){
        store.lastCommand[index] = shallowRef<(Command & {start: Date}) | undefined>()
    }

    return store.lastCommand[index]

}

export const ALL_STORE_PLACEHOLDER = 'ALL_TYPES_OR_PARTS'

async function fetchCommandsInTimeFrame(flightId: string, start: Date, end: Date, vesselPart?: string, commandType?: string,) {


    if(!store.commands)
        store.commands = {}

    // In case all parts/types are getting requested, use a dummy tree
    // to store the request tracking info. Those trees won't be used to store
    // the actual commands
    // const rangeCheckVesselPart = vesselPart ?? ALL_STORE_PLACEHOLDER
    // const rangeCheckCommandType = commandType ?? ALL_STORE_PLACEHOLDER

    const allCommandData = getOrInitStore(flightId, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)
    const rangesToLoad = getMissingRangesRecursive(allCommandData.value.commands, start, end, 'minute', true)

    if(rangesToLoad.length < 1)
        return

    // Make api request for all the missing ranges
    const requests = rangesToLoad.map(c => fetchRssApi(getCommandsRequestUrl(flightId, c.start, c.end, commandType, vesselPart)))

    // wait for all of the request to be completed
    await Promise.all(requests.map(r => until(r.isFinished).toBe(true)))

    const errored = requests.filter((r) => r.error.value)

    errored.forEach(e => console.error(`Failed flight data request failed with code ${e.statusCode} and message ${e.error}`) )

    if(errored.length > 0)
        return

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
            const lastCommand = getOrInitLastCommand(flightId, group.part, group.type)
            
            integrateData(group.commands, scopedStore.value);
            triggerRef(scopedStore)

            for(const c of group.commands){
                integrateLastCommand(lastCommand, toCommandAndDate(c))
            }
        })
    }

    const lastCommand = getOrInitLastCommand(flightId, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)
    for(const c of newData){
        integrateLastCommand(lastCommand, toCommandAndDate(c))
    }

    integrateData(newData, allCommandData.value)
    triggerRef(allCommandData)
    
}

function dispatchCommand(flightId: string, cmd: Command){

    const allLastCommandData = getOrInitLastCommand(flightId, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)
    const thisLastCommandData = getOrInitLastCommand(flightId, cmd._part_id, cmd._command_type)
    const allPartsLastCommandData = getOrInitLastCommand(flightId, ALL_STORE_PLACEHOLDER, cmd._command_type)
    const allTypesLastCommandData = getOrInitLastCommand(flightId, cmd._part_id, ALL_STORE_PLACEHOLDER)

    integrateLastCommand(allLastCommandData, toCommandAndDate(cmd))
    integrateLastCommand(thisLastCommandData, toCommandAndDate(cmd))
    integrateLastCommand(allPartsLastCommandData, toCommandAndDate(cmd))
    integrateLastCommand(allTypesLastCommandData, toCommandAndDate(cmd))

    const req = fetchRssApi(getDispatchCommandUrl(flightId))
    return req.post([cmd], 'json')
}
    
async function subscribeRealtime(flightId: string){

    if(store.realtimeSubscription.value)
        return
    
    store.realtimeSubscription.value = true

    const ws$ = useRssWebSocket()

    watch(ws$, ws => {
        
        if(!ws)
            return

        ws.on('command.new', (data: wsCommandNewMsg) => {

            const allCommandData = getOrInitStore(data.flight_id, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)
            const allLastCommandData = getOrInitLastCommand(data.flight_id, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)

            data.commands.forEach(cmd => {

                const thisCommandData = getOrInitStore(data.flight_id, cmd._part_id, cmd._command_type)
                const allPartsCommandData = getOrInitStore(data.flight_id, ALL_STORE_PLACEHOLDER, cmd._command_type)
                const allTypesCommandData = getOrInitStore(data.flight_id, cmd._part_id, ALL_STORE_PLACEHOLDER)

                const thisLastCommandData = getOrInitLastCommand(data.flight_id, cmd._part_id, cmd._command_type)
                const allPartsLastCommandData = getOrInitLastCommand(data.flight_id, ALL_STORE_PLACEHOLDER, cmd._command_type)
                const allTypesLastCommandData = getOrInitLastCommand(data.flight_id, cmd._part_id, ALL_STORE_PLACEHOLDER)

                const asTimeData: Command & TimeTreeData = {
                    ...cmd,
                    getDateTime(){ return typeof this.create_time === 'string' ? new Date(this.create_time) : this.create_time}
                }

                insertValue(thisCommandData.value.commands, asTimeData)
                insertValue(allPartsCommandData.value.commands, asTimeData)
                insertValue(allTypesCommandData.value.commands, asTimeData)
                insertValue(allCommandData.value.commands, asTimeData)

                integrateLastCommand(allLastCommandData, toCommandAndDate(asTimeData))
                integrateLastCommand(thisLastCommandData, toCommandAndDate(asTimeData))
                integrateLastCommand(allPartsLastCommandData, toCommandAndDate(asTimeData))
                integrateLastCommand(allTypesLastCommandData, toCommandAndDate(asTimeData))

                triggerRef(thisCommandData)
                triggerRef(allPartsCommandData)
                triggerRef(allTypesCommandData)
                triggerRef(allCommandData)

            });
        })

        ws.on('command.update', (data: wsCommandUpdateMsg) => {

            const allCommandData = getOrInitStore(data.flight_id, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)
            const allLastCommandData = getOrInitLastCommand(data.flight_id, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)

            for(const cmd of data.commands){

                const thisCommandData = getOrInitStore(data.flight_id, cmd._part_id, cmd._command_type)
                const allPartsCommandData = getOrInitStore(data.flight_id, ALL_STORE_PLACEHOLDER, cmd._command_type)
                const allTypesCommandData = getOrInitStore(data.flight_id, cmd._part_id, ALL_STORE_PLACEHOLDER)

                const thisLastCommandData = getOrInitLastCommand(data.flight_id, cmd._part_id, cmd._command_type)
                const allPartsLastCommandData = getOrInitLastCommand(data.flight_id, ALL_STORE_PLACEHOLDER, cmd._command_type)
                const allTypesLastCommandData = getOrInitLastCommand(data.flight_id, cmd._part_id, ALL_STORE_PLACEHOLDER)
    
                const asTimeData: Command & TimeTreeData = {
                    ...cmd,
                    getDateTime(){ return typeof this.create_time === 'string' ? new Date(this.create_time) : this.create_time}
                }

                insertValue(thisCommandData.value.commands, asTimeData)
                insertValue(allPartsCommandData.value.commands, asTimeData)
                insertValue(allTypesCommandData.value.commands, asTimeData)
                insertValue(allCommandData.value.commands, asTimeData)

                integrateLastCommand(allLastCommandData, toCommandAndDate(asTimeData))
                integrateLastCommand(thisLastCommandData, toCommandAndDate(asTimeData))
                integrateLastCommand(allPartsLastCommandData, toCommandAndDate(asTimeData))
                integrateLastCommand(allTypesLastCommandData, toCommandAndDate(asTimeData))

                triggerRef(thisCommandData)
                triggerRef(allPartsCommandData)
                triggerRef(allTypesCommandData)
                triggerRef(allCommandData)
            }

        })

        ws.on('connect', () => {
            ws.emit('command.subscribe_as_client', flightId)
        })

        ws.emit('command.subscribe_as_client', flightId)
            

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

function toCommandAndDate(command: Command): Command & {start: Date}{
    return {
        ...command,
        start: typeof command.create_time === 'string' ? new Date(command.create_time) : command.create_time
    }
}

function integrateLastCommand(store: ShallowRef<(Command & {start: Date}) | undefined>, command: Command & {start: Date}){

    const newer = (command.start.getTime() > (store.value?.start.getTime() ?? 0))
    const same = (command._id === store.value?._id)
    if (same || newer){
        store.value = command
        triggerRef(store)
    }
}

function getAllForFlight(flight_id: string){
    return getOrInitStore(flight_id, ALL_STORE_PLACEHOLDER, ALL_STORE_PLACEHOLDER)
}

export function useCommandStore(){


    return {store, fetchCommandsInTimeFrame, dispatchCommand, subscribeRealtime, getAllForFlight, getOrInitStore, getOrInitLastCommand}
}

type wsCommandNewMsg = {
    flight_id: string,
    commands: Command[]
}

type wsCommandUpdateMsg = {
    flight_id: string,
    commands: Command[]
}


export type CommandStates =  ('new')|('dispatched')|('received')|('success')|('failed')

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

    command_payload?: Record<string, unknown>

    response_message?: string

    response?:     Record<string, unknown>
}

export type CommandState = {
    _flight_id: string;
    _vessel_part: string;
    _command_type: string;
    commands: TimeTreeNode<Command & TimeTreeData, never>;
    loading: LoadingStates;
}

