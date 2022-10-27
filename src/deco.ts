import {EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate} from "@codemirror/view"
import {RangeSetBuilder, Range, Text} from "@codemirror/state"
import {Chunk} from "./chunk"
import {MergeView} from "./mergeview"

export function decorateChunks(mv: MergeView, isA: boolean) {
  return ViewPlugin.fromClass(class {
    deco: DecorationSet

    constructor(view: EditorView) {
      this.deco = buildChunkDeco(view, mv.chunks, isA)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged)
        this.deco = buildChunkDeco(update.view, mv.chunks, isA)
    }
  }, {
    decorations: d => d.deco
  })
}

const changedLine = Decoration.line({class: "cm-changedLine"})
const changedText = Decoration.mark({class: "cm-changedText"})

function prepareDeco(chunk: Chunk, doc: Text, isA: boolean) {
  let from = isA ? chunk.fromA : chunk.fromB, to = isA ? chunk.toA : chunk.toB
  let changeI = 0, deco: Range<Decoration>[] = []
  if (from != to) for (let iter = doc.iterLines(from, to), pos = 0; !iter.next().done;) {
    deco.push(changedLine.range(pos))
    let lineEnd = pos + iter.value.length
    while (changeI < chunk.changes.length) {
      let nextChange = chunk.changes[changeI]
      let nextFrom = isA ? nextChange.fromA : nextChange.fromB
      let nextTo = isA ? nextChange.toA : nextChange.toB
      let chFrom = Math.max(pos, nextFrom), chTo = Math.min(lineEnd, nextTo)
      if (chFrom < chTo) deco.push(changedText.range(chFrom, chTo))
      if (nextTo < lineEnd) changeI++
      else break
    }
    pos = lineEnd + 1
  }
  return deco
}

function buildChunkDeco(view: EditorView, chunks: readonly Chunk[], isA: boolean) {
  let builder = new RangeSetBuilder<Decoration>()
  for (let chunk of chunks) {
    let deco = (isA ? chunk.decoA : chunk.decoB) ||
      (chunk[isA ? "decoA" : "decoB"] = prepareDeco(chunk, view.state.doc, isA))
    let from = isA ? chunk.fromA : chunk.toA
    for (let d of deco) builder.add(from + d.from, from + d.to, d.value)
  }
  return builder.finish()
}
