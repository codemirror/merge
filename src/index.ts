import {diff as _diff, presentableDiff as _pDiff} from "./diff"

/// Diffs are represented as arrays of changed ranges.
export type Changes = readonly {fromA: number, toA: number, fromB: number, toB: number}[]

/// Compute the difference between two strings.
export const diff = _diff as (a: string, b: string) => Changes

/// Compute the difference between the given strings, and clean up the
/// resulting diff for presentation to users by dropping short
/// unchanged ranges, and aligning changes to word boundaries when
/// appropriate.
export const presentableDiff = _pDiff as (a: string, b: string) => Changes

export {MergeView} from "./mergeview"

import {getChunks, updateChunksA, updateChunksB} from "./chunk"
/// @internal
export const __test = {getChunks, updateChunksA, updateChunksB}
