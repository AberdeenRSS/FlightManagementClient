import { fetchRssApi } from '@/composables/api/rssFlightServerApi';
import { defineStore } from 'pinia'
import { computed, reactive, ref, type Ref } from 'vue';
import { waitUntil } from '@/helper/reactivity'
import { until } from '@vueuse/core';

export const useVesselStore = defineStore({
  id: 'vessels',
  state: () => ({
    vessels: {} as {[index: string]: StoreObject},
    loadingStates: 'NOT_REQUESTED' as LoadingStates
  }),
  getters: {
    getVessels: (state) => state.vessels,
    getVessel: (state) => (id: string) => state.vessels[id]?.entity,
    getLoadingState: (state) => state.loadingStates
  },
  actions: {
    async fetchVesselsIfNecessary() {

      // Return if the data was already successfully requested
      if(this.loadingStates !== 'NOT_REQUESTED' && this.loadingStates !== 'ERROR')
        return;

      this.loadingStates = 'REQUESTED'

      const { data, error, isFinished } = await fetchRssApi('/vessel/get_all')

      await until(isFinished).toBe(true)

      if(error.value){
        this.loadingStates = 'ERROR'
        console.log(error)
        return
      }

      JSON.parse(data.value as string).forEach((v: Vessel) => {

        // Don't overwrite vessels already loaded
        if(this.vessels[v._id])
          return

        this.vessels[v._id] = {
          entity: v,
          loadingDetails: 'LOADED'
        }
      });
      
      this.loadingStates = 'LOADED'

      
    }
  }
})

export type LoadingStates = 
    'NOT_REQUESTED'
  | 'REQUESTED'
  | 'LOADED'
  | 'ERROR'

function shouldRequest(l: LoadingStates){
  return l === 'NOT_REQUESTED' || l === 'ERROR'
}

export type Vessel = {
  _id: string;
  name: string;
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


