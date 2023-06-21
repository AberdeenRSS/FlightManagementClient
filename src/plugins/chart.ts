import { Chart,  LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, Legend, TimeScale, TimeSeriesScale, _adapters} from 'chart.js'
import 'chartjs-adapter-date-fns';
import annotations from 'chartjs-plugin-annotation'

export function useChartJs(){

    Chart.register(LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, Legend, TimeScale, TimeSeriesScale, annotations)

}