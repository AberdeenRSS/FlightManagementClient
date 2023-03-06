<template>
    <div :draggable="true" @dragstart="startDrag" class="widget-cotnainer" :style="`width: ${tileSize * sizeX}vw; height: ${tileSize * sizeY}vw;`">
        <span ref="slotContent">
            <slot ></slot>
        </span>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRefs, type VNode, type VNodeRef,  watch, type WatchStopHandle, provide } from 'vue';
import { DASHBOARD_ID, DASHBOARD_WIDGET_ID } from './DashboardComposable';

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
  (event: 'requestResize', selectedParts: {sizeX: number, sizeY: number}): void
}>()

const { gridColumns, gridMargin, id, dashboardId } = toRefs(props)

provide(DASHBOARD_ID, dashboardId.value)
provide(DASHBOARD_WIDGET_ID, [dashboardId.value, id.value])

const requestSizeX = ref(1)
const requestSizeY = ref(1)
watch([requestSizeX, requestSizeY], ([reqX, reqY]) => emit('requestResize', {sizeX: reqX, sizeY: reqY}))

const tileSize = computed(() => (100 - (gridMargin.value * 2)) / gridColumns.value)

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

let stopHandle: null | WatchStopHandle = null;

watch(slotContent, content => {
    if(!content)
        return;
        
    const widgetSize = ((content as any).firstElementChild?.__vnode as VNode).props?.widgetSize

    if(!widgetSize)
        return;

    if(stopHandle)
        stopHandle()

    stopHandle = watch(widgetSize, s => {
        requestSizeX.value = s.x
        requestSizeY.value = s.y
    })

}, {immediate: true})

</script>

<style>
.widget-cotnainer {
   padding: 0rem;
}
</style>