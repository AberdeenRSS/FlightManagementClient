<template>
    <div ref="viewport" class="viewport"></div>

    <div ref="virtualComp"> </div>
</template>

  
<script setup lang="ts">
import { useVesselStore, type Vessel } from '@/stores/vessels';
import cytoscape from 'cytoscape'
import { computed, getCurrentInstance, onMounted, reactive, ref, render, toRefs, watch } from 'vue';
import * as color from 'color'
import { until } from '@vueuse/shared';

const viewport = ref<HTMLDivElement | null>(null)
const virtualComp = ref<HTMLDivElement | null>(null)

const props = defineProps({
    vesselId: {
        type: String,
        required: true
    },
    modelValue: {
        type: Object,
        required: true
    }
});

const emit = defineEmits<{
    (event: 'update:modelValue', selectedParts: { [id: string]: boolean }): void
}>()

const { vesselId, modelValue } = toRefs(props)

// Own state
const selectedParts = ref({} as { [id: string]: boolean })

watch(selectedParts, p => emit('update:modelValue', p))

const vesselStore = useVesselStore()
vesselStore.fetchVesselsIfNecessary()


const vesselRaw = computed(() => vesselStore.vessels[vesselId.value]?.entity);

const vesselChartData = computed(() => {

    return vesselRaw.value?.parts.map(p => ({ id: p._id, parent: p.parent ?? vesselId.value, name: p.name, type: p.part_type }))
})


onMounted(() => {

    let oldNodes: cytoscape.CollectionReturnValue | undefined = undefined;
    let oldVessel: cytoscape.CollectionReturnValue | undefined = undefined;

    const cyElements = ref<cytoscape.CollectionReturnValue | undefined>(undefined);

    const cy = cytoscape({

        container: viewport.value!, // container to render in
        elements: [ // list of graph elements to start with

        ],
        style: [ // the stylesheet for the graph
            {
                selector: 'node',
                style: {
                    'background-color': (n) => {
                        const type = (n.data('type') as string | undefined);

                        if (!type)
                            return '#666'

                        let sum = 0;
                        for (let i = 0; i < type.length; i++) {
                            sum += type.charCodeAt(i)
                        }

                        sum = sum % 255

                        return color.hsl(sum, 80, 65).hex()
                    },
                    'label': 'data(name)',
                    'shape': 'round-rectangle',
                    'border-color': 'black',
                    'border-width': (n) => n.selected() ? 10 : 0,
                    'border-style': (n) => n.selected() ? 'double' : 'solid',

                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                }
            }
        ],
        layout: {
            name: 'grid',
            rows: 5,
            cols: 5
        }

    });


    watch(vesselRaw, v => {
        if (!v)
            return

        // const domElem = document.createElement("div")
        // domElem.innerHTML = "hi"
        if (oldVessel)
            cy.remove(oldVessel)

        oldVessel = cy.add({ data: { id: v._id, name: v.name, dom: virtualComp.value }, group: 'nodes' })

        cy.center()

        cy.layout({
            name: 'grid',
            cols: 1,
            avoidOverlap: true
        }).run()

    }, { immediate: true });

    watch(vesselChartData, async (cd) => {

        await until(vesselRaw).toBeTruthy()

        if (!cd)
            return;

        if (oldNodes)
            cy.remove(oldNodes)

        const vesselParts = cy.add(cd.map(d => ({ data: d, group: 'nodes' })))
        oldNodes = vesselParts;

        // Register event listeners to tell what component is selected
        vesselParts.on('select', e => selectedParts.value = { ...selectedParts.value, [e.target._private.data.id]: true })
        vesselParts.on('unselect', e => selectedParts.value = { ...selectedParts.value, [e.target._private.data.id]: false })

        cy.center()

        cy.layout({
            name: 'grid',
            cols: 1,
            avoidOverlap: true
        }).run()

        cyElements.value = cy.elements()

    }, { immediate: true })

    watch([modelValue, cyElements], ([selected, elems]) => {

        if(!elems)
            return

        elems.forEach(elem => {
            if (selected[elem.id()])
                elem.select()
            else
                elem.unselect()
        })

    }, {immediate: true})

})



</script>


<style>
.viewport {
    height: 100%;
    width: 100%;
    z-index: 700;
}
</style>
  