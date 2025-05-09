import { shouldRequest, type LoadingStates } from "./loadingStates"

export type TimeSpan = { start: Date, end: Date }

export const DECISECOND = 'decisecond'
export const SECOND = 'second'
export const MINUTE = 'minute'
export const HOUR = 'hour'
export const DAY = 'day'
export const MONTH = 'month'
export const ETERNITY = 'eternity'

export type AggregationLevels = typeof DECISECOND | typeof SECOND | typeof MINUTE | typeof HOUR | typeof DAY | typeof MONTH | typeof ETERNITY

export const AggregationLevelMap = [DECISECOND, SECOND, MINUTE, HOUR, DAY, MONTH, ETERNITY]

export const aggregationLevelReverseMap = {
    [DECISECOND]: 0,
    [SECOND]: 1,
    [MINUTE]: 2,
    [HOUR]: 3,
    [DAY]: 4,
    [MONTH]: 5,
    [ETERNITY]: 6
}

export const roundingMillis = {
    [DECISECOND]: 100,
    [SECOND]: 1000,
    [MINUTE]: 1000*60,
    [HOUR]: 1000*60*60,
    [DAY]: 1000*60*60*24,
    [MONTH]: 1000*60*60*24*31,
}

export type TimeTreeData = {
    getDateTime(): Date
}

export type TimeTreeNode<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never> = {

    /**
     * Easy access to the aggregation level of the node. Aggregation level degcreases with
     * depth
     */
    aggregationLevel: AggregationLevels;

    /**
     * The loading state for the {@link TimeTreeNode.ownMeasurementValue}
     */
    loadingState: LoadingStates;

    /**
     * The value of the node itself
     */
    ownMeasurementValue?: TOwnData;

    /**
     * Child nodes
     */
    members: {[time: string]: TimeTreeNode<TLeafData, TOwnData> } | {[time: string]: TLeafData};

    /**
     * start date of this node.
     * Use {@link getNodeTimeSpan} to get entire time span
     */
    start: Date;

    /**
     * Wether data for a given aggregation level was already requested
     */
    requested: { [Level in (AggregationLevels | 'smallest')]?: boolean }

}

/**
 * Rounds the provided date to the provided aggregation level
 * by rounding the unix milliseconds.
 * 
 * Note: Because of different length
 * of months, summer/winter time problems and leap seconds the
 * produced values might not align as expected.
 * 
 * @param date The date to round
 * @param aggregationLevel The aggregation level to round at
 * @returns 
 */
function roundToAggregationLevel(date: number, aggregationLevel: AggregationLevels){

    // In case of eternity return the unix minimum date
    if(aggregationLevel === 'eternity')
        return 0

    const roundingFactor = roundingMillis[aggregationLevel]

    return Math.floor(date/roundingFactor)*roundingFactor
}

/**
 * Returns time chunks in the provided range at the provided level.
 * I.e. if the range is a specific minute, and the aggregation level
 * is seconds this method will return each second (the seconds are
 * the chunks within a minute). If the time span ranges multiple minutes
 * all chunks of all minutes would be returned
 * 
 * @param start The start date
 * @param end The end date
 * @param aggregationLevel The aggregation level to get the chunks for
 * @returns 
 */
export function getChunksInRange(start: number, end: number, aggregationLevel: Exclude<AggregationLevels, typeof ETERNITY>){

    const stepMillis = roundingMillis[aggregationLevel]
    const endMillis = end
    const res: number[] = []
    let cur = roundToAggregationLevel(start, aggregationLevel);

    while(cur < endMillis)
    {
        res.push(cur)
        cur += stepMillis
    }

    return res
}

/**
 * Returns the times span a given {@link TimeTreeNode} covers
 * @param node The node in question
 * @returns 
 */
export function getNodeTimeSpan(node: TimeTreeNode<TimeTreeData, TimeTreeData>){

    return getChunkTimeSpan(node.start, node.aggregationLevel)
}

/**
 * Returns the times span a given time chunk covers
 * @param start The start date of the chunk
 * @returns 
 */
export function getChunkTimeSpan(start: Date, aggregationLevel: AggregationLevels){
    if(aggregationLevel === ETERNITY)
        return {start: start, end: new Date(Number.MAX_SAFE_INTEGER)}

    return {start: start, end: new Date(start.getTime() + roundingMillis[aggregationLevel]-1)}
}

/**
 * 
 * @param timeSpanA The container time span (i.e. the time span to check if it contains the other time span)
 * @param timeSpanB The contained time span (i.e. the time span to check if it is contained in the other time span)
 */
export function timeSpanFullyContained(timeSpanA: TimeSpan, timeSpanB: TimeSpan)
{
    return (timeSpanA.start.getTime() < timeSpanB.start.getTime()) && (timeSpanA.end.getTime() > timeSpanB.end.getTime())
}

/**
 * 
 * @param start The start of the range to look up
 * @param end The end of the range to look up
 * @param level The level to look up
 * @param markLoaded Wether to modify the tree and mark the returned time
 * stamps as already loaded
 */
export function getMissingRangesRecursive(node: TimeTreeNode<TimeTreeData, TimeTreeData>, start: Date, end: Date, level: AggregationLevels | 'smallest', markLoaded: boolean): TimeSpan[] {

    const aggregationLevelIndex = level != 'smallest' ? aggregationLevelReverseMap[level] : -1
    const nodeAggregationLevelIndex = aggregationLevelReverseMap[node.aggregationLevel]

    const nodeTimeSpan = getNodeTimeSpan(node)

    if(aggregationLevelIndex > nodeAggregationLevelIndex)
        throw new Error('DataStructureViolation: Requested aggregation level lies above current node')

    // If this node is on the aggregation level we are after check if it
    // is already loaded. If not add it to the range of time that still has to
    // be loaded
    if(aggregationLevelIndex === nodeAggregationLevelIndex){
        if(!shouldRequest(node.loadingState))
            return []

        if(markLoaded)
            node.loadingState = 'REQUESTED'
        
        return timeSpanFullyContained(nodeTimeSpan, {start, end}) ? [{start, end}] : [nodeTimeSpan]
    }

    // Check if the level was already requested for the given time range
    if(node.requested[level])
        return []

    // If this is the last level (i.e. decisecond) laod the entire
    // range, as the values cannot be tracked individually anyways
    if(nodeAggregationLevelIndex <= 0)
        return [{start, end}]

    // If the node is fully contained in the time span it's
    // entire time span should be loaded
    if(timeSpanFullyContained({start, end}, nodeTimeSpan)){

        // Mark the whole node as loaded in this case
        if(markLoaded)
            node.requested[level] = true

        return [nodeTimeSpan]
    }

    // In case there are members it has to be checked which members exist, and
    // which members still have to be requested
    const nextAggregationLevel = AggregationLevelMap[nodeAggregationLevelIndex-1] as Exclude<AggregationLevels, typeof ETERNITY>

    const min = (start.getTime() > nodeTimeSpan.start.getTime() || node.aggregationLevel === 'eternity') ? start : nodeTimeSpan.start
    const max = (end.getTime() < nodeTimeSpan.end.getTime() || node.aggregationLevel === 'eternity') ? end : nodeTimeSpan.end

    const chunksToConsider = getChunksInRange(min.getTime(), max.getTime(), nextAggregationLevel)

    // const chunksToLoad: TimeSpan[] = []
    const nodesToCheck: TimeTreeNode<TimeTreeData, TimeTreeData>[] = []

    chunksToConsider.forEach(c => {
        const asDate = new Date(c)
        // Always another node, as decisecond level is already excluded earlier
        let member = node.members[asDate.toISOString()] as TimeTreeNode<TimeTreeData, TimeTreeData>

        if(!member)
            member = node.members[asDate.toISOString()] = { aggregationLevel: nextAggregationLevel, start: asDate, members: {}, loadingState: 'NOT_REQUESTED', requested: {} } as TimeTreeNode<TimeTreeData, TimeTreeData>
        
        nodesToCheck.push(member)

    })

    const ranges = nodesToCheck.map(n => getMissingRangesRecursive(n, start, end, level, markLoaded)).flat()

    return stitchRanges(ranges)

}

function stitchRanges(timeSpans: TimeSpan[]){

    if(timeSpans.length < 1)
        return []

    const res: TimeSpan[] = []

    let cur = {start: new Date(timeSpans[0].start), end: new Date(timeSpans[0].end)}

    let i = 0
    while(i+1 < timeSpans.length){
        const next = timeSpans[i + 1]

        if((cur.end.getTime() - next.start.getTime()) < 20){
            cur.end = next.end
            i++
            continue;
        }

        res.push(cur)
        cur = {start: new Date(next.start), end: new Date(next.end)}
        i++
    }

    res.push(cur)

    return res
}

/**
 * Allocates members of the time tree. Allocating in this context means
 * creating new members at the requested level within the requested time
 * range as well as their parents
 * 
 * @param node The node to work from (usually the root of the tree)
 * @param start The datetime to allocate from
 * @param end The datetime to allocate to
 * @param level The aggregation level to aggregate to
 * @param loadingState The loading state to initialize the level with
 * @returns 
 */
export function allocateTimeTreeAtLevel(node: TimeTreeNode<TimeTreeData, TimeTreeData>, start: Date, end: Date, level: AggregationLevels, loadingState: Exclude<LoadingStates, 'LOADED' | 'ERROR'>){

    // Stop allocating if this is the requested or maximum level to allocate to
    if(node.aggregationLevel === level)
        return
    
    const aggregationLevelIndex = aggregationLevelReverseMap[node.aggregationLevel]

    if(aggregationLevelIndex <= 0)
        return;

    const nextAggregationLevel = AggregationLevelMap[aggregationLevelIndex-1] as Exclude<AggregationLevels, typeof ETERNITY>

    const chunksToConsider = getChunksInRange(start.getTime(), end.getTime(), nextAggregationLevel)

    // For each chunk check if the member has to be created and do so if needed
    // Then repeat allocation on the member
    chunksToConsider.forEach(c => {
        const asDate = new Date(c)
        let member = node.members[asDate.toISOString()] as TimeTreeNode<TimeTreeData, TimeTreeData>

        if(!member)
            member = node.members[asDate.toISOString()] = { aggregationLevel: nextAggregationLevel, start: asDate, members: {}, loadingState: loadingState, requested: {} }

        allocateTimeTreeAtLevel(member, start, end, level, loadingState)
    })
}

export function insertValue<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, value: TOwnData, aggregationLevel: Exclude<AggregationLevels, typeof ETERNITY>): void;
export function insertValue<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, value: TLeafData): void;
export function insertValue<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, value: TOwnData | TLeafData, maybeAggregationLevel?: Exclude<AggregationLevels, typeof ETERNITY>): void;

export function insertValue<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, value: TOwnData | TLeafData, maybeAggregationLevel?: Exclude<AggregationLevels, typeof ETERNITY>){

    if(maybeAggregationLevel && node.aggregationLevel === maybeAggregationLevel){
        node.ownMeasurementValue = value as TOwnData
        node.requested[maybeAggregationLevel] = true
        return
    }

    const dateTimeString = value.getDateTime()
    const date = typeof dateTimeString === 'string' ? new Date(dateTimeString) : dateTimeString

    if(!maybeAggregationLevel && node.aggregationLevel === DECISECOND){
        node.members[date.toISOString()] = value as TLeafData
        node.requested['smallest'] = true
        return
    }

    if(node.aggregationLevel === DECISECOND)
        throw new Error('DataStructureError: Cannot insert values below decisecond')

    const aggregationLevelIndex = aggregationLevelReverseMap[node.aggregationLevel]
    const nextAggregationLevel = AggregationLevelMap[aggregationLevelIndex-1] as Exclude<AggregationLevels, typeof ETERNITY>


    const rounded = new Date(roundToAggregationLevel(date.getTime(), nextAggregationLevel))

    let member = node.members[rounded.toISOString()] as TimeTreeNode<TLeafData, TOwnData>
    
    if(!member)
        member = node.members[rounded.toISOString()] = {start: rounded, members: {}, loadingState: 'NOT_REQUESTED', aggregationLevel: nextAggregationLevel, requested: {}}

    insertValue(member, value, maybeAggregationLevel)
}

export function getValues<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, start: Date, end: Date, keepQuerying: boolean, aggregationLevel: AggregationLevels): TOwnData[];
export function getValues<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, start: Date, end: Date): TLeafData[];
export function getValues<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, start: Date, end: Date, keepQuerying?: boolean, aggregationLevel?: AggregationLevels): (TLeafData | TOwnData)[];

export function getValues<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, start: Date, end: Date, keepQuerying?: boolean, aggregationLevel?: AggregationLevels): (TLeafData | TOwnData)[]{
     
    
    if((!aggregationLevel && node.aggregationLevel === DECISECOND))
        return Object.keys(node.members).map(k => node.members[k] as TLeafData).sort((a, b) => a.getDateTime().getTime() - b.getDateTime().getTime())
    
    const nodeAggregationLevelIndex = aggregationLevelReverseMap[node.aggregationLevel]
    const aggregationLevelIndex = aggregationLevel ? aggregationLevelReverseMap[aggregationLevel] : -1

    // If the desired aggregation level is reached, return the value if it's present
    // If there is no value and keepQuerying is true, than search in the child nodes
    // for values
    if(nodeAggregationLevelIndex <= aggregationLevelIndex)
    {
        if(!keepQuerying)    
            return node.ownMeasurementValue ? [node.ownMeasurementValue] : []

        if(node.ownMeasurementValue)
            return [node.ownMeasurementValue]

        if(node.aggregationLevel === 'decisecond')
            return Object.keys(node.members).map(k => node.members[k] as TLeafData).sort((a, b) => a.getDateTime().getTime() - b.getDateTime().getTime())

    }

    const nextAggregationLevel = AggregationLevelMap[nodeAggregationLevelIndex-1] as Exclude<AggregationLevels, typeof ETERNITY>
    const nodeTimeSpan = getNodeTimeSpan(node)

    const min = (start.getTime() > nodeTimeSpan.start.getTime() || node.aggregationLevel === 'eternity') ? start : nodeTimeSpan.start
    const max = (end.getTime() < nodeTimeSpan.start.getTime() || node.aggregationLevel === 'eternity') ? end : nodeTimeSpan.end

    const chunksToConsider = getChunksInRange(min.getTime(), max.getTime(), nextAggregationLevel)

    // For each chunk check if the member has to be created and do so if needed
    // Then repeat allocation on the member
    return chunksToConsider.map(c => {
        const asDate = new Date(c)
        const member = node.members[asDate.toISOString()] as TimeTreeNode<TLeafData, TOwnData>

        if(!member)
            return []

        return getValues(member, start, end, keepQuerying, aggregationLevel)
    }).flat()
}

type TreeFilter<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never> = (data: TLeafData | TOwnData) => boolean

export function getClosest<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, date: Date, aggregationLevel?: AggregationLevels, filter?: TreeFilter<TLeafData, TOwnData>): (TLeafData | TOwnData | undefined){
    
    if(!filter)
        filter = (_) => true

    const nodeAggregationLevelIndex = aggregationLevelReverseMap[node.aggregationLevel]
    const aggregationLevelIndex = aggregationLevel ? aggregationLevelReverseMap[aggregationLevel] : undefined

    // Leaf level reached
    if((!aggregationLevel || nodeAggregationLevelIndex < aggregationLevelIndex! ) && node.aggregationLevel === DECISECOND){

        const sortedMembers = Object.keys(node.members)
            .sort()
            .reverse()
            .map(k => node.members[k] as TLeafData)
            // .sort((a, b) => (a.getDateTime().getTime() - date.getTime()) - (b.getDateTime().getTime() - date.getTime()))

        return sortedMembers.find(filter)
    }
    

    if(aggregationLevelIndex && nodeAggregationLevelIndex <= aggregationLevelIndex && node.ownMeasurementValue && filter(node.ownMeasurementValue))
        return node.ownMeasurementValue

    const memberKeys = Object.keys(node.members).sort()
    

    const result: (TLeafData | TOwnData | undefined) = undefined
    let i = memberKeys.length-1

    while(i > -1 && result === undefined){

        const member = node.members[memberKeys[i]] as TimeTreeNode<TLeafData, TOwnData>
        i--

        if(!member)
            continue

        if(member.start.getTime() > date.getTime())
            continue

        const potentialResult = getClosest(member, date, aggregationLevel)

        if(!potentialResult)
            continue

        if(!filter(potentialResult))
            continue

        return potentialResult;

    }

    return undefined
}



