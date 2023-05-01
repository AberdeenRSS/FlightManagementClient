import { fetchRssApi } from '@/composables/api/rssFlightServerApi';
import { defineStore } from 'pinia'
import { computed, reactive, ref, type Ref } from 'vue';
import { waitUntil } from '@/helper/reactivity'
import { until } from '@vueuse/core';

export const useVesselStore = defineStore({
    id: 'vessels',
    
    state: () => ({
        vessels: {} as { [index: string]: StoreObject },
        vesselsHistoric: {} as { [index: string]: StoreObject },
        loadingStates: 'NOT_REQUESTED' as LoadingStates
    }),
    getters: {
        getVessels: (state) => state.vessels,
        getVessel: (state) => (id: string) => state.vessels[id]?.entity,
        getVesselState: (state) => (id: string) => state.vessels[id],
        getLoadingState: (state) => state.loadingStates
    },
    actions: {
        async fetchVesselsIfNecessary() {

            // Return if the data was already successfully requested
            if (this.loadingStates !== 'NOT_REQUESTED' && this.loadingStates !== 'ERROR')
                return;

            this.loadingStates = 'REQUESTED'

            const { data, error, isFinished } = await fetchRssApi('/vessel/get_all')

            await until(isFinished).toBe(true)

            if (error.value) {
                this.loadingStates = 'ERROR'
                console.log(error)
                return
            }

            JSON.parse(data.value as string).forEach((v: Vessel) => {

                // Don't overwrite vessels already loaded
                if (this.vessels[v._id])
                    return

                this.vessels[v._id] = {
                    entity: v,
                    loadingDetails: 'LOADED'
                }
            });

            this.loadingStates = 'LOADED'

        },
        async fetchHistoricVessel(id: string, version: number) {

            const key = `${id}*${version}`
            let storeObject = this.vesselsHistoric[key]

            if(!storeObject)
                storeObject = this.vesselsHistoric[key] = {loadingDetails: 'NOT_REQUESTED', entity: null}

            // Return if the data was already successfully requested
            if (storeObject.loadingDetails !== 'NOT_REQUESTED' && storeObject.loadingDetails !== 'ERROR')
                return;

            storeObject.loadingDetails = 'REQUESTED'

            const { data, error, isFinished } = await fetchRssApi(`/vessel/get/${id}/${version}`)

            await until(isFinished).toBe(true)

            if (error.value) {
                storeObject.loadingDetails = 'ERROR'
                console.log(error)
                return
            }

            const vessel = JSON.parse(data.value as string) as Vessel

            storeObject.entity = vessel
            storeObject.loadingDetails = 'LOADED'

        }
    }
})

export function getVesselHistoric(store: ReturnType<typeof useVesselStore>, id: string, version: number){

    const historic = ref<StoreObject | null>(store.$state.vesselsHistoric[`${id}*${version}`])

    store.$subscribe(s => historic.value = store.$state.vesselsHistoric[`${id}*${version}`])

    return historic
}

export type LoadingStates =
    'NOT_REQUESTED'
    | 'REQUESTED'
    | 'LOADED'
    | 'ERROR'

function shouldRequest(l: LoadingStates) {
    return l === 'NOT_REQUESTED' || l === 'ERROR'
}

export type Vessel = {
    _id: string;
    name: string;
    _version: number;
    parts: VesselPart[];
}

export type VesselPart = {

    _id: string;


    name: string;

    part_type: string;

    virtual: boolean;

    parent?: string;
}

type StoreObject = {
    entity: Vessel | null,
    loadingDetails: LoadingStates
}


