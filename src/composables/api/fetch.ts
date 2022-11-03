// fetch.js
import { ref } from 'vue'
import { defaultScopes, useAuthFlow, useMsal, useUserData } from '../msal/useMsal'

export function useFetch(url: string) {
  const data = ref(null)
  const error = ref(null)

  const { activeAccount } = useUserData()
  const { msalInstance } = useMsal()

  if(!activeAccount.value)
    throw new Error('Authorized request can only be made when logged in')

  msalInstance.value.acquireTokenSilent({scopes: ['api://dffc1b9f-47ce-4ba4-a925-39c61eab50ba/Read.Basic'], account: activeAccount.value})
  .then((res) => ({
    headers: {
      'x-access-tokens': `Bearer ${res.accessToken}`
    }
  }))
  .then(r => fetch(url, r))
  .then((res) => res.json())
  .then((json) => (data.value = json))
  .catch((err) => (error.value = err))

  return { data, error }
}