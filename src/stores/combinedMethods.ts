import { asObservable, type MaybeReactive } from "@/helper/reactivity"
import { filter, shareReplay, switchMap } from "rxjs"
import { getFlight } from "./flight"
import { getVesselHistoric } from "./vessels"

export function getFlightAndHistoricVessel(vesselId: MaybeReactive<string>, flightId: MaybeReactive<string> ){
    
    const flight$ = getFlight(asObservable(vesselId), asObservable(flightId)).pipe(shareReplay())


    const vessel$ = flight$.pipe(
        filter(f => !!f),
        switchMap(f => getVesselHistoric(f!._vessel_id, f!._vessel_version)),
    ).pipe(shareReplay())

    return {flight$, vessel$}
}