<template>

    <div style="padding: 2vw;" class="drop-container">
        <div class="d-flex flex-row drop-row" v-for="row in matrix" :key="row[0].j">
            <div v-for="col in row" class="widged" :style="`width: ${tileSize}vw; height: ${tileSize}vw;`" :key="col.i"
                @dragover="onDragover" @dragenter="onDragenter($event, col)" @dragleave="onDragleave($event, col)" @drop="onDrop($event, col)">
                <DashboardElement v-if="!!col.element" :grid-columns="cols"
                    :size-x="col.element.sizeX" :size-y="col.element.sizeY" :grid-margin="margin" :id="col.element.id">
                    <slot :name="col.element.id"></slot>
                </DashboardElement>
                <div v-else class="widged-placeholder-container">
                    <div :class="`widged-placeholder ${getHoverClass(col)}`"></div>
                </div>
            </div>
        </div>

    </div>
</template>



<script setup lang="ts">
import { computed, ref, toRefs, type Ref, useSlots, watch } from 'vue';
import DashboardElement from './DashboardElement.vue'
import { v4 } from 'uuid'

type Widged = { sizeX: number; sizeY: number; id: string }
type HoverClasses = '' | 'hover-success' | 'hover-failure'
type WidgedSlot = { element: Widged | null; blocked: string | undefined, hoverCount: number; i: number; j: number }
type WidgedRow = WidgedSlot[]
type WidgedMatrix = WidgedRow[]

const passedSlots = useSlots()

const rows = 6
const cols = 6
const margin = 2

const matrixProto: WidgedMatrix = []
for (let i = 0; i < rows; i++) {
    matrixProto[i] = []
    for (let j = 0; j < cols; j++) {
        matrixProto[i][j] = { element: null, blocked: undefined, hoverCount: 0, i, j }
    }
}


const matrix = ref(matrixProto);
const widgeds: Ref<Widged[]> = ref([])
const canDrop = ref(false)
const tileSize = computed(() => (100 - margin * 2) / cols)
const widgedDict = computed(() => getWidgedLookup(widgeds.value))



    let i = 0;
    Object.keys(passedSlots).forEach(k => {

        const slot = passedSlots[k]

        

        const widged: Widged = { sizeX: 2, sizeY: 2, id: k } 
        widgeds.value.push(widged)

        putWidged(matrix.value[0][i*2], widged)

        i++;
    })

function putWidged(slot: WidgedSlot, widged: Widged){

    slot.element = widged;

    for(let i = slot.i; i < (slot.i+widged.sizeY); i++){
        for(let j = slot.j; j < (slot.j+widged.sizeY); j++){
            matrix.value[i][j].blocked = widged.id;
        }
    }
}

function removeWidged(slot: WidgedSlot){

    const removed = slot.element
    if(!removed)
        return undefined

    for(let i = slot.i; i < (slot.i+removed.sizeY); i++){
        for(let j = slot.j; j < (slot.j+removed.sizeY); j++){
            matrix.value[i][j].element = null;
            matrix.value[i][j].blocked = undefined;
        }
    }

    return removed
}


function getHoverClass(item: WidgedSlot): HoverClasses {
    return item.hoverCount > 0 ?
        (canDrop.value ? 'hover-success' : 'hover-failure')
        : ''
}

function getWidgedLookup(widgeds: Widged[]) {
    const dict: { [uuid: string]: Widged } = {}
    // Make lowercase as the event data does the same
    widgeds.forEach(w => dict[w.id.toLowerCase()] = w)
    return dict;
}

function onDragover(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
}

function onDragenter(event: DragEvent, item: WidgedSlot) {
    event.preventDefault()

    const widged = tryGetWidged(event)
    if (!widged)
        return

    evaluateCollide(item, widged, true)
}

function onDragleave(event: DragEvent, item: WidgedSlot) {
    event.preventDefault()

    const widged = tryGetWidged(event)
    if (!widged)
        return

    evaluateCollide(item, widged, false)
}

function onDrop(event: DragEvent, item: WidgedSlot){

    event.preventDefault()

    const widged = tryGetWidged(event)
    if (!widged)
        return

    if(!canDrop.value){
        resetCollide()
        return
    }

    const oldSlot = matrix.value.map(row => row.find(c => c.element?.id === widged.id)).find(c => !!c)

    const removedWidged = removeWidged(oldSlot!)

    putWidged(item, removedWidged!)

    resetCollide()
}

function evaluateCollide(initiatingSlot: WidgedSlot, initiatingWidged: Widged, add: boolean) {
    // 1. Get affected slots
    const slots: (WidgedSlot | undefined)[] = []

    for (let i = initiatingSlot.i; i < (initiatingSlot.i + initiatingWidged.sizeY); i++) {
        for (let j = initiatingSlot.j; j < (initiatingSlot.j + initiatingWidged.sizeX); j++) {
            if (i < matrix.value.length && j < matrix.value[i].length)
                slots.push(matrix.value[i][j])
            else
                slots.push(undefined)
        }
    }

    if (add) {
        if (slots.some(s => !s || (!!s.element && s.element.id !== initiatingWidged.id) || (!!s.blocked && s.blocked !== initiatingWidged.id) ))
            canDrop.value = false
        else
            canDrop.value = true
    }


    slots.filter(s => !!s).map(s => s!.hoverCount += (add ? 1 : -1))
    return
}


function resetCollide() {
    matrix.value.forEach(row => {
        row.forEach(c => c.hoverCount = 0)
    })
}

function tryGetWidged(event: DragEvent) {
    const uuidPair = event.dataTransfer?.types.find(t => t.startsWith('uuid'))
    if (!uuidPair)
        return undefined

    const uuid = uuidPair.split('*')[1]
    return widgedDict.value[uuid]
}

</script>

<style>
/* .widged {
    border: 1px solid;
}

.drop-row {
    border: 1px solid red;
}

.drop-container {
    border: 1px solid blue;

} */

.widged-placeholder-container {
    width: 100%;
    height: 100%;
    padding: 1rem;
}

.widged-placeholder {
    background-color: lightgray;
    border-radius: 2rem;
    width: 100%;
    height: 100%;
    /* border: solid 0px black; */
}

.hover-success {
    background-color: green !important;
}

.hover-failure {
    background-color: red !important;
}
</style>