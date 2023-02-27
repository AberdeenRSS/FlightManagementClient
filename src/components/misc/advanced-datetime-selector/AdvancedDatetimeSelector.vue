<template>

    <div class="component-root">


        <!-- Container of the entire range selecting bar -->
        <div class="playbar-container">

            <!-- Div element that draws the play bar itself and how the bar is colored in different areas -->
            <div class="playbar" ref="containerRef" @click="dragCurrent($event)" >

                <div class="selected-range" :style="`left: ${(rangeMinInternal) * 100}%; right: ${(1 - rangeMaxInternal) * 100}%;`">
                </div>
            </div>

            <!-- The selectors on the timeline. The position is set to absolute and gets calculated -->
            <div class="min-selector" :style="`left: ${(rangeMinInternal) * 100}%;`" @mouseenter="displayMinPreview++"
                @mouseleave="displayMinPreview--">
                <div :class="'selector-bar' + (displayMinPreview ? ' selector-hover' : '')">
                    <div class="drag-box" @mousedown="onDragMinStart($event)" @touchstart="onDragMinStart($event)"></div>
                </div>
                <div class="time-tooltip" v-if="displayMinPreview > 0">
                    {{ startDateFormatted }}
                </div>
            </div>

            <div class="current-selector" :style="`left: ${(currentInternal) * 100}%;`" @mouseenter="displayCurrentPreview++"
                @mouseleave="displayCurrentPreview--">
                <div :class="'selector-bar' + (displayCurrentPreview ? ' selector-hover' : '')">
                    <div class="drag-box" @mousedown="onDragCurStart($event)" @touchstart="onDragCurStart($event)"></div>
                </div>
                <div class="time-tooltip" v-if="displayCurrentPreview > 0">
                    {{ currentDateFormatted }}
                </div>
            </div>

            <div class="max-selector" :style="`right: ${(1 - rangeMaxInternal) * 100}%;`" @mouseenter="displayMaxPreview++"
                @mouseleave="displayMaxPreview--">
                <div class="drag-box" @mousedown="onDragMaxStart($event)" @touchstart="onDragMaxStart($event)"></div>
                <div :class="'selector-bar' + (displayMaxPreview ? ' selector-hover' : '')"></div>
                <div class="time-tooltip" v-if="displayMaxPreview > 0">
                    {{ endDateFormatted }}
                </div>
            </div>

        </div>

        <div class="menu">

            <div class="nav-elem align-start">
                <v-btn variant="plain" :ripple="false" :rounded="0" :icon="playing ? 'mdi-pause' : 'mdi-play'"
                    @click="onPlay()"></v-btn>
            </div>

            <div class="nav-elem-end">
                <v-btn variant="plain" :ripple="false" :rounded="0" :color="live ? 'red-darken-3' : 'grey'"
                    @click="onLive()">Live</v-btn>
            </div>

            <div class="nav-elem justify-start">
                <v-menu>
                    <template v-slot:activator="{ props }">
                        <v-btn variant="plain" :disabled="live" :ripple="false" :rounded="0" color="dark"
                            v-bind="props">
                            {{ speed }}x
                        </v-btn>
                    </template>
                    <v-list :value="speed">
                        <v-list-item v-for="(item, index) in speeds" :key="index" :value="index">
                            <v-list-item-title :disabled="live" @click="speed = item">{{ item }}x</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-menu>
            </div>

            <div class="nav-elem time">
                {{ currentDateFormatted }}
            </div>


        </div>
    </div>





</template>

<script lang="ts" setup>
import { debouncedWatch, formatDate, hasOwn, timestamp, toRefs } from '@vueuse/core';
import { computed, ref, watch, type VNodeRef, onUnmounted } from 'vue';

type TouchOrMouseEvent = TouchEvent | MouseEvent;

const isTouchEvent = ($event: TouchOrMouseEvent): $event is TouchEvent => !!($event as TouchEvent).touches

const speeds = [0.5, 1, 1.5, 2, 5, 10, 20, 50, 100]
const speed = ref(1)

const playing = ref(false)
const live = ref(false)

const rangeMinInternal = ref(0.1)
const rangeMaxInternal = ref(0.9)
const currentInternal = ref(0.2)

const rangeMinDate = ref(new Date())
const rangeMaxDate = ref(new Date())
const currentDate = ref(new Date())

const displayMinPreview = ref(0)
const displayCurrentPreview = ref(0)
const displayMaxPreview = ref(0)

const draggingRangeMin = ref(false)
const draggingRangeMax = ref(false)
const draggingCurrent = ref(false)


const containerRef = ref<VNodeRef | undefined>(undefined);
const destroyed = ref(false);

const props = defineProps({
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    rangeMin: {
        type: Number,
        default: 0.1
    },
    rangeMax: {
        type: Number,
        default: 0.9
    },
    current: {
        type: Number,
        default: 0.5
    }
})
const { startDate, endDate, rangeMin, rangeMax, current } = toRefs(props)


rangeMinInternal.value = rangeMin.value
rangeMaxInternal.value = rangeMax.value
currentInternal.value = current.value

const emit = defineEmits<{
  (event: 'rangeMinDate', date: Date): void,
  (event: 'rangeMaxDate', date: Date): void,
  (event: 'currentDate', date: Date): void,
}>()

watch(rangeMinDate, d => setTimeout(() => emit('rangeMinDate', d), 0))
watch(rangeMaxDate, d => setTimeout(() => emit('rangeMaxDate', d), 0))
watch(currentDate,  d => setTimeout(() => emit('currentDate', d), 0))

// #region Computed values

watch([startDate, endDate, rangeMinInternal], ([sD, eD, value]) => {
    rangeMinDate.value = calculateDatetime(sD, eD, value)
}, { immediate: true, })

watch([startDate, endDate, rangeMaxInternal], ([sD, eD, value]) => {
    rangeMaxDate.value = calculateDatetime(sD, eD, value)
}, { immediate: true, })

watch([startDate, endDate, currentInternal], ([sD, eD, value]) => {
    currentDate.value = calculateDatetime(sD, eD, value)
}, { immediate: true, })

const startDateFormatted = computed(() => formatDate(rangeMinDate.value, 'HH:mm:ss DD.MM.YYYY'))
const endDateFormatted = computed(() => formatDate(rangeMaxDate.value, 'HH:mm:ss DD.MM.YYYY'))
const currentDateFormatted = computed(() => formatDate(currentDate.value, 'HH:mm:ss DD.MM.YYYY'))

// #endregion

//#region Time advancing

// Offset of the current marker to now. This will be used to
// keep the scrubber at a constant offset to this time. This
// is better than trying to figure out how much time has passed
// between the frames, as this avoids rounding errors and ensures
// 1. That time is actually advancing at real speed
// 2. That the offset will stay the same event if the time cannot due to the end being reached
// Note: positive for values before now
let timeOffsetCurrent = 0
let timeOffsetMinRange = 0
let timeOffsetMaxRange = 0

function setTimeOffset() {
    timeOffsetCurrent = Date.now() - currentDate.value.getTime()
    timeOffsetMinRange = Date.now() - rangeMinDate.value.getTime()
    timeOffsetMaxRange = Date.now() - rangeMaxDate.value.getTime()
}

setTimeOffset()

function play(_: any) {

    advanceTime()

    if (!destroyed.value)
        requestAnimationFrame(play)
}

let timeOfLastAdvance: number | undefined = undefined

function advanceTime() {

    if (displayCurrentPreview.value)
        return

    const previousTime = timeOfLastAdvance
    timeOfLastAdvance = Date.now()

    if (!previousTime && speed.value !== 1)
        return

    const timeStep = (timeOfLastAdvance - (previousTime ?? 0)) * speed.value

    const newTime = speed.value === 1 ?
        Date.now() - timeOffsetCurrent
        : currentDate.value.getTime() + timeStep

    const nextDate = calculateRelative(startDate.value, endDate.value, new Date(newTime))

    if (playing.value && nextDate < rangeMaxInternal.value && nextDate <= 1) {
        currentInternal.value = nextDate
    }

    const nextRangeMin = calculateRelative(startDate.value, endDate.value, new Date(Date.now() - timeOffsetMinRange))
    const nextRangeMax = calculateRelative(startDate.value, endDate.value, new Date(Date.now() - timeOffsetMaxRange))

    if (live.value && nextRangeMin <= currentInternal.value)
        rangeMinInternal.value = nextRangeMin

    if (live.value && nextRangeMax <= 1)
        rangeMaxInternal.value = nextRangeMax
}

function calculateDatetime(startDate: Date, endDate: Date, relativeValue: number) {
    const range = endDate.getTime() - startDate.getTime()

    return new Date(startDate.getTime() + (range * relativeValue))
}

function calculateRelative(startDate: Date, endDate: Date, date: Date) {
    const range = endDate.getTime() - startDate.getTime()
    const timeSinceStart = date.getTime() - startDate.getTime()
    return timeSinceStart / range
}

/**
 * Figures out where along the playbar the given
 * position is in percent. Values get clamped between 0 and 1
 * 
 * @param xPosition the pixel value to calculate the relative position for
 */
function getRelativeTimelinePosition(xPosition: number) {
    const boundingBox = containerRef.value.getBoundingClientRect() as DOMRect

    const width = boundingBox.width; // The overall width of the slider
    const left = xPosition - boundingBox.x; // The distance between the mouse and the left side of the slider

    let percentage = left / width
    if (percentage > 1)
        percentage = 1
    if (percentage < 0)
        percentage = 0
    return percentage;
}

//#endregion

// #region UI events



function onMouseMove($event: TouchOrMouseEvent){
    onDragMin($event)
    onDragMax($event)
    onDragCur($event)
}

function onMouseUp($event: TouchOrMouseEvent){
    onDragMinEnd($event)
    onDragMaxEnd($event)
    onDragCurEnd($event)
}

window.addEventListener('mousemove', onMouseMove)
window.addEventListener('mouseup', onMouseUp)

// window.addEventListener('mousedown', () => console.log('onmousedown'))

// window.addEventListener('mousemove', () => console.log('onmouse'))
// window.addEventListener('mouseup', () => console.log('onmouseup'))

window.addEventListener('touchmove', onMouseMove)
window.addEventListener('touchend', onMouseUp)
window.addEventListener('touchcancel', onMouseUp)


function onPlay() {
    playing.value = !playing.value;
    setTimeOffset()
}

function onLive() {
    live.value = !live.value
    setTimeOffset()

    if (live.value)
        speed.value = 1
}
function onDragMinStart($event: TouchOrMouseEvent) {


    displayMinPreview.value++
    draggingRangeMin.value = true
}
function onDragMin($event: TouchOrMouseEvent) {
    if(!draggingRangeMin.value)
        return
    dragMin($event)
}
function onDragMinEnd($event: TouchOrMouseEvent) {
    if(!draggingRangeMin.value)
        return
    displayMinPreview.value--
    draggingRangeMin.value = false
    dragMin($event)
}
function onDragMaxStart($event: TouchOrMouseEvent) {
    displayMaxPreview.value++
    draggingRangeMax.value = true
}
function onDragMax($event: TouchOrMouseEvent) {
    if(!draggingRangeMax.value)
        return
    dragMax($event)
}
function onDragMaxEnd($event: TouchOrMouseEvent) {
    if(!draggingRangeMax.value)
        return
    displayMaxPreview.value--
    draggingRangeMax.value = false
    dragMax($event)
}

function onDragCurStart($event: TouchOrMouseEvent) {
    displayCurrentPreview.value++
    draggingCurrent.value = true
}
function onDragCur($event: TouchOrMouseEvent) {
    if(!draggingCurrent.value)
        return
    dragCurrent($event)
}
function onDragCurEnd($event: TouchOrMouseEvent) {
    if(!draggingCurrent.value)
        return
    displayCurrentPreview.value--
    draggingCurrent.value = false
    dragCurrent($event)
}

//#endregion

// #region Dragging handlers

function dragMin($event: TouchOrMouseEvent) {

    if (!containerRef.value)
        return

    const positionX = isTouchEvent($event) ? $event.touches?.[0]?.pageX : $event.pageX

    if(!positionX)
        return

    let percentage = getRelativeTimelinePosition(positionX)

    if (percentage > rangeMaxInternal.value)
        percentage = rangeMaxInternal.value

    rangeMinInternal.value = percentage
    if (currentInternal.value < percentage)
        currentInternal.value = percentage

    setTimeOffset()
}

function dragCurrent($event: TouchOrMouseEvent) {

    if (!containerRef.value)
        return

    const positionX = isTouchEvent($event) ? $event.touches?.[0]?.pageX : $event.pageX

    if(!positionX)
        return

    // Fixes bug of elements snapping bag to the start
    // if ($event.x <= 0)
    //     return

    const percentage = getRelativeTimelinePosition(positionX)

    currentInternal.value = percentage
    if (rangeMinInternal.value > percentage)
        rangeMinInternal.value = percentage
    if (rangeMaxInternal.value < percentage)
        rangeMaxInternal.value = percentage

    setTimeOffset()
}

function dragMax($event: TouchOrMouseEvent) {

    if (!containerRef.value)
        return

    const positionX = isTouchEvent($event) ? $event.touches?.[0]?.pageX : $event.pageX

    if(!positionX)
        return

    let percentage = getRelativeTimelinePosition(positionX)

    if (percentage < rangeMinInternal.value)
        percentage = rangeMinInternal.value

    rangeMaxInternal.value = percentage
    if (currentInternal.value > percentage)
        currentInternal.value = percentage

    setTimeOffset()
}

//#endregion

//#region Lifetime

requestAnimationFrame(play)

onUnmounted(() => {
    destroyed.value = true
})

//#endregion

</script>

<style lang="scss">
$range-select-color: black;
$playbar-color: lightgray;

.component-root {
    padding: 1rem 4rem;

    @media screen and (max-width: 600px) {

        padding: 1rem 1rem;

    }

    .menu {
        display: flex;
        flex-flow: wrap;
        flex-direction: row;
        align-items: center;
        justify-content: start;
        gap: 1rem;
        padding-top: 1rem;
        padding-left: 2rem;
        padding-right: 2rem;
    }

    .nav-elem {}

    .time {
        flex-shrink: 0;
        justify-self: end;
        flex-grow: 8;
        text-align: end;
    }

    .playbar-container {

        // width: 100%;
        height: 2rem;
        position: relative;
        // flex-grow: 8;

        display: flex;
        align-items: center;
        justify-content: center;
    }

    .playbar {
        background-color: $playbar-color;

        width: 100%;
        height: 20%;

        position: relative;
    }

    .selected-range {
        position: absolute;
        background-color: $range-select-color;
        height: 100%;
    }

    .drag-box {
        opacity: 0;
        width: 1rem;
        height: 100%;
        position: absolute;
        cursor: pointer;
        z-index: 600;
    }



    .selector {
        position: absolute;
        z-index: 500;
        height: 100%;

        display: flex;
        justify-content: center;
        align-items: center;

        // -webkit-user-select: none;
        // -moz-user-select: none;
        // -ms-user-select: none;
        user-select: none;

        .time-tooltip {
            background-color: white;
            position: absolute;
            transform: translateY(100%);
            bottom: 0;
            width: 10rem;
            justify-content: center;
            text-align: center;
            z-index: 501;

        }



    }

    .selector-hover {

            filter: invert(20%);
    }

    .min-selector {
        @extend .selector;

        .drag-box {
            left: 0;
        }

        .selector-bar {
            // background-color: red;

            transform: translateX(-10%);

            background-image: url('@/assets/playbar-range-left.svg');
            background-repeat: no-repeat;
            background-size: contain;
            height: 100%;
            aspect-ratio: 1;

        }
    }

    .max-selector {
        @extend .selector;

        .drag-box {
            right: 0;
        }

        .selector-bar {
            // background-color: red;
            background-image: url('@/assets/playbar-range-right.svg');
            background-repeat: no-repeat;
            background-size: contain;
            height: 100%;
            aspect-ratio: 1;
        }
    }

    .current-selector {
        @extend .selector;

        .drag-box {
            position: absolute;
            top: 0;
            left: 0;

            transform: scaleY(300%);
        }


        .selector-bar {
            position: relative;
            transform: translateX(-50%);

            z-index: 502;

            background-color: $range-select-color;
            height: 40%;
            // width: 2rem;
            aspect-ratio: 1;
            padding-top: 100%;
            border-radius: 5rem;
            border-style: solid;
            border-width: 1px;
            border-color: invert($range-select-color);

        }
    }
}
</style>