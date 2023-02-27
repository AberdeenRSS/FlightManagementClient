export type LoadingStates = 
    'NOT_REQUESTED'
  | 'REQUESTED'
  | 'LOADED'
  | 'ERROR'

export function shouldRequest(l: LoadingStates){
    return l === 'NOT_REQUESTED' || l === 'ERROR'
}