

<script lang="ts">
import { h } from 'vue';

    export default {
        props: {
        componentType: {
            type: Object,
            required: true
        },
        componentProps: {
            type: Object,
            required: true
        },
    },
    render(){
        return h(this.componentType, this.componentProps)
    }
    }
</script>