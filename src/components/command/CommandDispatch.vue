<template>

    <div class="console-wrapper">
      <v-menu
        v-model="menu"
        :close-on-content-click="false"
        :open-on-focus="false"
        offset-y
        location="top"
      >
        <template #activator="{ props }">
          <v-text-field
            v-model="input"
            label="Command"
            v-bind="props"
            class="text-black"
            :error="input && (error?.length ?? 0) > 0"
            :error-message="error"
            @input="onInput"
            @keydown="onKeydown"
          >
                <template v-slot:append>
                    <v-btn v-bind="props" @click="submitCommand" :disabled="(error?.length ?? 0) > 0">
                        <v-icon icon="mdi-send" start></v-icon>
                    </v-btn>
                </template>
            </v-text-field>
        </template>
        <v-list>
          <v-list-item
            v-for="(suggestion, index) in autoCompleteSuggestions"
            :key="suggestion"
            :value="suggestion"
            :class="{'selected': index === selectedIndex}"

            @click="selectSuggestion(suggestion)"
          >
            {{ suggestion }}
          </v-list-item>
        </v-list>
      </v-menu>
      <p v-if="input && (error?.length ?? 0) > 0" class="error">{{ error![0] }}</p>
      <p v-if="submitError" class="error">{{ submitError }}</p>
    </div>
</template>

<style lang="scss">

.error {
    color:red;
    padding-left: 1rem;
}

.console-wrapper {
//   position: relative;
//   max-width: 600px;
    z-index: 701;

    // height: 10vw;
    // width: 20vw;

    min-height: 10vh;
    min-width: 20vw;
}

.selected {
  background-color: #1976d2;
  color: white;
}

.dispatch-container {
    padding: 0 1rem;

    // @media screen and (max-width: 800px) {

    //     padding: 0 1rem;

    // }
}

.component-select {

    background-color: rgba(112, 112, 112, 0.563);

    z-index: 701;

    height: 30vw;
    width: 20vw;

    min-height: 30vh;
    min-width: 20vw;
}

</style>
  
<script setup lang="ts">
import { useFlightViewState } from '@/composables/useFlightView';
import { fromImmediate, useObservableShallow } from '@/helper/reactivity';
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { useCommandStore, type Command } from '@/stores/commands';
import { useObservable } from '@vueuse/rxjs';
import { combineLatest, filter, map, shareReplay, startWith, tap } from 'rxjs';
import { v4 } from 'uuid';
import { ref } from 'vue';



const { vesselId, flightId } = useFlightViewState()
const { vessel$, flight$ } = getFlightAndHistoricVessel(vesselId, flightId)
const { dispatchCommand } = useCommandStore()


const parts$ = vessel$.pipe(
    filter(v => !!v),
    map(vessel => vessel!.parts),
    shareReplay(1)
)

const partNamesSuggestions$ = parts$.pipe(map(parts => parts.map(p => p.name.includes(' ') ? `"${p.name}"` : p.name)))

const input = ref<string>('')
const menu = ref<boolean>(false)
const selectedIndex = ref(-1)

const selectedPart$ = combineLatest([fromImmediate(input), parts$]).pipe(
    map(([userInput, parts]) => {

        if(!userInput || !parts)
            return undefined

        const args = getArgs(userInput)

        if(args.length < 1)
            return undefined

        const partIndex = parts.findIndex(p => p.name === args[0])
        if(partIndex < 0)
            return undefined

        return {...parts[partIndex], partIndex }

    }),
    startWith(undefined),
    shareReplay(1)
) 

const availableCommands$ = combineLatest([selectedPart$, flight$]).pipe(
    map(([p, f]) => {
        if(!!p && !!f)
            return f!.available_commands[p!._id]
        else
            return []
    }),
    startWith([]),
    shareReplay(1)
)

const availableCommandNames$ = availableCommands$.pipe(map(cc => cc.map(c => c.name)), shareReplay(1))

const selectedCommand$ = combineLatest([fromImmediate(input), availableCommands$]).pipe(
    map(([userInput, availableCommands]) => {

        if(!userInput || !availableCommands)
            return undefined

        const args = getArgs(userInput)

        if(args.length < 2)
            return undefined

        const selCmd = availableCommands.findIndex(c => c.name === args[1])
        if(selCmd < 0)
            return undefined
        return {...availableCommands[selCmd], commandIndex: selCmd}
    }),
    startWith(undefined),
    shareReplay(1)
)

const autoCompleteSuggestions$ = combineLatest([fromImmediate(input), partNamesSuggestions$, availableCommandNames$, selectedCommand$]).pipe(
    filter(([_, n, __, ___]) => !!n),
    map(([userInput, partNames, commandNames, command]) => {

        if(userInput === '')
            return partNames

        const args = getArgs(userInput)

        if (args.length === 1)
            return partNames.filter(n => n.toLowerCase().startsWith('"' + args[0].toLowerCase()) || n.toLowerCase().startsWith(args[0].toLowerCase()))

        if (args.length === 2)
            return commandNames.filter(n => n.toLowerCase().startsWith('"' + args[1].toLowerCase()) || n.toLowerCase().startsWith(args[1].toLowerCase()))

        if(!command || !command.payload_schema || (Array.isArray(command.payload_schema) && (args.length-2) > command.payload_schema.length) )
            return []

        if(!Array.isArray(command.payload_schema))
            return [`1/1: ${getPayloadHint(command.payload_schema)}`]

        return [`${args.length-2}/${command.payload_schema.length}: ${getPayloadHint(command.payload_schema[args.length-3][1])} (${command.payload_schema[args.length-3][0]})`]

    }),
    tap(s => {
        if(s.length > 0){
            if(selectedIndex.value < 0 || selectedIndex.value > s.length)
                selectedIndex.value = 0
        }
        else
            selectedIndex.value = -1
    }),
    shareReplay(1)
) 

const error$ = combineLatest([fromImmediate(input), selectedPart$, selectedCommand$]).pipe(
    map(([userInput, part, command]) => {
        if(!userInput)
            return ['Please enter a command']

        if(!part)
            return ['Valid part name required']

        if(!command)
            return[ 'Valid command name required']

        const args = getArgs(userInput)

        if(Array.isArray(command.payload_schema)){
            if(args.length-2 != command.payload_schema.length)
                return [`Command requires ${command.payload_schema.length} arguments`]
            return []
        }
        
        if(!command.payload_schema){
            if(args.length > 2)
                return ['Command does not have arguments']
            return []
        }
        
        if(args.length !== 3)
            return ['Command requires 1 argument']

        return []
    }),
    shareReplay(1)
)

const error = useObservable(error$)

const submitError = ref<string | undefined>()

const selectedPart = useObservableShallow(selectedPart$)

const selectedCommand = useObservable(selectedCommand$)

const autoCompleteSuggestions = useObservableShallow(autoCompleteSuggestions$)

function onInput() {
  selectedIndex.value = -1
}

function moveSelection(dir: number) {
    if(!autoCompleteSuggestions.value)
        return

    const max = autoCompleteSuggestions.value.length

    if (!max) 
        return

    selectedIndex.value = (selectedIndex.value + dir + max) % max
}

function onKeydown(event: KeyboardEvent){

    const inAutocomplete = getArgs(input.value).length < 3

    if (event.key === 'Tab') {
        event.preventDefault()
        if(inAutocomplete)
            selectSuggestion()
        return
    }
    
    if(event.key === 'ArrowDown'){
        event.preventDefault()
        moveSelection(1)
        return
    }

    if(event.key === 'ArrowUp'){
        event.preventDefault()
        moveSelection(-1)
        return
    }

    if(event.key === 'Enter'){
        event.preventDefault()
        if(inAutocomplete)
            selectSuggestion()
        if((error.value?.length ?? 0) < 1)
            submitCommand()
        return
    }
}

function selectSuggestion(cmd: string | null = null) {

    if(!cmd){
        if(selectedIndex.value < 0 || !autoCompleteSuggestions.value)
            return

        cmd = autoCompleteSuggestions.value[selectedIndex.value]
    }

    if(!input.value){
        input.value = cmd
        return
    }

    const args = getArgs(input.value)

    if(args.length > 2)
        return

    args[args.length-1] = cmd

    input.value = args.map(a => a.includes(' ') && !a.startsWith('"') ? `"${a}"` : a).join(' ') + ' '

}

/**
 * Splits a command string into its arguments
 * @param cmd 
 */
function getArgs(cmd: string){

    const splitByQuotes = cmd.split('"')

    const completedPart = (splitByQuotes.length-1) % 2 === 0 ? cmd : splitByQuotes.slice(0, splitByQuotes.length-1).join('"')
    let uncompleted: string[] = []
    
    if((splitByQuotes.length-1) % 2 !== 0)
        uncompleted = [splitByQuotes[splitByQuotes.length-1]]
    else if(cmd.endsWith(' '))
        uncompleted = ['']

    // eslint-disable-next-line no-invalid-regexp
    const argsRegex = /(("[\w\s\-$%#&*@!^\.,\(\)]+")|[\w\-$%#&*@!^\.,\(\)]+)/gm

    const matches = completedPart.matchAll(argsRegex)

    if(matches == null)
        return uncompleted

    return matches.map((m: RegExpExecArray) => m[0].replaceAll('"', '')).toArray().concat(uncompleted)
}

async function submitCommand(){

    if((error.value?.length ?? 0) > 0)
        return


    const args = getArgs(input.value!)
    
    const schema = selectedCommand.value!.payload_schema

    let payload = undefined
    
    if(Array.isArray(schema)){
        payload = args.slice(2, 2 + schema.length).map((a: string, i: number) => convertPayload((selectedCommand.value!.payload_schema as [string, string][])[i][1], a))
    }
    else if(schema){
        payload = convertPayload(selectedCommand.value!.payload_schema as string, args[2])
    }

    try{

        const command =  ({
            _id: v4(),
            _command_type: selectedCommand!.value!.name,
            _part_id: selectedPart.value!._id,
            _part_index: selectedPart.value?.partIndex,
            create_time: new Date(Date.now()),
            response_message: '',
            state: 'new',
            command_index: selectedCommand.value!.commandIndex,
            command_schema: selectedCommand.value!.payload_schema,
            command_payload: payload
        } as Command)

        await dispatchCommand(flightId.value, vesselId.value, command)

        input.value = ''
    }
    catch(e){
        submitError.value = String(e)
    }

}

function getPayloadHint(schema: string){

    switch(schema){
        case '[str]':
            return 'String'
        case '?':
            return 'Boolean'
        case 'c':
        case 'b':
            return 'Char'
        case 'B':
            return 'Unsigned char'
        case 'h':
            return 'Short'
        case 'H':
            return 'Unsigned short'
        case 'i':
        case 'n':
        case 'N':
            return 'Int'
        case 'I': 
            return 'Unsigned int'
        case 'l':
            return 'Long'
        case 'L':
            return 'Unsigned long'
        case 'q':
            return 'Long long'
        case 'Q':
            return 'Unsigned long long'
        case 'f':
            return 'Float'
        case 'd':
            return 'Double'
        default:
            return 'Unknown'
    }

}

function convertPayload(schema: string, payload: string){
        switch(schema){
        case '[str]':
            return payload
        case '?':
            if(Number.isNaN(payload))
                return Boolean(payload)
            else
                return Boolean(Number(payload))
        case 'c':
        case 'b':
        case 'B':
        case 'h':
        case 'H':
        case 'i':
        case 'n':
        case 'N':
        case 'I': 
        case 'l':
        case 'L':
        case 'q':
        case 'Q':
        case 'f':
        case 'd':
            return Number(payload)
        default:
            return payload
    }
}

</script>
