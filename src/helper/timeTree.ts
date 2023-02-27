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
    requested: { [Level in (AggregationLevels | 'leaf')]?: boolean }

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
function roundToAggregationLevel(date: Date, aggregationLevel: AggregationLevels){

    // In case of eternity return the unix minimum date
    if(aggregationLevel === 'eternity')
        return new Date()

    const roundingFactor = roundingMillis[aggregationLevel]

    return new Date(Math.floor(date.getTime()/roundingFactor)*roundingFactor)
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
export function getChunksInRange(start: Date, end: Date, aggregationLevel: Exclude<AggregationLevels, typeof ETERNITY>){

    const stepMillis = roundingMillis[aggregationLevel]
    const endMillis = end.getTime()
    const res: Date[] = []
    let cur = roundToAggregationLevel(start, aggregationLevel).getTime();

    while(cur < endMillis)
    {
        res.push(new Date(cur))
        cur += stepMillis
    }

    return res
}

/**
 * Returns the times span a given {@link TimeTreeNode} covers
 * @param node The node in question
 * @returns 
 */
export function getNodeTimeSpan(node: TimeTreeNode<any, any>){

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
export function getMissingRangesRecursive(node: TimeTreeNode<any, any>, start: Date, end: Date, level: AggregationLevels, markLoaded: boolean): TimeSpan[] {

    const aggregationLevelIndex = aggregationLevelReverseMap[level]
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
    const max = (end.getTime() < nodeTimeSpan.start.getTime() || node.aggregationLevel === 'eternity') ? end : nodeTimeSpan.end

    const chunksToConsider = getChunksInRange(min, max, nextAggregationLevel)

    // const chunksToLoad: TimeSpan[] = []
    const nodesToCheck: TimeTreeNode<any, any>[] = []

    chunksToConsider.forEach(c => {
        // Always another node, as decisecond level is already excluded earlier
        let member = node.members[c.toISOString()] as TimeTreeNode<any, any>

        if(!member)
            member = node.members[c.toISOString()] = { aggregationLevel: nextAggregationLevel, start: c, members: {}, loadingState: 'NOT_REQUESTED', requested: {} } as TimeTreeNode<any, any>
        
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

        if((cur.end.getTime() + 1)  === next.start.getTime()){
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
export function allocateTimeTreeAtLevel(node: TimeTreeNode<any, any>, start: Date, end: Date, level: AggregationLevels, loadingState: Exclude<LoadingStates, 'LOADED' | 'ERROR'>){

    // Stop allocating if this is the requested or maximum level to allocate to
    if(node.aggregationLevel === level)
        return
    
    const aggregationLevelIndex = aggregationLevelReverseMap[node.aggregationLevel]

    if(aggregationLevelIndex <= 0)
        return;

    const nextAggregationLevel = AggregationLevelMap[aggregationLevelIndex-1] as Exclude<AggregationLevels, typeof ETERNITY>

    const chunksToConsider = getChunksInRange(start, end, nextAggregationLevel)

    // For each chunk check if the member has to be created and do so if needed
    // Then repeat allocation on the member
    chunksToConsider.forEach(c => {
        let member = node.members[c.toISOString()] as TimeTreeNode<any, any>

        if(!member)
            member = node.members[c.toISOString()] = { aggregationLevel: nextAggregationLevel, start: c, members: {}, loadingState: loadingState, requested: {} }

        allocateTimeTreeAtLevel(member, start, end, level, loadingState)
    })
}

export function insertValue<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, value: TOwnData, aggregationLevel: Exclude<AggregationLevels, typeof ETERNITY>): void
export function insertValue<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, value: TLeafData): void
export function insertValue<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, value: TOwnData | TLeafData, maybeAggregationLevel?: Exclude<AggregationLevels, typeof ETERNITY>): void

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
        node.requested['leaf'] = true
        return
    }

    if(node.aggregationLevel === DECISECOND)
        throw new Error('DataStructureError: Cannot insert values below decisecond')

    const aggregationLevelIndex = aggregationLevelReverseMap[node.aggregationLevel]
    const nextAggregationLevel = AggregationLevelMap[aggregationLevelIndex-1] as Exclude<AggregationLevels, typeof ETERNITY>


    const rounded = roundToAggregationLevel(date, nextAggregationLevel)

    let member = node.members[rounded.toISOString()] as TimeTreeNode<TLeafData, TOwnData>
    
    if(!member)
        member = node.members[rounded.toISOString()] = {start: rounded, members: {}, loadingState: 'NOT_REQUESTED', aggregationLevel: nextAggregationLevel, requested: {}}

    insertValue(member, value, maybeAggregationLevel)
}

export function getValues<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, start: Date, end: Date, aggregationLevel: AggregationLevels): TOwnData[];
export function getValues<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, start: Date, end: Date): TLeafData[];
export function getValues<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, start: Date, end: Date, aggregationLevel?: AggregationLevels): (TLeafData | TOwnData)[];

export function getValues<TLeafData extends TimeTreeData, TOwnData extends TimeTreeData | never>(node: TimeTreeNode<TLeafData, TOwnData>, start: Date, end: Date, aggregationLevel?: AggregationLevels): (TLeafData | TOwnData)[]{
     
    
    // Stop allocating if this is the requested or maximum level to allocate to
    if(!aggregationLevel && node.aggregationLevel === DECISECOND)
        return Object.keys(node.members).map(k => node.members[k] as TLeafData).sort((a, b) => a.getDateTime().getTime() - b.getDateTime().getTime())
    
    const nodeAggregationLevelIndex = aggregationLevelReverseMap[node.aggregationLevel]

    if(node.aggregationLevel === aggregationLevel)
        return node.ownMeasurementValue ? [node.ownMeasurementValue] : []

    const nextAggregationLevel = AggregationLevelMap[nodeAggregationLevelIndex-1] as Exclude<AggregationLevels, typeof ETERNITY>
    const nodeTimeSpan = getNodeTimeSpan(node)

    const min = (start.getTime() > nodeTimeSpan.start.getTime() || node.aggregationLevel === 'eternity') ? start : nodeTimeSpan.start
    const max = (end.getTime() < nodeTimeSpan.start.getTime() || node.aggregationLevel === 'eternity') ? end : nodeTimeSpan.end

    const chunksToConsider = getChunksInRange(min, max, nextAggregationLevel)

    // For each chunk check if the member has to be created and do so if needed
    // Then repeat allocation on the member
    return chunksToConsider.map(c => {
        const member = node.members[c.toISOString()] as TimeTreeNode<TLeafData, TOwnData>

        if(!member)
            return []

        return getValues(member, start, end, aggregationLevel)
    }).flat()
}

