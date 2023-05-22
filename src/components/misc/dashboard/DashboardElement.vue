<template>
    <div :draggable="true" @dragstart="startDrag" class="widget-container"
        :style="`width: ${tileSize * sizeX}vw; height: ${tileSize * sizeY}vw;`">
        <span ref="slotContent">
            <slot></slot>
        </span>
        <!-- <div class="resizer resizer-left" ></div>
        <div class="resizer resizer-top"></div> -->
        <div class="resizer resizer-right" :draggable="true" @dragend="onResizeEnd"
            @dragstart="$event => onResizeStart($event, 'right')"></div>
        <div class="resizer resizer-bottom" :draggable="true" @dragend="onResizeEnd"
            @dragstart="$event => onResizeStart($event, 'bottom')"></div>

    </div>
</template>

<script lang="ts" setup>
import { computed, provide, ref, toRefs, watch, type Ref, type VNode, type VNodeRef, type WatchStopHandle } from 'vue';
import { DASHBOARD_ID, DASHBOARD_WIDGET_ID, useDashboardWidgetStore, type ResizeInfo } from './DashboardComposable';

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

const { canResize, resizeWidget } = useDashboardWidgetStore([dashboardId.value, id.value])

const requestSizeX = ref(1)
const requestSizeY = ref(1)
watch([requestSizeX, requestSizeY], ([reqX, reqY]) => emit('requestResize', { sizeX: reqX, sizeY: reqY }))

const tileSize = computed(() => (100 - (gridMargin.value * 2)) / gridColumns.value)

const tileSizePx = computed(() => tileSize.value * window.innerWidth / 100)

/**
 * When the component gets dragged the id
 * needs to be set on the data transfer,
 * so the dashboard can know on drop what element
 * needs to be changed
 * @param evt The original drag event
 */
function startDrag(evt: DragEvent) {
    evt.dataTransfer!.dropEffect = 'move';
    evt.dataTransfer!.effectAllowed = 'move';

    // Set the key as the value as the value is only available on drop
    evt.dataTransfer!.setData(`uuid*${id.value}`, id.value);

}


let windowEvent: ((event$: DragEvent) => void) | undefined = undefined;

function onDrag($event: DragEvent, resizeStartPosition: [number, number], direction: 'right' | 'bottom', resizeInfo: Ref<ResizeInfo>){

    if (!resizeStartPosition)
        return

    const distance = [$event.pageX - resizeStartPosition[0], $event.pageY - resizeStartPosition[1]]

    const halfTile = tileSizePx.value / 2

    // Check if the user dragged the element more than half
    // a tile size into either direction.
    // If so try resizing
    if (direction == 'right' && distance[0] > halfTile) {

        if (!resizeInfo.value.enlargeHorizontal)
            return

        resizeStartPosition[0] = $event.pageX + halfTile
        resizeStartPosition[1] = $event.pageY 
        resizeWidget('enlargeHorizontal')
    }

    if (direction == 'right' && distance[0] < -halfTile) {

        if (!resizeInfo.value.shrinkHorizontal)
            return

        resizeStartPosition[0] = $event.pageX - halfTile
        resizeStartPosition[1] = $event.pageY
        resizeWidget('shrinkHorizontal')
    }

    if (direction == 'bottom' && distance[1] > halfTile) {

        if (!resizeInfo.value.enlargeVertical)
            return

        resizeStartPosition[0] = $event.pageX
        resizeStartPosition[1] = $event.pageY + halfTile
        resizeWidget('enlargeVertical')
    }

    if (direction == 'bottom' && distance[1] < -halfTile) {

        if (!resizeInfo.value.shrinkVertical)
            return

        resizeStartPosition[0] = $event.pageX
        resizeStartPosition[1] = $event.pageY - halfTile
        resizeWidget('shrinkVertical')
    }

}

function onResizeStart($event: DragEvent, direction: 'right' | 'bottom') {
    $event.stopPropagation()
    const startPos: [number, number] = [$event.pageX, $event.pageY]
    
    if(windowEvent)
        window.removeEventListener('dragover', windowEvent)

    windowEvent = ($event: DragEvent) => onDrag($event, startPos, direction, canResize)
    window.addEventListener('dragover', windowEvent)
}

function onResizeEnd(_$event: DragEvent) {

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

    &:hover{

        background-color: black;
    }

    position: absolute;
}

.resizer-right {
    height: 100%;
    width: $drag-elem-width;
    top: 0;
    right: 0;

    cursor: col-resize;

}

.resizer-left {
    height: 100%;
    width: $drag-elem-width;
    top: 0;
    left: 0;

    cursor: col-resize;

}

.resizer-top {
    height: $drag-elem-width;
    width: 100%;
    top: 0;
    left: 0;

    cursor: row-resize;

}

.resizer-bottom {
    height: $drag-elem-width;
    width: 100%;
    bottom: 0;
    left: 0;

    cursor: row-resize;
}</style>