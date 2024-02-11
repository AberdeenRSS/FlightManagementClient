<template>
    <div ref="viewport" style="width: 100%; height: 100%;">

    </div>
</template>
    
<style lang="scss">
.status-box {
    width: 100%;
    height: 100%;
}

.status-text {
    position: relative;
    top: 0;
}

.series-name {
    position: relative;
    bottom: 0;
}
</style>
    
<script lang="ts" setup>

import { inject, ref } from 'vue'
import { DASHBOARD_WIDGET_ID } from '../../misc/dashboard/DashboardComposable';
import { useWidgetData, useSelectedPart } from '../flightDashboardElemStoreTypes';
import { useFlightViewState } from '@/composables/useFlightView';
import { useFlightDataStore } from '@/stores/flight_data';
import { getClosest } from '@/helper/timeTree'
import { fromImmediate, useObservableShallow } from '@/helper/reactivity'
import { getFlightAndHistoricVessel } from '@/stores/combinedMethods';
import { combineLatest, map, of, switchMap, throttleTime } from 'rxjs';
import { getPart } from '@/stores/vessels';

import * as THREE from 'three';
import { useElementSize } from '@vueuse/core';
import { watch } from 'vue';

const viewport = ref<HTMLElement>()

const viewportSize = useElementSize(viewport)

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
        orientationW: d.selectedSeriesMulti['orientation-w'],
        orientationX: d.selectedSeriesMulti['orientation-x'],
        orientationY: d.selectedSeriesMulti['orientation-y'], 
        orientationZ: d.selectedSeriesMulti['orientation-z'],
    }))
)

const { getOrInitStore } = useFlightDataStore()

const flightData$ = combineLatest([selectedPart$, fromImmediate(flightId)]).pipe(
    switchMap(([part, flightId]) => part && flightId ? fromImmediate(getOrInitStore(flightId, part._id)) : of(undefined))
)

const res$ = fromImmediate(resolution).pipe(map(r => r === 'smallest' ? undefined : r))

const measurement$ = combineLatest([flightData$, throttledTimeRange$, res$]).pipe(
    map(([store, range, r]) => store && range ? getClosest(store.measurements, range.cur, r) : undefined)
)

const values$ = combineLatest([measurement$, series$]).pipe(
    map(([measurement, series]) => ({
        orientationW: series.orientationW ? measurement?.measurements_aggregated[series.orientationW]?.[0] : undefined,
        orientationX: series.orientationX ? measurement?.measurements_aggregated[series.orientationX]?.[0] : undefined,
        orientationY: series.orientationY ? measurement?.measurements_aggregated[series.orientationY]?.[0] : undefined,
        orientationZ: series.orientationZ ? measurement?.measurements_aggregated[series.orientationZ]?.[0] : undefined,
    }))
)

const quat$ = values$.pipe(
    // Swap coordinates as three.js has a different coordinate system than we are using
    // Coordinate system used by us:
    //
    //     z
    //     |
    //     |
    //     | 
    //     |_________x
    //    /
    //   /
    //  /
    // y
    //
    map(v => v.orientationW && v.orientationX && v.orientationY && v.orientationZ ? new THREE.Quaternion(v.orientationX, v.orientationZ, v.orientationY, v.orientationW) : undefined)
)

const quat = useObservableShallow(quat$)

function makeRocket(): THREE.Object3D{

    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xdddddd });

    // Create nose cone and body meshes
    const noseConeGeometry = new THREE.ConeGeometry(0.1, 0.3)
    const bodyGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.7)

    const noseCone = new THREE.Mesh(noseConeGeometry, bodyMaterial);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);

    // Put nose cone on top of body
    noseCone.translateY(0.7/2 + 0.3/2)

    // Create 3 fins
    const finGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.01)

    const fin1 = new THREE.Mesh(finGeometry, bodyMaterial)
    const fin2 = new THREE.Mesh(finGeometry, bodyMaterial)
    const fin3 = new THREE.Mesh(finGeometry, bodyMaterial)

    // Up axis
    const up = new THREE.Vector3(0, 1, 0)


    const moveOutsideAxis = new THREE.Vector3(1, 0, 0)

    // Position the fins outside the rocket body
    fin1.translateOnAxis(moveOutsideAxis, 0.1)
    fin2.translateOnAxis(moveOutsideAxis.clone().applyAxisAngle(up, 240/180*Math.PI), 0.1)
    fin3.translateOnAxis(moveOutsideAxis.clone().applyAxisAngle(up, 120/180*Math.PI), 0.1)

    // Move down
    fin1.translateY(-0.7/2 + 0.2/2)
    fin2.translateY(-0.7/2 + 0.2/2)
    fin3.translateY(-0.7/2 + 0.2/2)

    // Rotate fins two an three around the center by 120 and 240 degrees
    // to space them out
    fin2.rotateOnWorldAxis(up, 240/180*Math.PI)
    fin3.rotateOnWorldAxis(up, 120/180*Math.PI)


    const group = new THREE.Group()
    group.add(noseCone, body, fin1, fin2, fin3)

    return group
}

let oldViewport: HTMLElement | undefined

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true });

watch([viewport, viewportSize.height, viewportSize.width], ([v, height, width]) => {

    if (!v || height < 1 || width < 1)
        return

    renderer.setSize(width, height);
    
    if (v === oldViewport) {
        return
    }

    oldViewport = v

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    v.appendChild(renderer.domElement);

    const rocket = makeRocket()


    scene.add(rocket);

    camera.position.z = 1;

    // LIGHTS

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 10);
    scene.add(hemiLightHelper);

    //

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.color.setHSL(0.1, 1, 0.95);
    dirLight.position.set(- 1, 1.75, 1);
    dirLight.position.multiplyScalar(30);
    scene.add(dirLight);

    dirLight.castShadow = true;

    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    const d = 50;

    dirLight.shadow.camera.left = - d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = - d;

    dirLight.shadow.camera.far = 3500;
    dirLight.shadow.bias = - 0.0001;

    // const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10);
    // scene.add(dirLightHelper);

    // GROUND

    const groundGeo = new THREE.PlaneGeometry(10000, 10000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    groundMat.color.setHSL(0.095, 1, 0.75);

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = - 33;
    ground.rotation.x = - Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);


    function animate() {
        requestAnimationFrame(animate);

        if (!quat.value){
            renderer.render(scene, camera);
            return
        }

        // const rotation = oldQuat ? quat.value.multiply(oldQuat.invert()) : quat.value

        // oldQuat = quat.value

        rocket.rotation.x = 0
        rocket.rotation.y = 0
        rocket.rotation.z = 0

        rocket.applyQuaternion(quat.value)
        
        renderer.render(scene, camera);
    }

    animate();

})



</script>