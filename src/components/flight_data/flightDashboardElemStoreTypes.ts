import { ref, toRef, watch, type Ref } from "vue"
import { useDashboardWidgetStore } from "../misc/dashboard/DashboardComposable"

export type FlightDashboardWidgetData = {
    selectedParts: {[id: string]: boolean},
    selectedSeries: string,
    selectedSeriesMulti: {[index: string]: string}
    selectedView: string,
    inSettings: boolean,
    commandDispatchSelectedCommandType: string | undefined,
    graphSeriesSetting: { [series: string]: { enabled: boolean, minMaxEnabled: boolean } }
}

export function  useWidgetData(widgetID: [string, string]){
    const {widget} = useDashboardWidgetStore(widgetID)

    return toRef(widget.value!, 'data') as Ref<FlightDashboardWidgetData>
}

export function useSelectedPart(widgetID: [string, string]){

    const widgetData = useWidgetData(widgetID)

    const selected = ref<string | undefined>(undefined)

    function onPartsSelected(data: FlightDashboardWidgetData) {

        const newSelected = Object.keys(data.selectedParts).filter(k => data.selectedParts[k])
    
        if (newSelected.length < 1) {
            if(selected.value !== undefined)
                selected.value = undefined
            return
        }

        if(selected.value !== newSelected[0])
            selected.value = newSelected[0]
    
    }

    watch(widgetData, onPartsSelected, {immediate: true, deep: true})

    return selected


}