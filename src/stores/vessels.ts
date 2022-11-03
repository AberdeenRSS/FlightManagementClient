import { fetchProtectedResource } from '@/composables/api/rssFlightServerApi';
import { defineStore } from 'pinia'

export type LoadingStates = 'NOT_REQUESTED' | 'REQUESTED' | 'LOADED' | 'ERROR'

export type Vessel = {
  _id: string;
  name: string;
}

export const useVesselStore = defineStore({
  id: 'vessels',
  state: () => ({
    vessels: [] as Vessel[],
    loadingStates: 'NOT_REQUESTED' as LoadingStates
  }),
  getters: {
    getVessels: (state) => state.vessels,
    getLoadingState: (state) => state.loadingStates
  },
  actions: {
    async fetchVesselsIfNecessary() {

      // Return if the data was already successfully requested
      if(this.loadingStates !== 'NOT_REQUESTED' && this.loadingStates !== 'ERROR')
        return;

      this.loadingStates = 'REQUESTED'

      try {
        const data = await fetchProtectedResource('/vessel/get_all')
        this.vessels = data.data
        this.loadingStates = 'LOADED'
      }
      catch (error) {
        this.loadingStates = 'ERROR'
        console.log(error)
      }
    }
  }
})
