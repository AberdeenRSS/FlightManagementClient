import cytoscape from 'cytoscape'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import * as cytoscapeDomNode from 'cytoscape-dom-node'

export function setupCytoscape(){
    cytoscape.use(cytoscapeDomNode)
} 