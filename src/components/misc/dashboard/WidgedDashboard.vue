<template>

    <div class="drop-container">
        <div class="d-flex flex-row drop-row" v-for="row in store.matrix" :key="row[0].x">
            <div v-for="col in row" class="widget" :style="`width: ${tileSize}vw; height: ${tileSize}vw;`" :key="col.y"
                @dragover="onDragover" @dragenter="onDragenter($event, col)" @dragleave="onDragleave($event, col)" @drop="onDrop($event, col)">
                <DashboardElement v-if="!!col.element" :grid-columns="store.cols" :dashboard-id="dashboardID"
                    :size-x="col.element.sizeX" :size-y="col.element.sizeY" :grid-margin="margin" :id="col.element.id">
                    <slot :id="col.element.id"></slot>
                </DashboardElement>
                <div v-else class="widget-placeholder-container">
                    <div v-ripple :class="`widget-placeholder ${getHoverClass(col)}`" @click="onAddWidget(col)">
                        <div class="show-on-hover add-button" ><v-icon icon="mdi-plus" size="x-large"></v-icon></div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, type Ref, useSlots, watch, provide } from 'vue';
import DashboardElement from './DashboardElement.vue'
import { DASHBOARD_ID, useDashboardStore, type Widget, type WidgetMatrix, type WidgetSlot } from './DashboardComposable'
import { v4 } from 'uuid'

type HoverClasses = '' | 'hover-success' | 'hover-failure'

const passedSlots = useSlots()
const dashboardID = v4()
const margin = 0

provide(DASHBOARD_ID, dashboardID)

const { store, putWidget, addWidget, tryGetWidget, evaluateCollide, resetCollide, getCurrentSlot, removeWidget, initMatrix  } = useDashboardStore(dashboardID)

const tileSize = computed(() => (100 - margin * 2) / store.value.cols)

store.value.rows = 3
store.value.cols = 6
initMatrix()


let i = 0;
Object.keys(passedSlots).forEach(k => {

    const slot = passedSlots[k]

    const widget: Widget = { sizeX: 2, sizeY: 2, id: k, badSize: false } 
    store.value.widgets.push(widget)

    putWidget(store.value.matrix[0][i*2], widget)

    i++;
})


function getHoverClass(item: WidgetSlot): HoverClasses {
    return item.hoverCount > 0 ?
        (store.value.canDrop ? 'hover-success' : 'hover-failure')
        : ''
}

function onDragover(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
}

function onDragleave(event: DragEvent, item: WidgetSlot) {
    event.preventDefault()

    const widget = tryGetWidget(event)
    if (!widget)
        return

    evaluateCollide(item, widget, false)
}

function onDrop(event: DragEvent, item: WidgetSlot){

    event.preventDefault()

    const widget = tryGetWidget(event)
    if (!widget)
        return

    if(!store.value.canDrop){
        resetCollide()
        return
    }

    const oldSlot = getCurrentSlot(widget)

    const removedWidget = removeWidget(oldSlot!)

    putWidget(item, removedWidget!)

    resetCollide()
}

function onDragenter(event: DragEvent, item: WidgetSlot) {
    event.preventDefault()

    const widget = tryGetWidget(event)
    if (!widget)
        return

    evaluateCollide(item, widget, true)
}

function onAddWidget(col: WidgetSlot){
    addWidget(col, {sizeX: 1, sizeY: 1, id: v4(), badSize: false})
}

</script>

<style lang="scss">
/* .widget {
    border: 1px solid;
}

.drop-row {
    border: 1px solid red;
}

.drop-container {
    border: 1px solid blue;

} */

.widget-placeholder-container {
    width: 100%;
    height: 100%;
    padding: 1rem;
}

.widget-placeholder {
    background-color: lightgray;
    border-radius: 1.5rem;
    width: 100%;
    height: 100%;
    /* border: solid 0px black; */

    &:hover {
        background-color: darken(lightgray, 20%);
    }

    // &:active {
    //     background-color: darken(lightgray, 40%);
    // }

    &:hover > .show-on-hover{
        display: inherit;
    }
}

.show-on-hover{
    display: none;
}

.add-button {
    padding: 1rem;
}

.hover-success {
    background-color: green !important;
}

.hover-failure {
    background-color: red !important;
}
</style>