<template>
    <div :draggable="true" @dragstart="startDrag" @dragend="endDrag"  class="widget-container"
        :style="`width: ${size[0]}vw; height: ${size[1]}vw;`">
        <span ref="slotContent">
            <slot></slot>
        </span>
        <!-- <div class="resizer resizer-left" ></div>
        <div class="resizer resizer-top"></div> -->
        <div class="resizer" :draggable="true" @touchstart="onResizeStart($event)" @touchend="onResizeEnd" @dragend="onResizeEnd" @dragstart="$event => onResizeStart($event)">
            <v-icon icon="mdi-resize-bottom-right" size="x-large"></v-icon>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, provide, ref, toRefs, watch, type VNode, type VNodeRef, type WatchStopHandle } from 'vue';
import { DASHBOARD_ID, DASHBOARD_WIDGET_ID, useDashboardWidgetStore } from './DashboardComposable';

const slotContent = ref<VNodeRef | null>(null)

const props = defineProps({
    id: {
        type: String,
        required: true
    },
    dashboardId: {
        type: String,
        required: true,
    },
    gridColumns: {
        type: Number,
        required: true
    },
    gridMargin: {
        type: Number,
        default: 0
    },
    sizeX: {
        type: Number,
        required: true
    },
    sizeY: {
        type: Number,
        required: true
    },
    incorrectSize: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits<{
    // The requested size is the size the user want the element to have
    // The dashboard has to check this size, if it's acceptable, 
    // it sets the new size of the element, if not the old size is
    // used and the incorrectSize prop is set
    (event: 'requestResize', selectedParts: { sizeX: number, sizeY: number }): void
}>()

const { gridColumns, gridMargin, id, dashboardId } = toRefs(props)

provide(DASHBOARD_ID, dashboardId.value)
provide(DASHBOARD_WIDGET_ID, [dashboardId.value, id.value])

const {  resizeWidget } = useDashboardWidgetStore([dashboardId.value, id.value])

const dragged = ref(false)

const requestSizeX = ref(1)
const requestSizeY = ref(1)
watch([requestSizeX, requestSizeY], ([reqX, reqY]) => emit('requestResize', { sizeX: reqX, sizeY: reqY }))

const tileSize = computed(() => (100 - (gridMargin.value * 2)) / gridColumns.value)

const tileSizePx = computed(() => tileSize.value * window.innerWidth / 100)

const currentlyResizing = ref(false)
const resizeDistanceVW = ref([0, 0])
const resizeDistance = ref([0, 0])

const size = computed(() => 
    currentlyResizing.value
    ? [(tileSize.value * props.sizeX) + resizeDistanceVW.value[0], (tileSize.value * props.sizeY) + resizeDistanceVW.value[1]]
    : [tileSize.value * props.sizeX, tileSize.value * props.sizeY]
)

/**
 * When the component gets dragged the id
 * needs to be set on the data transfer,
 * so the dashboard can know on drop what element
 * needs to be changed
 * @param evt The original drag event
 */
function startDrag(evt: DragEvent) {

    dragged.value = true

    evt.dataTransfer!.dropEffect = 'move';
    evt.dataTransfer!.effectAllowed = 'move';

    // Set the key as the value as the value is only available on drop
    evt.dataTransfer!.setData(`uuid*${id.value}`, id.value);

}


function endDrag(_evt: DragEvent){
    dragged.value = false
}

let windowEvent: ((event$: DragEvent | TouchEvent) => void) | undefined = undefined;

function onDrag($event: DragEvent | TouchEvent, resizeStartPosition: [number, number]){

    $event.stopPropagation()


    if (!resizeStartPosition)
        return

    let x, y = 0

    if(($event as DragEvent).pageX)
    {
        x = ($event as DragEvent).pageX
        y = ($event as DragEvent).pageY
    }
    else{
        x = ($event as TouchEvent).touches[0].pageX
        y = ($event as TouchEvent).touches[0].pageY
    }    

    const distance = [x - resizeStartPosition[0], y - resizeStartPosition[1]]
    resizeDistance.value = distance

    resizeDistanceVW.value = [100*distance[0]/window.innerWidth, 100*distance[1]/window.innerWidth]

}

function onResizeStart($event: DragEvent | TouchEvent) {
    $event.stopPropagation()

    let x = 0
    let y = 0

    if(($event as DragEvent).pageX)
    {
        x = ($event as DragEvent).pageX
        y = ($event as DragEvent).pageY

        if(windowEvent)
            window.removeEventListener('dragover', windowEvent)

        windowEvent = ($event: DragEvent | TouchEvent) => onDrag($event, startPos)
        window.addEventListener('dragover', windowEvent)
    }
    else{
        x = ($event as TouchEvent).touches[0].pageX
        y = ($event as TouchEvent).touches[0].pageY

        if(windowEvent)
            window.removeEventListener('dragover', windowEvent)

        windowEvent = ($event: DragEvent | TouchEvent) => onDrag($event, startPos)
        window.addEventListener('touchmove', windowEvent)
    }

    // // Create an empty or transparent image
    // const img = new Image();
    // // img.src = '';
    
    // // Set the drag image to the transparent image
    // $event.dataTransfer?.setDragImage(img, 0, 0);

    currentlyResizing.value = true
    resizeDistance.value = [0, 0]
    resizeDistanceVW.value = [0, 0]

    const startPos: [number, number] = [x, y]
    

}

function onResizeEnd(_$event: DragEvent | TouchEvent) {

    const distance = resizeDistance.value

    const halfTile = tileSizePx.value / 2

    while(Math.abs(distance[0]) > halfTile || Math.abs(distance[1]) > halfTile){

        // Check if the user dragged the element more than half
        // a tile size into either direction.
        // If so try resizing
        if (distance[0] > halfTile) {
            resizeWidget('enlargeHorizontal')
            distance[0] -= tileSizePx.value
        }

        if (distance[0] < -halfTile) {
            resizeWidget('shrinkHorizontal')
            distance[0] += tileSizePx.value
        }

        if (distance[1] > halfTile) {
            resizeWidget('enlargeVertical')
            distance[1] -= tileSizePx.value
        }

        if (distance[1] < -halfTile) {
            resizeWidget('shrinkVertical')
            distance[1] += tileSizePx.value
        }
    }


    currentlyResizing.value = false

    if(windowEvent)
        window.removeEventListener('dragover', windowEvent)
}

let stopHandle: null | WatchStopHandle = null;

watch(slotContent, content => {
    if (!content)
        return;

    const widgetSize = ((content as HTMLElement).firstElementChild as unknown as {'__vnode': VNode})?.__vnode.props?.widgetSize

    if (!widgetSize)
        return;

    if (stopHandle)
        stopHandle()

    stopHandle = watch(widgetSize, s => {
        requestSizeX.value = s.x
        requestSizeY.value = s.y
    })

}, { immediate: true })

</script>

<style lang="scss">

$drag-elem-width: 10px;

.widget-container {

    padding: 0rem;

    position: relative;
}

.resizer {

    touch-action: none;

    position: absolute;

    bottom: 0;
    right: 0;

    cursor: col-resize;

}

</style>