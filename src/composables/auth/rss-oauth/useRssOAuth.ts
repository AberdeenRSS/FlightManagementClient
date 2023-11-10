import { hasOwn } from "@vueuse/core"
import { useUser } from "../useUser"
import { useRssApiBaseUri } from "@/composables/api/rssFlightServerApi"
import axios from "axios"
import { ref } from "vue"



export function useRssOAuth() {

    const registerError = ref<string | undefined>()
    const loginError = ref<string | undefined>()

    const { authStatus, currentUser, useToken } = useUser()


    async function register(userName: string, email: string, password: string) {

        if (currentUser.value){
            registerError.value = 'Already logged in'
            return 
        }

        if(authStatus.value.loading){
            registerError.value = 'Previous request still pending'
            return
        }

        authStatus.value = { loading: true }
        registerError.value = undefined

        try {

            const res = await axios.post(`${useRssApiBaseUri()}/auth/register`, { 'name': userName, 'unique_name': email, 'pw': password })

            if (res.status >= 200 && res.status < 300) {

                const auth_response = JSON.parse(res.data)

                useToken(auth_response)

                return true
            }

            registerError.value = res.data

        }
        catch (err) {

            if (hasOwn(err as Record<string, string>, 'response')) {
                const data = (err as Record<string, Record<string, string>>).response
                registerError.value = data.data
                return false
            }

            registerError.value = 'Unknown error while trying to register'
        }
        finally {
            authStatus.value = { ...authStatus.value, loading: false }
        }

        return false
    }

    async function login(email: string, password: string) {

        if (currentUser.value){
            loginError.value = 'Already logged in'
            return 
        }

        if(authStatus.value.loading){
            loginError.value = 'Previous request still pending'
            return
        }

        authStatus.value = { loading: true }
        loginError.value = undefined

        try {

            const res = await axios.post(`${useRssApiBaseUri()}/auth/login`, { 'unique_name': email, 'pw': password })

            if (res.status >= 200 && res.status < 300) {

                const token = res.data

                useToken(token)

                return true
            }

            loginError.value = res.data

        }
        catch (err) {

            if (hasOwn(err as Record<string, string>, 'response')) {
                const data = (err as Record<string, Record<string, string>>).response
                loginError.value = data.data
                return false
            }

            loginError.value = 'Unknown error while trying to register'
        }
        finally {
            authStatus.value = { ...authStatus.value, loading: false }
        }
    }

    async function tryRefreshToken(){

        
        if(!currentUser.value)
            return

        
    }

    return {
        registerError,
        loginError,
        register,
        login
    }

}





