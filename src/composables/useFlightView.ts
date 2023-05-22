import type { AggregationLevels } from "@/helper/timeTree";
import { ref } from "vue";

export type TimeRange = { start: Date, end: Date, cur: Date }

const timeRange = ref<TimeRange | undefined>()
const vesselId = ref<string>('')
const flightId = ref<string>('')
const live = ref<boolean>(false)
const resolution = ref<AggregationLevels | 'smallest'>('minute')

const elementInSettings = ref<[string, string] | undefined>()

export function useFlightViewState() {

    function setElementInSettings(value: [string, string] | undefined){
        elementInSettings.value = value
    }

    return { timeRange, vesselId, flightId, live, resolution, setElementInSettings }
}

export function useProvideFlightView() {

    function setTimeRange(range: TimeRange | undefined) {
        if(!range)
            return
        timeRange.value = range
    }

    function setVesselId(id: string) {
        vesselId.value = id
    }

    function setFlightId(id: string) {
        flightId.value = id
    }

    function setLive(l: boolean) {
        live.value = l
    }

    function setResolution(value: AggregationLevels | 'smallest') {
        resolution.value = value
    }

    return { setTimeRange, setVesselId, setFlightId, setLive, setResolution, elementInSettings }

}