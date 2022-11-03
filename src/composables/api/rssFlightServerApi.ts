// fetch.js
import { waitUntil } from '@/helper/reactivity'
import { useMsal, useUserData } from '../msal/useMsal'
import axios from 'axios'
import process from 'process'

const baseUri = import.meta.env.VITE_RSS_FLIGHT_SERVER_URL;
const serverScope = import.meta.env.VITE_RSS_FLIGHT_SERVER_SCOPE;

/**
 * Method to make a request to the rss flight server with authentication 
 *
 * @param relativeUri The relative uri to the resource to get (Has to start with a /)
 * @returns the fetched data
 */
export async function fetchProtectedResource(relativeUri: string){


    const { activeAccount } = useUserData()
    const { msalInstance } = useMsal()

    // Wait until there is current (logged in account)
    const account = await waitUntil(activeAccount, (current) => !!current)

    // Get an authentication token to make an authenticated request to the api (should be cached most of the time)
    const token = await msalInstance.value.acquireTokenSilent({scopes: [serverScope], account: account!})

    // Create headers
    const headers = {
        'x-access-tokens': `Bearer ${token.accessToken}`
      }


    return await axios.get(`${baseUri}${relativeUri}`, {headers})
}
