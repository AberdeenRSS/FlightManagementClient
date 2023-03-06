import type { MaybeRef } from "@vueuse/core";
import { computed, ref, shallowRef, toRef, watch, type InjectionKey, type Ref } from "vue";

export const DASHBOARD_ID: InjectionKey<string> = Symbol()
export const DASHBOARD_WIDGET_ID: InjectionKey<[string, string]> = Symbol()

export type Widget = { sizeX: number; sizeY: number; id: string, badSize: boolean, data: { [key: string]: any } }
export type WidgetSlot = { element: Widget | null; blocked: string | undefined, hoverCount: number; y: number; x: number }
export type WidgetRow = WidgetSlot[]
export type WidgetMatrix = WidgetRow[]

export type StoreObject = { name: string, saved: boolean, isDefault: boolean, matrix: WidgetMatrix, widgets: Widget[], canDrop: boolean, rows: number, cols: number }

export type ResizeDirections = 'shrinkHorizontal' | 'enlargeHorizontal' | 'shrinkVertical' | 'enlargeVertical'

const dashboardStores: Ref<{ [id: string]: StoreObject | { name: string, saved: boolean, isDefault: boolean } }> = ref({})

/**
 * A central store for a dashboard componentds
 */
export function useDashboardStore(dashboardId: MaybeRef<string>) {

    const { tryLoadDashboardFromStorage } = useDashboardPersistStore()

    const id$ = typeof dashboardId === 'string' ? ref(dashboardId) : dashboardId

    const store = computed(() => dashboardStores.value[id$.value]) as Ref<StoreObject>

    function loadDashboard(id: string) {
        if (dashboardStores.value[id] && 'matrix' in dashboardStores.value[id])
            return

        if (tryLoadDashboardFromStorage(id))
            return

            dashboardStores.value[id] = { ...{name: '', saved: false}, matrix: [], widgets: [], canDrop: false, rows: 0, cols: 0, ...dashboardStores.value[id] }
        initMatrix()
    }

    loadDashboard(id$.value)
    watch(id$, loadDashboard)

    watch(store, (n, o) => {
        if (!(o?.saved))
            return

        if(!n)
        return

        store.value.saved = false
    }, { deep: true })

    const widgetDict = computed(() => getWidgetLookup(store.value.widgets))

    function putWidget(slot: WidgetSlot, widget: Widget) {

        slot.element = widget;

        for (let i = slot.y; i < (slot.y + widget.sizeY); i++) {
            for (let j = slot.x; j < (slot.x + widget.sizeX); j++) {
                store.value.matrix[i][j].blocked = widget.id;
            }
        }
    }

    function addWidget(slot: WidgetSlot, widget: Widget) {
        store.value.widgets.push(widget)
        putWidget(slot, widget)
    }

    function removeWidget(slot: WidgetSlot) {

        const removed = slot.element
        if (!removed)
            return undefined

        for (let i = slot.y; i < (slot.y + removed.sizeY); i++) {
            for (let j = slot.x; j < (slot.x + removed.sizeX); j++) {
                store.value.matrix[i][j].element = null;
                store.value.matrix[i][j].blocked = undefined;
            }
        }

        return removed
    }

    function deleteWidgetInSlot(slot: WidgetSlot) {

        const widget = removeWidget(slot)

        if (!widget)
            return

        store.value.widgets = store.value.widgets.filter(w => w.id !== widget.id)
    }

    function onRequestResize(event: { sizeX: number, sizeY: number }, item: WidgetSlot) {
        item.element
    }

    function tryGetWidget(event: DragEvent) {
        const uuidPair = event.dataTransfer?.types.find(t => t.startsWith('uuid'))
        if (!uuidPair)
            return undefined

        const uuid = uuidPair.split('*')[1]
        return widgetDict.value[uuid]
    }

    function evaluateCollide(initiatingSlot: WidgetSlot, initiatingWidget: Widget, add: boolean) {
        // 1. Get affected slots
        const slots: (WidgetSlot | undefined)[] = []

        const matrix = store.value.matrix;

        for (let i = initiatingSlot.y; i < (initiatingSlot.y + initiatingWidget.sizeY); i++) {
            for (let j = initiatingSlot.x; j < (initiatingSlot.x + initiatingWidget.sizeX); j++) {
                if (i < matrix.length && j < matrix[i].length)
                    slots.push(matrix[i][j])
                else
                    slots.push(undefined)
            }
        }

        if (add) {
            if (slots.some(s => !s || (!!s.element && s.element.id !== initiatingWidget.id) || (!!s.blocked && s.blocked !== initiatingWidget.id)))
                store.value.canDrop = false
            else
                store.value.canDrop = true
        }


        slots.filter(s => !!s).map(s => s!.hoverCount += (add ? 1 : -1))
        return
    }

    function resetCollide() {
        store.value.matrix.forEach(row => {
            row.forEach(c => c.hoverCount = 0)
        })
    }

    function initMatrix() {
        const matrixProto: WidgetMatrix = []
        for (let i = 0; i < store.value.rows; i++) {
            matrixProto[i] = []
            for (let j = 0; j < store.value.cols; j++) {
                matrixProto[i][j] = { element: null, blocked: undefined, hoverCount: 0, y: i, x: j }
            }
        }

        store.value.matrix = matrixProto
    }

    function getCurrentSlot(widget: Widget) {
        return store.value.matrix.map(row => row.find(c => c.element?.id === widget.id)).find(c => !!c)
    }

    return {
        store,
        widgetDict,
        initMatrix,
        putWidget,
        addWidget,
        removeWidget,
        onRequestResize,
        tryGetWidget,
        evaluateCollide,
        resetCollide,
        getCurrentSlot,
        deleteWidgetInSlot
    }
}

export function useDashboardWidgetStore([dashboardId, widgetId]: [string, string]) {

    const { store, getCurrentSlot, removeWidget, putWidget, deleteWidgetInSlot } = useDashboardStore(dashboardId)

    const widget: Ref<Widget | undefined> = ref(undefined)
    const widgetSlot: Ref<WidgetSlot | undefined> = ref(undefined)

    watch(store.value.widgets, () => { widget.value = store.value.widgets.find(w => w.id === widgetId) }, { immediate: true })
    watch(widget, w => { widgetSlot.value = w ? getCurrentSlot(w) : undefined }, { immediate: true })


    function calculateCanResize() {

        const nullReturn = {
            shrinkHorizontal: false,
            shrinkVertical: false,
            enlargeHorizontal: false,
            enlargeVertical: false,
        }

        if (!widget.value)
            return nullReturn

        const slot = getCurrentSlot(widget.value)

        if (!slot)
            return nullReturn

        // Check if the matrix is free
        // at the + values
        // o x x o
        // o x x o
        // o + + o
        // o o o o
        let enlargeVertical = true
        const checkRow = slot.y + widget.value.sizeY
        if (checkRow >= store.value.rows)
            enlargeVertical = false
        else
            for (let i = slot.x; i < store.value.cols && i < (slot.x + widget.value.sizeX); i++)
                if (store.value.matrix[checkRow][i].blocked)
                    enlargeVertical = false

        // Check if the matrix is free
        // at the + values
        // o o o o
        // x x + o
        // x x + o
        // o o o o
        let enlargeHorizontal = true
        const checkCol = slot.x + widget.value.sizeX
        if (checkCol >= store.value.cols)
            enlargeHorizontal = false
        else
            for (let i = slot.y; i < store.value.rows && i < (slot.y + widget.value.sizeY); i++)
                if (store.value.matrix[i][checkCol].blocked)
                    enlargeHorizontal = false

        return {
            shrinkHorizontal: widget.value.sizeX > 1,
            shrinkVertical: widget.value.sizeY > 1,
            enlargeHorizontal,
            enlargeVertical
        }
    }

    const canResize = ref({
        shrinkHorizontal: false,
        shrinkVertical: false,
        enlargeHorizontal: false,
        enlargeVertical: false
    })

    watch(store.value, () => { canResize.value = calculateCanResize() }, { immediate: true })

    /**
     * 
     * @param widget The widget to resize
     */
    function resizeWidget(direction: ResizeDirections) {

        const resizeState = calculateCanResize()

        if (direction === 'enlargeHorizontal' && !resizeState.enlargeHorizontal)
            return

        if (direction === 'shrinkHorizontal' && !resizeState.shrinkHorizontal)
            return

        if (direction === 'shrinkVertical' && !resizeState.shrinkVertical)
            return

        if (direction === 'enlargeVertical' && !resizeState.enlargeVertical)
            return

        if (!widget.value)
            return

        const oldSlot = getCurrentSlot(widget.value)

        const removedWidget = removeWidget(oldSlot!)

        if (direction === 'enlargeHorizontal')
            removedWidget!.sizeX++;

        if (direction === 'shrinkHorizontal')
            removedWidget!.sizeX--;

        if (direction === 'shrinkVertical')
            removedWidget!.sizeY--;

        if (direction === 'enlargeVertical')
            removedWidget!.sizeY++;


        putWidget(oldSlot!, removedWidget!)
    }

    function deleteWidget() {
        if (!widget.value)
            return

        const oldSlot = getCurrentSlot(widget.value)

        if (!oldSlot)
            return

        deleteWidgetInSlot(oldSlot)

    }

    return {
        widget,
        widgetSlot,
        canResize,
        calculateCanResize,
        resizeWidget,
        deleteWidget
    }
}

export function getWidgetLookup(widgets: Widget[]) {
    const dict: { [uuid: string]: Widget } = {}
    // Make lowercase as the event data does the same
    widgets.forEach(w => dict[w.id.toLowerCase()] = w)
    return dict;
}

function getDashboardLocalStorageKey(dashboardId: string) {
    return `DASHBOARD_${dashboardId}`
}

const DASHBOARD_INDICES = 'DASHBOARD_INDICES'

export function useDashboardPersistStore() {

    const availableDashboards = computed(() => Object.keys(dashboardStores.value).map(k => ({ id: k, name: dashboardStores.value[k].name, saved: dashboardStores.value[k].saved, isDefault: dashboardStores.value[k].isDefault })))

    function makeDefault(id: string) {
        Object.keys(dashboardStores.value).forEach(v => {
            dashboardStores.value[v].isDefault = v === id
        })
    }

    function deleteDashboard(id: string){
       delete dashboardStores.value[id]
    }

    function tryLoadDashboardFromStorage(dashboardId: string) {
        const result = localStorage.getItem(getDashboardLocalStorageKey(dashboardId))

        if (!result)
            return false

        dashboardStores.value[dashboardId] = JSON.parse(result)
        return true
    }

    function saveDashboardToStorage(dashboardId: string) {
        dashboardStores.value[dashboardId].saved = true
        localStorage.setItem(getDashboardLocalStorageKey(dashboardId), JSON.stringify(dashboardStores.value[dashboardId]))
    }

    function saveDashboardIndicesToStorage() {

        localStorage.setItem(DASHBOARD_INDICES, JSON.stringify(availableDashboards.value))
    }

    function loadDashboardIndicesFromStorage() {

        const result = localStorage.getItem(DASHBOARD_INDICES)

        if (!result)
            return

        (JSON.parse(result) as { id: string, name: string, isDefault: boolean }[]).forEach(({ id, name, isDefault }) => {
            if (dashboardStores.value[id])
                return;

            dashboardStores.value[id] = { name, saved: true, isDefault }
        })
    }

    function createNew(id: string, cols: number) {
        dashboardStores.value[id] = { name: '', saved: false, cols, rows: 20, isDefault: false }
    }

    return { availableDashboards, tryLoadDashboardFromStorage, saveDashboardToStorage, saveDashboardIndicesToStorage, loadDashboardIndicesFromStorage, createNew, makeDefault, deleteDashboard }

}