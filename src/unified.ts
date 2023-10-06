import {EditorView, Decoration, DecorationSet, WidgetType, gutter, GutterMarker} from "@codemirror/view"
import {EditorState, Text, Prec, RangeSetBuilder, StateField, StateEffect,
        RangeSet, ChangeSet} from "@codemirror/state"
import {language, highlightingFor} from "@codemirror/language"
import {highlightTree} from "@lezer/highlight"
import {Chunk} from "./chunk"
import {setChunks, ChunkField, mergeConfig} from "./merge"
import {Change} from "./diff"
import {decorateChunks} from "./deco"
import {baseTheme} from "./theme"

interface UnifiedMergeConfig {
  /// The other document to compare the editor content with.
  original: Text | string
  /// By default, the merge view will mark inserted and deleted text
  /// in changed chunks. Set this to false to turn that off.
  highlightChanges?: boolean
  /// Controls whether a gutter marker is shown next to changed lines.
  gutter?: boolean
  /// By default, deleted chunks are highlighted using the main
  /// editor's language. Since these are just fragments, not full
  /// documents, this doesn't always work well. Set this option to
  /// false to disable syntax highlighting for deleted lines.
  syntaxHighlightDeletions?: boolean
  /// Controls whether accept/reject buttons are displayed for each
  /// changed chunk. Defaults to true.
  mergeControls?: boolean
}

const deletedChunkGutterMarker = new class extends GutterMarker {
  elementClass = "cm-deletedLineGutter"
}

const unifiedChangeGutter = Prec.low(gutter({
  class: "cm-changeGutter",
  markers: view => view.plugin(decorateChunks)?.gutter || RangeSet.empty,
  widgetMarker: (view, widget) => widget instanceof DeletionWidget ? deletedChunkGutterMarker : null
}))

/// Create an extension that causes the editor to display changes
/// between its content and the given original document. Changed
/// chunks will be highlighted, with uneditable widgets displaying the
/// original text displayed above the new text.
export function unifiedMergeView(config: UnifiedMergeConfig) {
  let orig = typeof config.original == "string" ? Text.of(config.original.split(/\r?\n/)) : config.original
  return [
    Prec.low(decorateChunks),
    deletedChunks,
    baseTheme,
    EditorView.editorAttributes.of({class: "cm-merge-b"}),
    EditorState.transactionExtender.of(tr => {
      let updateDoc = tr.effects.find(e => e.is(updateOriginalDoc))
      if (!tr.docChanged && !updateDoc) return null
      let prev = tr.startState.field(ChunkField)
      let chunks = updateDoc ? Chunk.updateA(prev, updateDoc.value.doc, tr.newDoc, updateDoc.value.changes)
        : Chunk.updateB(prev, tr.startState.field(originalDoc), tr.newDoc, tr.changes)
      return {effects: setChunks.of(chunks)}
    }),
    mergeConfig.of({
      highlightChanges: config.highlightChanges !== false,
      markGutter: config.gutter !== false,
      syntaxHighlightDeletions: config.syntaxHighlightDeletions !== false,
      mergeControls: config.mergeControls !== false,
      side: "b"
    }),
    originalDoc.init(() => orig),
    config.gutter !== false ? unifiedChangeGutter : [],
    ChunkField.init(state => Chunk.build(orig, state.doc))
  ]
}

const updateOriginalDoc = StateEffect.define<{doc: Text, changes: ChangeSet}>()

const originalDoc = StateField.define<Text>({
  create: () => Text.empty,
  update(doc, tr) {
    for (let e of tr.effects) if (e.is(updateOriginalDoc)) doc = e.value.doc
    return doc
  }
})

const DeletionWidgets: WeakMap<readonly Change[], Decoration> = new WeakMap

class DeletionWidget extends WidgetType {
  dom: HTMLElement | null = null
  constructor(readonly buildDOM: (view: EditorView) => HTMLElement) { super() }
  eq(other: DeletionWidget) { return this.dom == other.dom }
  toDOM(view: EditorView) { return this.dom || (this.dom = this.buildDOM(view)) }
}

function deletionWidget(state: EditorState, chunk: Chunk) {
  let known = DeletionWidgets.get(chunk.changes)
  if (known) return known

  let buildDOM = (view: EditorView) => {
    let {highlightChanges, syntaxHighlightDeletions, mergeControls} = state.facet(mergeConfig)
    let text = view.state.field(originalDoc).sliceString(chunk.fromA, chunk.endA)
    let lang = syntaxHighlightDeletions && state.facet(language)
    let dom = document.createElement("div")
    dom.className = "cm-deletedChunk"
    if (mergeControls) {
      let buttons = dom.appendChild(document.createElement("div"))
      buttons.className = "cm-chunkButtons"
      let accept = buttons.appendChild(document.createElement("button"))
      accept.name = "accept"
      accept.textContent = state.phrase("Accept")
      accept.onmousedown = e => { e.preventDefault(); acceptChunk(view, view.posAtDOM(dom)) }
      let reject = buttons.appendChild(document.createElement("button"))
      reject.name = "reject"
      reject.textContent = state.phrase("Reject")
      reject.onmousedown = e => { e.preventDefault(); rejectChunk(view, view.posAtDOM(dom)) }
    }

    let content = dom.appendChild(document.createElement("del"))
    let changes = chunk.changes, changeI = 0, inside = false
    function add(from: number, to: number, cls: string) {
      for (let at = from; at < to;) {
        let nextStop = to, nodeCls = cls + (inside ? " cm-deletedText" : "")
        if (highlightChanges && changeI < changes.length) {
          let nextBound = inside ? changes[changeI].toA : changes[changeI].fromA
          if (nextBound <= nextStop) {
            nextStop = nextBound
            if (inside) changeI++
            inside = !inside
          }
        }
        if (nextStop > at) {
          let node = document.createTextNode(text.slice(at, nextStop))
          if (nodeCls) {
            let span = dom.appendChild(document.createElement("span"))
            span.className = nodeCls
            content.appendChild(node)
          } else {
            content.appendChild(node)
          }
        }
        at = nextStop
      }
    }

    if (lang) {
      let tree = lang.parser.parse(text), pos = 0
      highlightTree(tree, {style: tags => highlightingFor(state, tags)}, (from, to, cls) => {
        if (from > pos) add(pos, from, "")
        add(from, to, cls)
        pos = to
      })
      add(pos, text.length, "")
    } else {
      add(0, text.length, "")
    }
    return dom
  }
  let deco = Decoration.widget({
    block: true,
    side: -1,
    widget: new DeletionWidget(buildDOM)
  })
  DeletionWidgets.set(chunk.changes, deco)
  return deco
}

/// In a [unified](#merge.unifiedMergeView) merge view, accept the
/// chunk under the given position or the cursor. This chunk will no
/// longer be highlighted unless it is edited again.
export function acceptChunk(view: EditorView, pos?: number) {
  let {state} = view, at = pos ?? state.selection.main.head
  let chunk = view.state.field(ChunkField).find(ch => ch.fromB <= at && ch.endB >= at)
  if (!chunk) return false
  let insert = view.state.sliceDoc(chunk.fromB, Math.max(chunk.fromB, chunk.toB - 1))
  let orig = view.state.field(originalDoc)
  if (chunk.fromB != chunk.toB && chunk.toA <= orig.length) insert += view.state.lineBreak
  let changes = ChangeSet.of({from: chunk.fromA, to: Math.min(orig.length, chunk.toA), insert}, orig.length)
  view.dispatch({effects: updateOriginalDoc.of({doc: changes.apply(orig), changes})})
  return true
}

/// In a [unified](#merge.unifiedMergeView) merge view, reject the
/// chunk under the given position or the cursor. Reverts that range
/// to the content it has in the original document.
export function rejectChunk(view: EditorView, pos?: number) {
  let {state} = view, at = pos ?? state.selection.main.head
  let chunk = state.field(ChunkField).find(ch => ch.fromB <= at && ch.endB >= at)
  if (!chunk) return false
  let orig = state.field(originalDoc)
  let insert = orig.sliceString(chunk.fromA, Math.max(chunk.fromA, chunk.toA - 1))
  if (chunk.fromA != chunk.toA && chunk.toB <= state.doc.length) insert += state.lineBreak
  view.dispatch({
    changes: {from: chunk.fromB, to: Math.min(state.doc.length, chunk.toB), insert},
    userEvent: "revert"
  })
  return true
}

function buildDeletedChunks(state: EditorState) {
  let builder = new RangeSetBuilder<Decoration>()
  for (let ch of state.field(ChunkField))
    builder.add(ch.fromB, ch.fromB, deletionWidget(state, ch))
  return builder.finish()
}

const deletedChunks = StateField.define<DecorationSet>({
  create: state => buildDeletedChunks(state),
  update(deco, tr) {
    return tr.state.field(ChunkField, false) != tr.startState.field(ChunkField, false) ? buildDeletedChunks(tr.state) : deco
  },
  provide: f => EditorView.decorations.from(f)
})
