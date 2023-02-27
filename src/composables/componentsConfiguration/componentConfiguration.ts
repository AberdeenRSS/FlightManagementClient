export interface FlightDataConfig<T> {

    seriesName: string

}

export interface FlightDataStatusConfig<T> {
    statusColor: (value: T) => string 

    statusText: (value: T) => string
}

export interface ComponentDefinition {
    type: string

    typeName: string

    iconId: string

    flightDataConfig: {[seriesName: string]: FlightDataConfig<any> | (FlightDataConfig<any> & FlightDataStatusConfig<any>)}
}

const configurations: {[id: string]: ComponentDefinition} = {
    'sensor.accelerometer': {
        type: 'sensor.accelerometer',
        typeName: 'Accelerometer',
        iconId: 'mdi-',
        flightDataConfig: {
            'acceleration-x': {
                seriesName: 'Acceleration X'
            },
            'status': {
                seriesName: 'Status',
                statusColor(value: string) {
                    if (value === 'active')
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
