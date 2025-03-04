import {EditorView, Decoration, GutterMarker} from "@codemirror/view"
import {EditorState, EditorSelection, Facet, StateEffect, StateField, StateCommand, RangeSetBuilder} from "@codemirror/state"
import {Chunk} from "./chunk"

type Config = {
  sibling?: () => EditorView,
  highlightChanges: boolean,
  markGutter: boolean,
  syntaxHighlightDeletions?: boolean,
  syntaxHighlightDeletionsMaxLength?: number,
  mergeControls?: boolean,
  overrideChunk?: ((
    state: EditorState,
    chunk: Chunk,
    builder: RangeSetBuilder<Decoration>,
    gutterBuilder: RangeSetBuilder<GutterMarker> | null
  ) => boolean) | undefined,
  side: "a" | "b"
}

export const mergeConfig = Facet.define<Config, Config>({
  combine: values => values[0]
})


export const setChunks = StateEffect.define<readonly Chunk[]>()

export const ChunkField = StateField.define<readonly Chunk[]>({
  create(state) {
    return null as any
  },
  update(current, tr) {
    for (let e of tr.effects) if (e.is(setChunks)) current = e.value
    return current
  }
})


/// Get the changed chunks for the merge view that this editor is part
/// of, plus the side it is on if it is part of a `MergeView`. Returns
/// null if the editor doesn't have a merge extension active or the
/// merge view hasn't finished initializing yet.
export function getChunks(state: EditorState) {
  let field = state.field(ChunkField, false)
  if (!field) return null
  let conf = state.facet(mergeConfig)
  return {chunks: field, side: conf ? conf.side : null}
}

let moveByChunk = (dir: -1 | 1): StateCommand => ({state, dispatch}) => {
  let chunks = state.field(ChunkField, false), conf = state.facet(mergeConfig)
  if (!chunks || !chunks.length || !conf) return false
  let {head} = state.selection.main, pos = 0
  for (let i = chunks.length - 1; i >= 0; i--) {
    let chunk = chunks[i]
    let [from, to] = conf.side == "b" ? [chunk.fromB, chunk.toB] : [chunk.fromA, chunk.toA]
    if (to < head) { pos = i + 1; break }
    if (from <= head) {
      if (chunks.length == 1) return false
      pos = i + (dir < 0 ? 0 : 1)
      break
    }
  }
  let next = chunks[(pos + (dir < 0 ? chunks.length - 1 : 0)) % chunks.length]
  let [from, to] = conf.side == "b" ? [next.fromB, next.toB] : [next.fromA, next.toA]
  dispatch(state.update({
    selection: {anchor: from},
    userEvent: "select.byChunk",
    effects: EditorView.scrollIntoView(EditorSelection.range(to, from))
  }))
  return true
}

/// Move the selection to the next changed chunk.
export const goToNextChunk = moveByChunk(1)

/// Move the selection to the previous changed chunk.
export const goToPreviousChunk = moveByChunk(-1)
