import { watch, type Ref, type WatchStopHandle } from "vue"

export function waitUntil<T>(ref: Ref<T>, predicate: (current: T, previous: T) => boolean): Promise<T>{
    return new Promise((res, rej) => {
        
        let stopHandle: WatchStopHandle | undefined = undefined
        stopHandle = watch(ref, (current, previous) => {
            if(!predicate(current, previous))
                return
            stopHandle!()
            res(current)
        })

    } )
}