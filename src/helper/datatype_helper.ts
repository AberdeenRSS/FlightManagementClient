export function toJsType(typename: string | [string, string][]){

    if (Array.isArray(typename))
        return typeof {}

    typename = typename.toLowerCase()

    switch(typename){
        case 'c':
        case 'b':
        case 'h':
        case 'i':
        case 'l':
        case 'q':
        case 'n':
        case 'f':
        case 'd':
            return typeof 0
        case 's':
            return typeof ''
        case '?':
            return typeof true
    }
}