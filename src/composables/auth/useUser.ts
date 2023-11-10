import { ref } from "vue"

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

const currentUser = ref<User |undefined>()

const authStatus = ref<AuthStatus>({loading: false})

function useToken(token_response: {token: string, refresh_token: string}){
    const decodedToken = parseJwt(token_response.token)

    localStorage.setItem('JWT', JSON.stringify(token_response))

    currentUser.value = { 
        unique_name: decodedToken['unique_name'],
        jwt_token: token_response.token,
        refresh_token: token_response.refresh_token,
        name: decodedToken['name'],
        uid: decodedToken['uid']
    }
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
        useToken,
        trySilentLogin,
        logout
    }
}