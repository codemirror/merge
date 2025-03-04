import {EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate,
        WidgetType, GutterMarker, gutter} from "@codemirror/view"
import {EditorState, RangeSetBuilder, Text, StateField, StateEffect, RangeSet, Prec} from "@codemirror/state"
import {Chunk} from "./chunk"
import {ChunkField, mergeConfig} from "./merge"

export const decorateChunks = ViewPlugin.fromClass(class {
  deco: DecorationSet
  gutter: RangeSet<GutterMarker> | null

  constructor(view: EditorView) {
    ({deco: this.deco, gutter: this.gutter} = getChunkDeco(view))
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || chunksChanged(update.startState, update.state) ||
        configChanged(update.startState, update.state))
      ({deco: this.deco, gutter: this.gutter} = getChunkDeco(update.view))
  }
}, {
  decorations: d => d.deco
})

export const changeGutter = Prec.low(gutter({
  class: "cm-changeGutter",
  markers: view => view.plugin(decorateChunks)?.gutter || RangeSet.empty
}))

function chunksChanged(s1: EditorState, s2: EditorState) {
  return s1.field(ChunkField, false) != s2.field(ChunkField, false)
}

function configChanged(s1: EditorState, s2: EditorState) {
  return s1.facet(mergeConfig) != s2.facet(mergeConfig)
}

const changedLine = Decoration.line({class: "cm-changedLine"})
export const changedText = Decoration.mark({class: "cm-changedText"})
const inserted = Decoration.mark({tagName: "ins", class: "cm-insertedLine"})
const deleted = Decoration.mark({tagName: "del", class: "cm-deletedLine"})

const changedLineGutterMarker = new class extends GutterMarker {
  elementClass = "cm-changedLineGutter"
}

function buildChunkDeco(chunk: Chunk, doc: Text, isA: boolean, highlight: boolean,
                        builder: RangeSetBuilder<Decoration>,
                        gutterBuilder: RangeSetBuilder<GutterMarker> | null) {
  let from = isA ? chunk.fromA : chunk.fromB, to = isA ? chunk.toA : chunk.toB
  let changeI = 0
  if (from != to) {
    builder.add(from, from, changedLine)
    builder.add(from, to, isA ? deleted : inserted)
    if (gutterBuilder) gutterBuilder.add(from, from, changedLineGutterMarker)
    for (let iter = doc.iterRange(from, to - 1), pos = from; !iter.next().done;) {
      if (iter.lineBreak) {
        pos++
        builder.add(pos, pos, changedLine)
        if (gutterBuilder) gutterBuilder.add(pos, pos, changedLineGutterMarker)
        continue
      }
      let lineEnd = pos + iter.value.length
      if (highlight) while (changeI < chunk.changes.length) {
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

function getChunkDeco(view: EditorView) {
  let chunks = view.state.field(ChunkField)
  let {side, highlightChanges, markGutter, overrideChunk} = view.state.facet(mergeConfig), isA = side == "a"
  let builder = new RangeSetBuilder<Decoration>()
  let gutterBuilder = markGutter ? new RangeSetBuilder<GutterMarker>() : null
  let {from, to} = view.viewport
  for (let chunk of chunks) {
    if ((isA ? chunk.fromA : chunk.fromB) >= to) break
    if ((isA ? chunk.toA : chunk.toB) > from) {
      if (!overrideChunk || !overrideChunk(view.state, chunk, builder, gutterBuilder))
        buildChunkDeco(chunk, view.state.doc, isA, highlightChanges, builder, gutterBuilder)
    }
  }
  return {deco: builder.finish(), gutter: gutterBuilder && gutterBuilder.finish()}
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

const epsilon = .01

function compareSpacers(a: DecorationSet, b: DecorationSet) {
  if (a.size != b.size) return false
  let iA = a.iter(), iB = b.iter()
  while (iA.value) {
    if (iA.from != iB.from ||
        Math.abs((iA.value.spec.widget as Spacer).height - (iB.value!.spec.widget as Spacer).height) > 1)
      return false
    iA.next(); iB.next()
  }
  return true
}

export function updateSpacers(a: EditorView, b: EditorView, chunks: readonly Chunk[]) {
  let buildA = new RangeSetBuilder<Decoration>(), buildB = new RangeSetBuilder<Decoration>()
  let spacersA = a.state.field(Spacers).iter(), spacersB = b.state.field(Spacers).iter()
  let posA = 0, posB = 0, offA = 0, offB = 0, vpA = a.viewport, vpB = b.viewport
  chunks: for (let chunkI = 0;; chunkI++) {
    let chunk = chunkI < chunks.length ? chunks[chunkI] : null
    let endA = chunk ? chunk.fromA : a.state.doc.length, endB = chunk ? chunk.fromB : b.state.doc.length
    // A range at posA/posB is unchanged, must be aligned.
    if (posA < endA) {
      let heightA = a.lineBlockAt(posA).top + offA
      let heightB = b.lineBlockAt(posB).top + offB
      let diff = heightA - heightB
      if (diff < -epsilon) {
        offA -= diff
        buildA.add(posA, posA, Decoration.widget({
          widget: new Spacer(-diff),
          block: true,
          side: -1
        }))
      } else if (diff > epsilon) {
        offB += diff
        buildB.add(posB, posB, Decoration.widget({
          widget: new Spacer(diff),
          block: true,
          side: -1
        }))
      }
    }
    // If the viewport starts inside the unchanged range (on both
    // sides), add another sync at the top of the viewport. That way,
    // big unchanged chunks with possibly inaccurate estimated heights
    // won't cause the content to misalign (#1408)
    if (endA > posA + 1000 && posA < vpA.from && endA > vpA.from && posB < vpB.from && endB > vpB.from) {
      let off = Math.min(vpA.from - posA, vpB.from - posB)
      posA += off; posB += off
      chunkI--
    } else if (!chunk) {
      break
    } else {
      posA = chunk.toA; posB = chunk.toB
    }
    while (spacersA.value && spacersA.from < posA) {
      offA -= (spacersA.value.spec.widget as Spacer).height
      spacersA.next()
    }
    while (spacersB.value && spacersB.from < posB) {
      offB -= (spacersB.value.spec.widget as Spacer).height
      spacersB.next()
    }
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
  if (docDiff < epsilon) {
    buildA.add(a.state.doc.length, a.state.doc.length, Decoration.widget({
      widget: new Spacer(-docDiff),
      block: true,
      side: 1
    }))
  } else if (docDiff > epsilon) {
    buildB.add(b.state.doc.length, b.state.doc.length, Decoration.widget({
      widget: new Spacer(docDiff),
      block: true,
      side: 1
    }))
  }

  let decoA = buildA.finish(), decoB = buildB.finish()
  if (!compareSpacers(decoA, a.state.field(Spacers)))
    a.dispatch({effects: adjustSpacers.of(decoA)})
  if (!compareSpacers(decoB, b.state.field(Spacers)))
    b.dispatch({effects: adjustSpacers.of(decoB)})
}

/// A state effect that expands the section of collapsed unchanged
/// code starting at the given position.
export const uncollapseUnchanged = StateEffect.define<number>({
  map: (value, change) => change.mapPos(value)
})

class CollapseWidget extends WidgetType {
  constructor(readonly lines: number) { super() }

  eq(other: CollapseWidget) { return this.lines == other.lines }

  toDOM(view: EditorView) {
    let outer = document.createElement("div")
    outer.className = "cm-collapsedLines"
    outer.textContent = view.state.phrase("$ unchanged lines", this.lines)
    outer.addEventListener("click", e => {
      let pos = view.posAtDOM(e.target as HTMLElement)
      view.dispatch({effects: uncollapseUnchanged.of(pos)})
      let {side, sibling} = view.state.facet(mergeConfig)
      if (sibling) sibling().dispatch({effects: uncollapseUnchanged.of(mapPos(pos, view.state.field(ChunkField), side == "a"))})
    })
    return outer
  }

  ignoreEvent(e: Event) { return e instanceof MouseEvent }

  get estimatedHeight() { return 27 }

  get type() { return "collapsed-unchanged-code" }
}

function mapPos(pos: number, chunks: readonly Chunk[], isA: boolean) {
  let startOur = 0, startOther = 0
  for (let i = 0;; i++) {
    let next = i < chunks.length ? chunks[i] : null
    if (!next || (isA ? next.fromA : next.fromB) >= pos) return startOther + (pos - startOur)
    ;[startOur, startOther] = isA ? [next.toA, next.toB] : [next.toB, next.toA]
  }
}

const CollapsedRanges = StateField.define<DecorationSet>({
  create(state) { return Decoration.none },
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (let e of tr.effects) if (e.is(uncollapseUnchanged))
      deco = deco.update({filter: from => from != e.value})
    return deco
  },
  provide: f => EditorView.decorations.from(f)
})

export function collapseUnchanged({margin = 3, minSize = 4}: {margin?: number, minSize?: number}) {
  return CollapsedRanges.init(state => buildCollapsedRanges(state, margin, minSize))
}

function buildCollapsedRanges(state: EditorState, margin: number, minLines: number) {
  let builder = new RangeSetBuilder<Decoration>()
  let isA = state.facet(mergeConfig).side == "a"
  let chunks = state.field(ChunkField)
  let prevLine = 1
  for (let i = 0;; i++) {
    let chunk = i < chunks.length ? chunks[i] : null
    let collapseFrom = i ? prevLine + margin : 1
    let collapseTo = chunk ? state.doc.lineAt(isA ? chunk.fromA : chunk.fromB).number - 1 - margin : state.doc.lines
    let lines = collapseTo - collapseFrom + 1
    if (lines >= minLines) {
      builder.add(state.doc.line(collapseFrom).from, state.doc.line(collapseTo).to, Decoration.replace({
        widget: new CollapseWidget(lines),
        block: true
      }))
    }
    if (!chunk) break
    prevLine = state.doc.lineAt(Math.min(state.doc.length, isA ? chunk.toA : chunk.toB)).number
  }
  return builder.finish()
}
