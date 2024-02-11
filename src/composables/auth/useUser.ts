import { ref } from "vue"
import { ReplaySubject } from 'rxjs'

export type User = {
    uid: string,
    name: string,
    unique_name: string,
    jwt_token: string | undefined,
    refresh_token: string
}

export type AuthStatus = {
    loading: boolean;
}

function parseJwt(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

const expirationEvent = new ReplaySubject<User>()

const currentUser = ref<User | undefined>()

const authStatus = ref<AuthStatus>({loading: false})

function useToken(token_response: {token: string, refresh_token: string}){
    const decodedToken = parseJwt(token_response.token)

    localStorage.setItem('JWT', JSON.stringify(token_response))

    const validUntil = new Date(decodedToken['exp']*1000)

    currentUser.value = { 
        unique_name: decodedToken['unique_name'],
        jwt_token: token_response.token,
        refresh_token: token_response.refresh_token,
        name: decodedToken['name'],
        uid: decodedToken['uid']
    }

    const timeUntilExpiration = (validUntil.getTime() - Date.now()) - 1000*60*10

    if (timeUntilExpiration <= 0){
        expirationEvent.next(currentUser.value)
        return
    }

    const oldToken = token_response.token

    setTimeout(() => {

        if(!currentUser.value)
            return

        if(currentUser.value.jwt_token != oldToken)
            return

        expirationEvent.next(currentUser.value)

    }, timeUntilExpiration)
}

/**
 * Tries login with a stored jwt token
 */
function trySilentLogin(){

    const token = localStorage.getItem('JWT')

    if(!token)
        return

    useToken(JSON.parse(token))
}

function logout(){
    currentUser.value = undefined
    localStorage.removeItem('JWT')
}

export function useUser(){
    return {
        currentUser,
        authStatus,
        expirationEvent,
        useToken,
        trySilentLogin,
        logout
    }
}