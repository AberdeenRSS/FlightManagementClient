export function toJsType(typename: string){

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