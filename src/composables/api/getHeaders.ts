import { computed } from "vue";
import { useUser } from "../auth/useUser";

const authHeaders = computed(() => {
    if(currentUser.value) {
        return {'Authorization' : `Bearer ${currentUser.value.jwt_token}`};
    }
    return undefined;
})

const { currentUser } = useUser();

export function useAuthHeaders() {
    return authHeaders;
}