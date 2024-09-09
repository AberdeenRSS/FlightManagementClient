import { hasOwn } from "@vueuse/core"
import { useUser } from "../useUser"
import { useRssApiBaseUri } from "@/composables/api/rssFlightServerApi"
import axios from "axios"
import { ref } from "vue"
import { Subscription } from 'rxjs'
import { useRouter } from "vue-router"


let expirationSubscription: Subscription | undefined = undefined

export function useRssOAuth() {

    const registerError = ref<string | undefined>()
    const loginError = ref<string | undefined>()

    const { push } = useRouter()

    const { authStatus, currentUser, expirationEvent, useToken } = useUser()

    if (!expirationSubscription) {
        expirationSubscription = expirationEvent.subscribe(async _ => {

            const success = await tryRefreshToken()

            if (success)
                return

            currentUser.value = undefined
            push('login')

        })
    }


    async function register(userName: string, email: string, password: string) {

        if (currentUser.value) {
            registerError.value = 'Already logged in'
            return
        }

        if (authStatus.value.loading) {
            registerError.value = 'Previous request still pending'
            return
        }

        authStatus.value = { loading: true }
        registerError.value = undefined

        try {

            const res = await axios.post(`${useRssApiBaseUri()}/auth/register`, { 'name': userName, 'unique_name': email, 'pw': password })

            if (res.status >= 200 && res.status < 300) {

                const auth_response = res.data

                useToken(auth_response)

                return true
            }

            registerError.value = res.data

        }
        catch (err) {

        
            type ErrorResponse = {
                response : {
                    data : {
                        detail: string
                    },
                }
            }

            if (hasOwn(err as Record<string, string>, 'response')) {
                const data = (err as ErrorResponse).response
            
                registerError.value = data.data?.detail
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

        if (currentUser.value) {
            loginError.value = 'Already logged in'
            return
        }

        if (authStatus.value.loading) {
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

            type ErrorResponse = {
                response : {
                    data : {
                        detail: string
                    },
                }
            }

            if (hasOwn(err as Record<string, string>, 'response')) {
                const data = (err as ErrorResponse).response
            
                loginError.value = data.data?.detail
                return false
            }

            loginError.value = 'Unknown error while trying to register'

            
        }
        finally {
            authStatus.value = { ...authStatus.value, loading: false }
        }
    }

    async function tryRefreshToken(): Promise<boolean> {


        if (!currentUser.value)
            return false

        if (authStatus.value.loading) {
            loginError.value = 'Previous request still pending'
            return false
        }

        authStatus.value = { loading: true }
        loginError.value = undefined

        try {

            const res = await axios.post(`${useRssApiBaseUri()}/auth/authorization_code_flow`, {'token':currentUser.value.refresh_token})

            if (res.status >= 200 && res.status < 300) {

                const token = res.data

                useToken(token)

                return true
            }

            loginError.value = res.data

            return true

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

        return false
    }

    return {
        registerError,
        loginError,
        register,
        login
    }

}





