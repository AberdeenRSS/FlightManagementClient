
/**Converts the provided date time string into utc, if its not already in that format */
export function asUtcString(dateString: string){
    if(dateString.endsWith('Z'))
        return dateString

    // Includes timezone info
    if(dateString.includes('+'))
        return dateString

    return dateString + 'Z'
}