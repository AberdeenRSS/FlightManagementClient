import { ref, type Directive, type Ref } from "vue";

type WidgedValues = {
    size: Ref<{
        x: number;
        y: number;
    }>
}


export const widgedSizeDirective: Directive & WidgedValues = {
    size: ref({
        x: 0,
        y: 0,
    }),
    created(el, binding){
        el._widgedSize = binding.value
    },
    updated(el, binding){
        el._widgedSize= binding.value
    }
}