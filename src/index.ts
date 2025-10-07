export {Change, diff, presentableDiff, DiffConfig} from "./diff"

export {getChunks, goToNextChunk, goToPreviousChunk} from "./merge"

export {MergeConfig, DirectMergeConfig, MergeView} from "./mergeview"

export {unifiedMergeView, acceptChunk, rejectChunk, getOriginalDoc,
        originalDocChangeEffect, updateOriginalDoc} from "./unified"

export {uncollapseUnchanged, mergeViewSiblings} from "./deco"

export {Chunk} from "./chunk"
