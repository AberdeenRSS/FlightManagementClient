import cytoscape from 'cytoscape'
import * as cytoscapeDomNode from 'cytoscape-dom-node'

export function setupCytoscape(){
    cytoscape.use(cytoscapeDomNode)
} 