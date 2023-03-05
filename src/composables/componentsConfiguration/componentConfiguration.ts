import type { MeasurementTypes } from "@/stores/flight_data"
import { rgb } from "color"

export interface FlightDataConfig<T extends MeasurementTypes> {

    seriesName: string

    statusColor?: (value: T) => string 

    statusText?: (value: T) => string

}

export interface ComponentDefinition {
    type: string

    typeName: string

    iconId: string

    flightDataConfig: {[seriesName: string]: FlightDataConfig<any>}
}

const configurations: {[id: string]: ComponentDefinition} = {
    'Sensor.Accelerometer': {
        type: 'Sensor.Accelerometer',
        typeName: 'Accelerometer',
        iconId: 'mdi-chip',
        flightDataConfig: {
            'acceleration-x': {
                seriesName: 'Acceleration X',
                statusColor(value: number) {
                    return rgb(255, 255, value).hex()
                },
                statusText(value: number){
                    return value.toPrecision(3)
                }
            },
            'state': {
                seriesName: 'Status',
                statusColor(value: string) {
                    if (value === 'Active')
                        return '#00dd00'
                    return '#ff0000'
                },
                statusText(value: string){
                    return value.toUpperCase()
                }
            }
        }
    }
}

export function useComponentConfiguration(){

    return { configurations }
}
