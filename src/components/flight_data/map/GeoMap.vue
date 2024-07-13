<template>
    <div ref="mapContainer" style="width: 100%; height: 100%;">

    </div>
</template>

<style lang="scss"></style>

<script setup lang="ts">
import { inject, ref, shallowRef, watch } from 'vue';
import L from 'leaflet'
import { DASHBOARD_WIDGET_ID } from '@/components/misc/dashboard/DashboardComposable';
import { useSelectedPart, useWidgetData } from '../flightDashboardElemStoreTypes';
import { useFlightViewState } from '@/composables/useFlightView';
import { fromImmediate, useObservableShallow } from '@/helper/reactivity';
import { throttleTime, map, combineLatest, switchMap, of, filter } from 'rxjs'
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { getPart } from '@/stores/vessels';
import { useFlightDataStore } from '@/stores/flight_data';
import { getClosest } from '@/helper/timeTree';
import rocket_iconUrl from '@/assets/rocket_icon.svg?url'

const mapContainer = ref<HTMLElement>()

const dashboardWidgetId = inject(DASHBOARD_WIDGET_ID)
if (!dashboardWidgetId)
    throw new Error('Flight Status not used in within a dashboard')

const { vesselId, flightId, timeRange, resolution } = useFlightViewState()

const widgetData = useWidgetData(dashboardWidgetId!)
if (!widgetData.value.selectedSeriesMulti)
    widgetData.value.selectedSeriesMulti = {}

const throttledTimeRange$ = fromImmediate(timeRange, true).pipe(throttleTime(20))

const { vessel$ } = getFlightAndHistoricVessel(vesselId, flightId)

const selectedPartId = useSelectedPart(dashboardWidgetId)
const selectedPart$ = getPart(vessel$, selectedPartId)

const series$ = fromImmediate(widgetData).pipe(
    map(d => ({
        lat: d.selectedSeriesMulti['lat'],
        lon: d.selectedSeriesMulti['lon'],
    })),
    filter(s => !!s.lat && !!s.lon)
)

const { getOrInitStore } = useFlightDataStore()

const flightData$ = combineLatest([selectedPart$, fromImmediate(flightId)]).pipe(
    switchMap(([part, flightId]) => part && flightId ? fromImmediate(getOrInitStore(flightId, part._id)) : of(undefined)),
)

const res$ = fromImmediate(resolution).pipe(map(r => r === 'smallest' ? undefined : r))

const measurement$ = combineLatest([flightData$, throttledTimeRange$, res$, series$]).pipe(
    map(([store, range, r, s]) => store && range ? getClosest(store.measurements, range.cur, r, (data) => !!data.measurements_aggregated[s.lat] && !!data.measurements_aggregated[s.lon]) : undefined)
)

const values$ = combineLatest([measurement$, series$]).pipe(
    map(([measurement, series]) => ({
        lat: measurement?.measurements_aggregated[series.lat]?.[0],
        lon: measurement?.measurements_aggregated[series.lon]?.[0],
    }))
)

const geoPosition = useObservableShallow(values$)

const leafletMap = shallowRef<L.Map>()
const rocketMapMarker = shallowRef<L.Marker>()

watch(mapContainer, c => {

    if (!c)
        return

    if (leafletMap.value)
        leafletMap.value.remove()

    leafletMap.value = L.map(c).setView([51.505, -0.09], 13);


}, { immediate: true })

watch(leafletMap, map => {

    if (!map)
        return

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const marker = L.marker([0, 0])

    const icon = L.icon({
        iconUrl: rocket_iconUrl,
        iconSize:     [38, 95], // size of the icon
        iconAnchor:   [0, 0], // point of the icon which will correspond to marker's location
    });

    marker.setIcon(icon)

    rocketMapMarker.value = marker.addTo(map)

}, { immediate: true })

let oldPos: [number, number] | undefined

watch([geoPosition, rocketMapMarker, leafletMap], ([geoPos, marker, map]) => {

    if(!geoPos || !geoPos.lat || !geoPos.lon || !marker || !map)
        return

    const pos: [number, number] = [geoPos.lat, geoPos.lon]

    marker.setLatLng(pos)


    if(!oldPos || Math.sqrt((pos[0]-oldPos[0])^2 + (pos[1]-oldPos[1])^2) > 0.01)
        map.flyTo(pos)

    oldPos = pos

}, {immediate: true})


</script>
