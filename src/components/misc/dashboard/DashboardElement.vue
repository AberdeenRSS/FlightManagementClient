<template>
    <div :draggable="true" @dragstart="startDrag" class="widged-cotnainer" :style="`width: ${tileSize * sizeX}vw; height: ${tileSize * sizeY}vw;`">
        <span ref="slotContent">
            <slot ></slot>
        </span>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, toRefs, useSlots, onRenderTracked, type VNode, type VNodeRef, onMounted, onRenderTriggered, watch, type WatchStopHandle } from 'vue';

const slotContent = ref<VNodeRef | null>(null)

const props = defineProps({
    id: {
        type: String,
        required: true
    },
    gridColumns: {
        type: Number,
        required: true
    },
    gridMargin: {
        type: Number,
        default: 0
    }
})

const { gridColumns, gridMargin, id } = toRefs(props)

const sizeX = ref(1)
const sizeY = ref(1)

const tileSize = computed(() => (100 - (gridMargin.value * 2)) / gridColumns.value)

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
        
    const widgedSize = ((content as any).firstElementChild?.__vnode as VNode).props?.widgedSize

    if(!widgedSize)
        return;

    if(stopHandle)
        stopHandle()

    stopHandle = watch(widgedSize, s => {
        sizeX.value = s.x
        sizeY.value = s.y
    })

}, {immediate: true})

</script>

<style>
.widged-cotnainer {
   padding: 1rem;
}
</style>