import { ref } from "vue";
import { v4 } from "uuid";
import { fetchRssApi } from "../../api/rssFlightServerApi";

export type LoginStates = 'requestSilent' | 'default' | 'failed' | 'requestLogin' | 'requestLogout'

type Account = {
    username: string
}

const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
// const clientSecret = import.meta.env.VITE_GITHUB_CLIENT_SECRET;


const loginState = ref<LoginStates>('default');


// Have a auto silent login at application start
loginSilent()

export function useUserData() {

    return {
        accounts: [] as Account[],
        activeAccount: undefined as (Account | undefined)
    }
}

export function useAuthFlow() {
    return {
        loginState
    }
}


export async function loginSilent() {

    if (!window.location.href.includes('?'))
        return

    const paramString = window.location.href.split('?')[1];
    const queryString = new URLSearchParams(paramString);

    if (!queryString.has('code'))
        return

    const stateResponse = queryString.get('state')
    const code = queryString.get('code')

    const stateRequest = localStorage.getItem('GITHUB_AUTH_STATE')

    if (!stateRequest || stateRequest !== stateResponse) {
        loginState.value = 'failed'
        console.error('Github Auth: State is not matching the requested state')
        return
    }

    const api = fetchRssApi('/auth/get_token', { method: 'POST' }, {})

    const authRequest = await api.post({ code, 'redirect_uri': window.location.href.split('?')[0] })

    if ((authRequest.statusCode.value as number) >= 300 && (authRequest.statusCode.value as number) < 200)
        loginState.value = 'failed'
    return


}


export async function login() {


    const state = v4()
    localStorage.setItem('GITHUB_AUTH_STATE', state)
    window.location.replace(`https://github.com/login/oauth/authorize?client_id=${clientId}&state=${state}`)

}

export async function logout() {

    // // Only do a new login request if possible
    // if(loginState.value !== 'default' && loginState.value !== 'failed')
    //     return

    // loginState.value = 'requestLogout'

    // try{
    //     await msalInstance.value.logoutPopup()
    // }
    // catch(err){
    //     loginState.value = 'failed'
    //     throw err
    // }
    // finally{
    //     refreshAccountData()
    // }

    // loginState.value = 'default'

}

