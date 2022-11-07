import {diff as _diff} from "./diff"

/// Compute the difference between two strings. Returns an array of
/// changed ranges (empty when the strings are identical).
export const diff = _diff as (a: string, b: string) => readonly {fromA: number, toA: number, fromB: number, toB: number}[]

export {MergeView} from "./mergeview"

import {getChunks, updateChunksA, updateChunksB} from "./chunk"
/// @internal
export const __test = {getChunks, updateChunksA, updateChunksB}
