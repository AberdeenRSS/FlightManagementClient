import { fetchRssApi } from '@/composables/api/rssFlightServerApi';
import { asObservable, fromImmediate, type MaybeReactive } from '@/helper/reactivity';
import { until } from '@vueuse/core';
import { from } from '@vueuse/rxjs';
import { combineLatest, map, shareReplay, switchMap, type Observable } from 'rxjs';
import { shallowRef, triggerRef } from 'vue';

export const state = shallowRef({
    vessels: {} as { [index: string]: StoreObject },
    vesselsHistoric: {} as { [index: string]: StoreObject },
    loadingStates: 'NOT_REQUESTED' as LoadingStates
})

export function getVessels() {
    return from(state, { immediate: true }).pipe(map(s => s.vessels))
}

export function getVessel(id$: MaybeReactive<string>) {

    return combineLatest([from(state, { immediate: true }), asObservable(id$)]).pipe(
        map(([s, id]) => s.vessels[id]?.entity),
        shareReplay()
    )
}

export function getPart(vessel$: Observable<Vessel | null>, partId$: MaybeReactive<string | undefined>){
    return combineLatest([vessel$, asObservable(partId$)]).pipe(
        map(([vessel, partId]) => vessel?.parts.find(p => p._id === partId))
    )
}

export function getVesselState(id$: MaybeReactive<string>) {

    return combineLatest([from(state, { immediate: true }), asObservable(id$)]).pipe(
        map(([s, id]) => s.vessels[id]))
}

export function getVesselMaybeHistoric(id$: MaybeReactive<string>, version$?: MaybeReactive<number | undefined>){
    if(version$)
        return asObservable(version$).pipe(
            switchMap(v => v ? getVesselHistoric(id$, v) : getVessel(id$)),
            shareReplay()
        )
    
    return getVessel(id$)
}

export function getVesselHistoric(id$: MaybeReactive<string>, version$: MaybeReactive<number>) {

    return combineLatest([fromImmediate(state), asObservable(id$), asObservable(version$)]).pipe(
        map(([s, id, version]) => s.vesselsHistoric[`${id}*${version}`]?.entity),
        shareReplay()
    )
}

export function getLoadingState() {

    return from(state, { immediate: true }).pipe(map(s => s.loadingStates))
}

export async function fetchVesselsIfNecessary() {

    // Return if the data was already successfully requested
    if (state.value.loadingStates !== 'NOT_REQUESTED' && state.value.loadingStates !== 'ERROR')
        return;

    state.value.loadingStates = 'REQUESTED'

    const { data, error, isFinished } = await fetchRssApi('/vessel/get_all')

    await until(isFinished).toBe(true)

    if (error.value) {
        state.value.loadingStates = 'ERROR'
        console.log(error)
        return
    }

    JSON.parse(data.value as string).forEach((v: Vessel) => {

        // Don't overwrite vessels already loaded
        if (state.value.vessels[v._id])
            return

        state.value.vessels[v._id] = {
            entity: v,
            loadingDetails: 'LOADED'
        }
    });

    state.value.loadingStates = 'LOADED'

    triggerRef(state)

}

export async function fetchHistoricVessel(id: string, version: number) {

    const key = `${id}*${version}`
    let storeObject = state.value.vesselsHistoric[key]

    if (!storeObject)
        storeObject = state.value.vesselsHistoric[key] = { loadingDetails: 'NOT_REQUESTED', entity: null }

    // Return if the data was already successfully requested
    if (storeObject.loadingDetails !== 'NOT_REQUESTED' && storeObject.loadingDetails !== 'ERROR')
        return;

    storeObject.loadingDetails = 'REQUESTED'

    const { data, error, isFinished } = await fetchRssApi(`/vessel/get/${id}/${version}`)

    await until(isFinished).toBe(true)

    if (error.value) {
        storeObject.loadingDetails = 'ERROR'
        console.log(error)
        triggerRef(state)
        return
    }

    const vessel = JSON.parse(data.value as string) as Vessel

    storeObject.entity = vessel
    storeObject.loadingDetails = 'LOADED'
    
    triggerRef(state)

}

export type LoadingStates =
    'NOT_REQUESTED'
    | 'REQUESTED'
    | 'LOADED'
    | 'ERROR'

export type Vessel = {
    _id: string;
    name: string;
    _version: number;
    parts: VesselPart[];
    permissions: Record<string, string>,
    no_auth_permission: string;
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


