<template>

    <div class="justify-space-between dashboard-log">


        <table>
            <tr v-for="(msg, i) of messages" :key="i">
                <td>{{ msg.time }}</td>
                <td><b>{{ msg.partName }}</b></td>
                <td>{{ msg.msg }}</td>
            </tr>
        </table>

    </div>

</template>

<style lang="scss">

.dashboard-log {
    font-family: monospace;
    padding-left: 1em;
    padding-right: 1em;
    max-height: 50vh;
    overflow-y: scroll;
    color: black;
    min-height: 10vh;

    td {
        padding-right: .5em;
    }
}

</style>

<script lang="ts" setup>

import { useFlightViewState } from '@/composables/useFlightView';
import { fromImmediate, useObservableShallow } from '@/helper/reactivity';
import { getValues, type TimeTreeData } from '@/helper/timeTree';
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { useFlightDataStore, type FlightDataState, type MeasurementTypes, type NumericalTypes, type ServerMeasurement } from '@/stores/flight_data';
import { useObservable } from '@vueuse/rxjs';
import { combineLatest, debounceTime, distinct, filter, map, shareReplay, switchMap, tap, throttleTime } from 'rxjs'
import { watch, type ShallowRef } from 'vue';

const { flightId, timeRange, resolution, vesselId, live } = useFlightViewState()
const { flight$, vessel$ } = getFlightAndHistoricVessel(vesselId, flightId)
const { getOrInitStore, fetchFlightDataInTimeFrame } = useFlightDataStore()


const logPartsAndSeries$ = flight$.pipe(
    distinct(f => f?._id),
    filter(f => !!f),
    map(f => 
        Object.keys(f!.measured_parts)
            .map((k, i) => ({k, p: f!.measured_parts[k], i}))
            .filter(({p}) => p.length > 1 && p[1].name === 'log')
            .map(({k, i}) => ({partId: k, series: 'log', i}))
    ),
    shareReplay(1)
)

const fetchTimeRange$ = fromImmediate(timeRange, true).pipe(
    filter(r => !!r),
    map(r => ({start: r!.start, end: r!.end})),
    distinct((r) => `${r?.start}-${r?.end}`),
    debounceTime(500),
)

const throttledTime$ = fromImmediate(timeRange, true).pipe(
    throttleTime(200),
    shareReplay(1)
)

watch([flightId, useObservableShallow(logPartsAndSeries$), useObservableShallow(fetchTimeRange$), resolution, live], ([flight, series, timeRange, res, l]) => {

    // Only fetch data if not live
    if(l)
        return

    if( !series || !timeRange)
        return

    if(res === 'eternity')
        return

    for(const s of series){

        fetchFlightDataInTimeFrame(flight, s.partId, s.series, timeRange.start, timeRange.end, res)
    }
})


const vesselE$ = vessel$.pipe(filter(v => !!v))

const stores$ = combineLatest([logPartsAndSeries$, fromImmediate(flightId), vesselE$]).pipe(
    filter(([series, fid, vessel]) => !!series && !!fid && !!vessel),
    map(([series, fid, vessel]) => series.map(s => [getOrInitStore(fid, s.partId, s.series), vessel!.parts[s.i].name] as [ShallowRef<FlightDataState>, string])),
)

const res$ = fromImmediate(resolution).pipe(map(r => r === 'smallest' ? undefined : r), shareReplay(1))

const messageMeasurements = stores$.pipe(
    switchMap(stores => 
        combineLatest(
            stores.map(([s, partName]) =>
                combineLatest([fromImmediate(s), throttledTime$, res$])
                .pipe(
                    filter(([_, timeRange, res]) => !!timeRange && !!res),
                    map(([store, timeRange, res]) => [getValues(store.measurements, timeRange!.start, timeRange!.end, true, res!), partName] as [((ServerMeasurement & TimeTreeData) | undefined)[], string])
                )
            )
        )
    )
)

const messages$ = messageMeasurements.pipe(
    map(mmmm => mmmm
        .filter(([mmm, _]) => !!mmm)
        .map(([mmm, partName]) => mmm.
            map(mm => [mm!.last]
                .map(m => ({
                    time: m[0]*1000,
                    date: new Date(m[0]*1000),
                    level: (m[1] as NumericalTypes[])[0] as number,
                    msg:  (m[1] as MeasurementTypes[])[1] as string,
                    partName
                }))
            )
        )
        .flat(2)
        .sort((a, b) => a.time - b.time)
        .map(m => ({...m, time: `${m.date.getHours().toLocaleString(undefined, {minimumIntegerDigits:2})}:${m.date.getMinutes().toLocaleString(undefined, {minimumIntegerDigits:2})}:${m.date.getMilliseconds().toLocaleString(undefined, {minimumIntegerDigits:3})}`}))
    )
)

const messages = useObservable(messages$)



</script>