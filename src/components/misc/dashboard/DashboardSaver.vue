<template>
    <div class="d-flex justify-space-between dashboard-saver">

        <div class="d-flex justify-space-between" style="flex-grow:1;">
            <v-menu location="top end" :noClickAnimation="true" :transition="false" close-delay="0" open-delay="0"
                v-model="dropdownOpen">

                <template v-slot:activator="{ props }">

                    <v-text-field v-model="dashboardName" id="select-dashboard" variant="underlined" density="compact"
                        v-bind="props" label="Dashboard Name"></v-text-field>
                    <v-btn @click="dropdownOpen = !dropdownOpen" :icon="dropdownOpen ? 'mdi-menu-up' : 'mdi-menu-down'"
                        variant="tonal" :rounded="0" size="small"></v-btn>

                </template>

                <v-list lines="one">
                    <v-list-item v-for="item in availableDashboards" :key="item.id" :title="item.name"
                        :subtitle="(item.isDefault ? 'Default | ' : '') + (item.saved ? 'Saved' : 'Not Saved')" @click="onChangeId(item.id)">

                    </v-list-item>
                </v-list>

            </v-menu>
        </div>


        <v-btn icon="mdi-content-save" :disabled="store?.saved ?? true" :color="store?.saved ? 'green' : 'black'" variant="tonal"
            size="small" :rounded="0" @click="onSave()"></v-btn>

        <v-btn :disabled="!store" :icon="store?.isDefault ? 'mdi-pin-off' : 'mdi-pin'" variant="tonal" size="small" :rounded="0"
            @click="onMakeDefault()"></v-btn>

        <v-btn :disabled="!store" icon="mdi-delete" color="error" variant="tonal" size="small" :rounded="0" @click="onDelete()"></v-btn>

        <div class="d-flex">
            <v-text-field variant="underlined" density="compact" label="Width" v-model="cols" type="number"></v-text-field>
            <v-btn @click="onCreateNew" icon="mdi-plus" variant="tonal" :rounded="0" size="small"></v-btn>

        </div>

    </div>
</template>

<style lang="scss">
.dashboard-saver {
    &>*+* {
        margin-left: 1rem;
    }

    padding: 0 4rem;

    @media screen and (max-width: 800px) {

        padding: 0 1rem;

    }
}
</style>

<script lang="ts" setup>

import { v4 } from 'uuid';
import { ref, toRefs, watch, computed, type Ref, type WatchStopHandle } from 'vue'
import { useDashboardPersistStore, useDashboardStore, type StoreObject } from './DashboardComposable';

const dropdownOpen = ref(false)
const cols = ref(1)

const emit = defineEmits<{
    (event: 'update:modelValue', id: string | undefined): void
}>()

const props = defineProps({
    modelValue: {
        type: String
    }
})

const { modelValue } = toRefs(props)

const { availableDashboards, loadDashboardIndicesFromStorage, saveDashboardIndicesToStorage, saveDashboardToStorage, createNew, makeDefault, deleteDashboard } = useDashboardPersistStore()

loadDashboardIndicesFromStorage()

const currentDashboardId = ref<string | undefined>()

if (modelValue?.value) {
    watch(modelValue, v => {
        currentDashboardId.value = v
    }, { immediate: true })
}

function onChangeId(id: string | undefined) {
    emit('update:modelValue', id)
    currentDashboardId.value = id
}

function onSave() {
    saveDashboardIndicesToStorage()
    if(!currentDashboardId.value)
        return
    saveDashboardToStorage(currentDashboardId.value)
}

function onCreateNew() {
    const id = v4()
    createNew(id, Number(cols.value))
    onChangeId(id)
}

function onMakeDefault() {
    if(!currentDashboardId.value)
        return
    makeDefault(currentDashboardId.value)
    saveDashboardIndicesToStorage()
}

function onDelete() {
    if(!currentDashboardId.value)
        return

    const next = availableDashboards.value.length > 0 ? availableDashboards.value[0].id : undefined
    const old = currentDashboardId.value

    if (next)
        onChangeId(next)

    deleteDashboard(old)

    saveDashboardIndicesToStorage()

}

const store: Ref<StoreObject | undefined> = ref()

let oldWatch: WatchStopHandle | undefined = undefined

watch(currentDashboardId, id => {

    oldWatch?.()

    if(!id){
        store.value = undefined
        return
    }
    const {store: store$} = useDashboardStore(id)

    oldWatch = watch(store$, s => store.value = s, {immediate: true})

}, {immediate: true})

const dashboardName = computed({
    get() {
        
        return store.value?.name ?? ''
    },
    set(value: string) {
        if(store.value)
            store.value.name = value
    }
})

</script>