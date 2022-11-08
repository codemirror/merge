import {EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType} from "@codemirror/view"
import {EditorState, RangeSetBuilder, Text, Prec, StateField, StateEffect, RangeSet} from "@codemirror/state"
import {Chunk, ChunkField, Side} from "./chunk"

export const decorateChunks = Prec.low(ViewPlugin.fromClass(class {
  deco: DecorationSet

  constructor(view: EditorView) {
    this.deco = getChunkDeco(view, view.state.field(ChunkField))
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || chunksChanged(update.startState, update.state))
      this.deco = getChunkDeco(update.view, update.state.field(ChunkField))
  }
}, {
  decorations: d => d.deco
}))

function chunksChanged(s1: EditorState, s2: EditorState) {
  return s1.field(ChunkField, false) != s2.field(ChunkField, false)
}

const changedLine = Decoration.line({class: "cm-changedLine"})
const changedText = Decoration.mark({class: "cm-changedText"})

function buildChunkDeco(chunk: Chunk, doc: Text, isA: boolean, builder: RangeSetBuilder<Decoration>) {
  let from = isA ? chunk.fromA : chunk.fromB, to = isA ? chunk.toA : chunk.toB
  let changeI = 0
  if (from != to) {
    builder.add(from, from, changedLine)
    for (let iter = doc.iterRange(from, to - 1), pos = from; !iter.next().done;) {
      if (iter.lineBreak) {
        pos++
        builder.add(pos, pos, changedLine)
        continue
      }
      let lineEnd = pos + iter.value.length
      while (changeI < chunk.changes.length) {
        let nextChange = chunk.changes[changeI]
        let nextFrom = from + (isA ? nextChange.fromA : nextChange.fromB)
        let nextTo = from + (isA ? nextChange.toA : nextChange.toB)
        let chFrom = Math.max(pos, nextFrom), chTo = Math.min(lineEnd, nextTo)
        if (chFrom < chTo) builder.add(chFrom, chTo, changedText)
        if (nextTo < lineEnd) changeI++
        else break
      }
      pos = lineEnd
    }
  }
}

function getChunkDeco(view: EditorView, chunks: readonly Chunk[]) {
  let isA = view.state.facet(Side) == "a"
  let builder = new RangeSetBuilder<Decoration>()
  let {from, to} = view.viewport
  for (let chunk of chunks) {
    if ((isA ? chunk.fromA : chunk.fromB) >= to) break
    if ((isA ? chunk.toA : chunk.toB) > from) buildChunkDeco(chunk, view.state.doc, isA, builder)
  }
  return builder.finish()
}

class Spacer extends WidgetType {
  constructor(readonly height: number) { super() }

  eq(other: Spacer) { return this.height == other.height }

  toDOM() {
    let elt = document.createElement("div")
    elt.className = "cm-mergeSpacer"
    elt.style.height = this.height + "px"
    return elt
  }

  updateDOM(dom: HTMLElement) {
    dom.style.height = this.height + "px"
    return true
  }

  get estimatedHeight() { return this.height }

  ignoreEvent() { return false }
}

export const adjustSpacers = StateEffect.define<DecorationSet>({
  map: (value, mapping) => value.map(mapping)
})

export const Spacers = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (spacers, tr) => {
    for (let e of tr.effects) if (e.is(adjustSpacers)) return e.value
    return spacers.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f)
})

const epsilon = .0001

export function updateSpacers(a: EditorView, b: EditorView, chunks: readonly Chunk[]) {
  let buildA = new RangeSetBuilder<Decoration>(), buildB = new RangeSetBuilder<Decoration>()
  let linesA = a.viewportLineBlocks, linesB = b.viewportLineBlocks, iA = 0, iB = 0
  let spacersA = a.state.field(Spacers).iter(), spacersB = b.state.field(Spacers).iter()
  let posA = 0, posB = 0, offA = 0, offB = 0
  chunks: for (let chunkI = 0;; chunkI++) {
    let chunk = chunkI < chunks.length ? chunks[chunkI] : null
    let [endA, endB] = chunk ? [chunk.fromA, chunk.fromB] : [a.state.doc.length, b.state.doc.length]
    // Find lines whose start lies in the unchanged pos-end ranges and
    // who have a matching line in the other editor.
    if (posA < endA && posB < endB) for (;;) {
      if (iA == linesA.length || iB == linesB.length) break chunks
      let lineA = linesA[iA], lineB = linesB[iB]
      while (spacersA.value && spacersA.from < lineA.from) {
        offA -= (spacersA.value.spec.widget as any).height
        spacersA.next()
      }
      while (spacersB.value && spacersB.from < lineB.from) {
        offB -= (spacersB.value.spec.widget as any).height
        spacersB.next()
      }
      if (lineA.from >= endA || lineB.from >= endB) break
      let relA = lineA.from - posA, relB = lineB.from - posB
      if (relA < 0 || relA < relB) {
        iA++
      } else if (relB < 0 || relB < relA) {
        iB++
      } else { // Align these two lines
        let diff = (lineA.top + offA) - (lineB.top + offB)
        if (diff < -epsilon) {
          offA -= diff
          buildA.add(lineA.from, lineA.from, Decoration.widget({
            widget: new Spacer(-diff),
            block: true,
            side: -1
          }))
        } else if (diff > epsilon) {
          offB += diff
          buildB.add(lineB.from, lineB.from, Decoration.widget({
            widget: new Spacer(diff),
            block: true,
            side: -1
          }))
        }
        iA++; iB++
      }
    }
    if (!chunk) break
    posA = chunk.toA; posB = chunk.toB
  }
  while (spacersA.value) {
    offA -= (spacersA.value.spec.widget as any).height
    spacersA.next()
  }
  while (spacersB.value) {
    offB -= (spacersB.value.spec.widget as any).height
    spacersB.next()
  }
  let docDiff = (a.contentHeight + offA) - (b.contentHeight + offB)
  if (docDiff < epsilon) buildA.add(a.state.doc.length, a.state.doc.length, Decoration.widget({
    widget: new Spacer(-docDiff),
    block: true,
    side: 1
  }))
  else if (docDiff > epsilon) buildB.add(b.state.doc.length, b.state.doc.length, Decoration.widget({
    widget: new Spacer(docDiff),
    block: true,
    side: 1
  }))

  let decoA = buildA.finish(), decoB = buildB.finish()
  if (!RangeSet.eq([decoA], [a.state.field(Spacers)]))
    a.dispatch({effects: adjustSpacers.of(decoA)})
  if (!RangeSet.eq([decoB], [b.state.field(Spacers)]))
    b.dispatch({effects: adjustSpacers.of(decoB)})
}
