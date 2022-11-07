<template>
    <div ref="viewport" class="viewport"></div>

    <div ref="virtualComp"> </div>
</template>

  
<script setup lang="ts">
import { useVesselStore, type Vessel } from '@/stores/vessels';
import cytoscape from 'cytoscape'
import { computed, getCurrentInstance, onMounted, reactive, ref, render, toRefs, watch } from 'vue';
import * as color from 'color'

const viewport = ref<HTMLDivElement | null>(null)
const virtualComp = ref<HTMLDivElement | null>(null)

const props = defineProps({
    vesselId: {
        type: String,
        required: true
    }
});

const { vesselId } = toRefs(props)

function x(){
    console.log(vesselId.value)
}


const vesselStore = useVesselStore()
vesselStore.fetchVesselsIfNecessary()

const { $vesselId } = reactive({$vesselId: vesselId})

const vesselRaw = computed(() => vesselStore.vessels[$vesselId]?.entity );

const {$vesselRaw} = reactive({$vesselRaw: vesselRaw})


const vesselChartData = computed(() => {
    return $vesselRaw?.parts.map(p => ({id: p._id, parent: p.parent ?? $vesselId, name: p.name, type: p.part_type}))
})


onMounted(() => {


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

                        if(!type)
                            return '#666'

                        let sum = 0;
                        for(let i = 0; i < type.length; i++)
                        {
                            sum += type.charCodeAt(i)
                        }

                        sum = sum % 255

                        return color.hsl(sum, 80, 65).hex()
                    },
                    'label': 'data(name)',
                    'shape': 'round-rectangle',
                    'border-width': 1,
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
        if(!v)
            return

        // const domElem = document.createElement("div")
        // domElem.innerHTML = "hi"

        cy.add({data: {id: v._id, name: v.name,  dom: virtualComp.value}, group: 'nodes'})

        cy.center()

        cy.layout( {
            name: 'grid',
            cols: 1,
            avoidOverlap: true
        }).run()
        
    }, {immediate: true});

    watch(vesselChartData, cd => {
        if(!cd)
            return;
        cy.add(cd.map(d => ({data: d, group: 'nodes'})))
        cy.center()

        cy.layout( {
            name: 'grid',
            cols: 1,
            avoidOverlap: true
        }).run()

    }, {immediate: true})

})



</script>


<style>
.viewport {
    width: 30vw;
    height: 40vh;
    border-width: 1px;
}
</style>
  