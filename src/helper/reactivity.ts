import { tryOnScopeDispose } from "@vueuse/core"
import { from, type UseObservableOptions } from "@vueuse/rxjs"
import { isObservable, of, type Observable } from "rxjs"
import { watch,ref, type Ref, type WatchStopHandle, type ShallowRef, type WatchOptions, shallowRef, triggerRef, isRef } from "vue"

export function waitUntil<T>(ref: Ref<T>, predicate: (current: T, previous: T) => boolean): Promise<T>{
    return new Promise((res, _) => {
        
        let stopHandle: WatchStopHandle | undefined = undefined
        stopHandle = watch(ref, (current, previous) => {
            if(!predicate(current, previous))
                return
            stopHandle!()
            res(current)
        })

    } )
}

export function unwrapRef<T>(r: Ref<Ref<T> | undefined>, watchOptions: WatchOptions = {immediate: true}): Ref<T | undefined>{

    let previous: WatchStopHandle | undefined = undefined

    const innerRef = ref<T>()

    watch(r, outerValue =>{

        previous?.()

        if (!outerValue)
            return

        previous = watch(outerValue, innerValue => {
            innerRef.value = innerValue
        }, watchOptions)

    }, watchOptions)

    return innerRef

}


export function unwrapShallowRef<T>(r: Ref<ShallowRef<T> | undefined>, watchOptions: WatchOptions = {immediate: true}): ShallowRef<T | undefined>{


    let previous: WatchStopHandle | undefined = undefined

    const innerRef = shallowRef<T>()

    watch(r, outerValue =>{

        previous?.()

        if (!outerValue)
            return

        previous = watch(outerValue, innerValue => {
            innerRef.value = innerValue
            triggerRef(innerRef)
        }, watchOptions)

    }, watchOptions)

    return innerRef

}

// eslint-disable-next-line @typescript-eslint/ban-types
export type NeverArrayOrObject<T> = T extends (unknown[] | Record<string, unknown> | Function) ? never : T

export type MaybeReactive<T> = Observable<T> | Ref<NeverArrayOrObject<T>> | T

export function asObservable<T>(maybeObservable$: MaybeReactive<T>): Observable<T>;

export function asObservable<T>(maybeObservable$: Observable<T> | T): Observable<T>;

export function asObservable<T>(maybeObservable$: MaybeReactive<T>): Observable<T>{

    if(isRef(maybeObservable$))
        return fromImmediate(maybeObservable$)

    return isObservable(maybeObservable$) ? maybeObservable$ : of(maybeObservable$)
}


export function fromImmediate<T>(r: Ref<T>, deep = false): Observable<T>{
    return from(r, {immediate: true, deep})
}

export function useObservableShallow<H, I = undefined>(observable: Observable<H>, options?: UseObservableOptions<I | undefined>): I extends undefined ? Readonly<Ref<H | undefined>> : Readonly<Ref<H | I>>{

    const value = shallowRef<H | I | undefined>(options == null ? void 0 : options.initialValue);

    const subscription = observable.subscribe({

      next: (val) => {value.value = val; triggerRef(value)},
      error: options == null ? void 0 : options.onError
    });
    
    tryOnScopeDispose(() => {
      subscription.unsubscribe();
    });

    return value as (I extends undefined ? Readonly<Ref<H | undefined>> : Readonly<Ref<H | I>>);
  }