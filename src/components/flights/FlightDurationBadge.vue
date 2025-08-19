<template>
    <v-chip label variant="tonal" :color="getColor">
        {{ formattedDuration }}
    </v-chip>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';


const props = defineProps({
    start: {
        type: String,
        required: true
    },
    end: {
        type: String,
        default: null
    }
})

const currentTime = ref(Date.now())

let intervalId: ReturnType<typeof setInterval> | null = null

const isLive = computed(() => !props.end)

onMounted(() => {
    if (isLive.value) {
        intervalId = setInterval(() => {
            currentTime.value = Date.now()
        }, 1000)
    }
})

onUnmounted(() => {
    if (intervalId !== null) {
        clearInterval(intervalId)
    }
})

const duration = computed(() => {
    const startTime = new Date(props.start).getTime();

    if (props.end) {
        return new Date(props.end).getTime() - startTime;
    } else {
        return currentTime.value - startTime;
    }
})

const formattedDuration = computed(() => {
    const totalSeconds = Math.floor(duration.value / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours === 0 && minutes === 0 && seconds === 0) {
        return '0s';
    }
    if (hours === 0 && minutes === 0) {
        return `${seconds.toString().padStart(2, '0')}s`;
    }
    if (hours === 0) {
        return `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
})

const getColor = computed(() => {
    if (isLive.value) {
        return 'pink';
    } else {
        return 'primary';
    }
})

</script>