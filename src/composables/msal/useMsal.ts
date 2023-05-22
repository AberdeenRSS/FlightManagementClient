import * as msal from "@azure/msal-browser";
import { ref, type Ref } from "vue";

export type LoginStates = 'requestSilent' | 'default' | 'failed' | 'requestLogin' | 'requestLogout'


const tenantId = import.meta.env.VITE_MSAL_TENANT_ID;
const clientId = import.meta.env.VITE_MSAL_CLIENT_ID;
// const baseUrl = import.meta.env.BASE_URL;


// const tenantId = 'ed38e9ed-ef79-4415-b1aa-36e883726313'
// const clientId = 'd9f91861-0388-4e8e-af85-5b91237e64e2'
// const baseUrl = 'http://localhost:8080/'

const msalConfig: msal.Configuration = {
    auth: {
        clientId: clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        // knownAuthorities: ['https://login.microsoftonline.com/ed38e9ed-ef79-4415-b1aa-36e883726313/oauth2/v2.0/authorize'],
        redirectUri: window.location.href
    },
    cache: {
        cacheLocation: 'localStorage'
    }
};

export const defaultScopes = ['User.Read']

const msalInstance = ref(new msal.PublicClientApplication(msalConfig))

const accounts: Ref<msal.AccountInfo[]> = ref(msalInstance.value.getAllAccounts())
const activeAccount = ref(msalInstance.value.getActiveAccount())

const loginState: Ref<LoginStates> = ref('default')

// Have a auto silent login at application start
loginSilent()

export function useUserData(){

    return {
        accounts,
        activeAccount
    }
}

export function useAuthFlow(){
    return {
        loginState
    }
}

export function useMsal(){
    return {
        msalInstance
    }
}

export async function loginSilent(){

    // Only do a new login request if possible
    if(loginState.value !== 'default' && loginState.value !== 'failed')
        return

    loginState.value = 'requestSilent'

    try{

        await msalInstance.value.acquireTokenSilent({scopes: defaultScopes})
    }
    catch(err){
        loginState.value = 'failed'
        throw err
    }
    finally{
        refreshAccountData()
    }

    loginState.value = 'default'

}

export async function login(){

    // Only do a new login request if possible
    if(loginState.value !== 'default' && loginState.value !== 'failed')
        return

    loginState.value = 'requestLogin'

    try{
       await msalInstance.value.acquireTokenPopup({scopes: defaultScopes})
    }
    catch(err){
        loginState.value = 'failed'
        throw err
    }
    finally{
        refreshAccountData()
    }

    loginState.value = 'default'

}

export async function logout(){

    // Only do a new login request if possible
    if(loginState.value !== 'default' && loginState.value !== 'failed')
        return

    loginState.value = 'requestLogout'

    try{
        await msalInstance.value.logoutPopup()
    }
    catch(err){
        loginState.value = 'failed'
        throw err
    }
    finally{
        refreshAccountData()
    }

    loginState.value = 'default'

}

function refreshAccountData(){
    accounts.value = msalInstance.value.getAllAccounts()

    if(accounts.value.length == 1)
        msalInstance.value.setActiveAccount(accounts.value[0])

    activeAccount.value = msalInstance.value.getActiveAccount()
}
