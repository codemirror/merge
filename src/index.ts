export {Change, diff, presentableDiff} from "./diff"

export {MergeConfig, DirectMergeConfig, MergeView, getChunks} from "./mergeview"

export {Chunk} from "./chunk"

import {buildChunks, updateChunksA, updateChunksB} from "./chunk"
/// @internal
export const __test = {buildChunks, updateChunksA, updateChunksB}
