import {EditorView} from "@codemirror/view"
import {EditorStateConfig, Transaction, EditorState, StateEffect, Prec} from "@codemirror/state"
import {Chunk, buildChunks, updateChunksA, updateChunksB, setChunks, ChunkField} from "./chunk"
import {decorateChunks, updateSpacers, Spacers, adjustSpacers, collapseUnchanged,
        mergeConfig, changeGutter} from "./deco"
import {baseTheme, externalTheme} from "./theme"

type MergeConfig = {
  /// Configuration for the first editor (the left one in a
  /// left-to-right context).
  a: EditorStateConfig
  /// Configuration for the second editor.
  b: EditorStateConfig
  /// Parent element to append the view to.
  parent?: Element | DocumentFragment
  /// An optional root. Only necessary if the view is mounted in a
  /// shadow root or a document other than the global `document`
  /// object.
  root?: Document | ShadowRoot
  /// Controls whether editor A or editor B is shown first. Defaults
  /// to `"a-b"`.
  orientation?: "a-b" | "b-a",
  /// Controls whether revert controls are shown between changed
  /// chunks.
  revertControls?: "a-to-b" | "b-to-a"
  /// When given, this function is called to render the button to
  /// revert a chunk.
  renderRevertControl?: () => HTMLElement,
  /// By default, the merge view will mark inserted and deleted text
  /// in changed chunks. Set this to false to turn that off.
  highlightChanges?: boolean,
  /// Controls whether a gutter marker is shown next to changed lines.
  gutter?: boolean,
  /// When given, long stretches of unchanged text are collapsed.
  /// `margin` gives the number of lines to leave visible after/before
  /// a change (default is 3), and `minSize` gives the minimum amount
  /// of collapsible lines that need to be present (defaults to 4).
  collapseUnchanged?: {margin?: number, minSize?: number}
}

/// A merge view manages two editors side-by-side, highlighting the
/// difference between them and vertically aligning unchanged lines.
/// If you want one of the editors to be read-only, you have to
/// configure that in its extensions.
///
/// By default, views are not scrollable. Style them (`.cm-mergeView`)
/// with a height and `overflow: auto` to make them scrollable.
export class MergeView {
  /// The first editor.
  a: EditorView
  /// The second editor.
  b: EditorView

  /// The outer DOM element holding the view.
  dom: HTMLElement
  private editorDOM: HTMLElement
  private revertDOM: HTMLElement | null = null
  private revertToA = false
  private revertToLeft = false
  private renderRevert: (() => HTMLElement) | undefined

  /// The current set of changed chunks.
  chunks: readonly Chunk[]

  private measuring = -1

  /// Create a new merge view.
  constructor(config: MergeConfig) {
    let sharedExtensions = [
      Prec.low(decorateChunks),
      config.gutter !== false ? Prec.low(changeGutter) : [],
      baseTheme,
      externalTheme,
      Spacers,
      EditorView.updateListener.of(update => {
        if (this.measuring < 0 && (update.heightChanged || update.viewportChanged) &&
            !update.transactions.some(tr => tr.effects.some(e => e.is(adjustSpacers))))
          this.measure()
      }),
    ]

    let stateA = EditorState.create({
      doc: config.a.doc,
      selection: config.a.selection,
      extensions: [
        config.a.extensions || [],
        EditorView.editorAttributes.of({class: "cm-merge-a"}),
        mergeConfig.of({
          side: "a",
          sibling: () => this.b,
          highlightChanges: config.highlightChanges !== false,
          markGutter: config.gutter !== false
        }),
        sharedExtensions
      ]
    })
    let stateB = EditorState.create({
      doc: config.b.doc,
      selection: config.b.selection,
      extensions: [
        config.b.extensions || [],
        EditorView.editorAttributes.of({class: "cm-merge-b"}),
        mergeConfig.of({
          side: "b",
          sibling: () => this.a,
          highlightChanges: config.highlightChanges !== false,
          markGutter: config.gutter !== false
        }),
        sharedExtensions
      ]
    })
    this.chunks = buildChunks(stateA.doc, stateB.doc)
    let addA = [ChunkField.init(() => this.chunks)], addB = addA.slice()
    if (config.collapseUnchanged) {
      let {margin = 3, minSize = 4} = config.collapseUnchanged
      addA.push(collapseUnchanged(margin, minSize, true))
      addB.push(collapseUnchanged(margin, minSize, false))
    }
    stateA = stateA.update({effects: StateEffect.appendConfig.of(addA)}).state
    stateB = stateB.update({effects: StateEffect.appendConfig.of(addB)}).state

    this.dom = document.createElement("div")
    this.dom.className = "cm-mergeView"
    this.editorDOM = this.dom.appendChild(document.createElement("div"))
    this.editorDOM.className = "cm-mergeViewEditors"
    let orientation = config.orientation || "a-b"
    let wrapA = document.createElement("div")
    wrapA.className = "cm-mergeViewEditor"
    let wrapB = document.createElement("div")
    wrapB.className = "cm-mergeViewEditor"
    this.editorDOM.appendChild(orientation == "a-b" ? wrapA : wrapB)
    if (config.revertControls) {
      this.revertDOM = this.editorDOM.appendChild(document.createElement("div"))
      this.revertToA = config.revertControls == "b-to-a"
      this.revertToLeft = this.revertToA == (orientation == "a-b")
      this.renderRevert = config.renderRevertControl
      this.revertDOM.addEventListener("mousedown", e => this.revertClicked(e))
      this.revertDOM.className = "cm-merge-revert"
    }
    this.editorDOM.appendChild(orientation == "a-b" ? wrapB : wrapA)
    this.a = new EditorView({
      state: stateA,
      parent: wrapA,
      root: config.root,
      dispatch: tr => this.dispatch(tr, this.a)
    })
    this.b = new EditorView({
      state: stateB,
      parent: wrapB,
      root: config.root,
      dispatch: tr => this.dispatch(tr, this.b)
    })
    if (config.parent) config.parent.appendChild(this.dom)
    this.scheduleMeasure()
  }

  private dispatch(tr: Transaction, target: EditorView) {
    if (tr.docChanged) {
      this.chunks = target == this.a ? updateChunksA(this.chunks, tr, this.b.state.doc)
        : updateChunksB(this.chunks, tr, this.a.state.doc)
      target.update([tr, tr.state.update({effects: setChunks.of(this.chunks)})])
      let other = target == this.a ? this.b : this.a
      other.update([other.state.update({effects: setChunks.of(this.chunks)})])
      this.scheduleMeasure()
    } else {
      target.update([tr])
    }
  }

  private scheduleMeasure() {
    if (this.measuring < 0) {
      let win = (this.dom.ownerDocument.defaultView || window)
      this.measuring = win.requestAnimationFrame(() => {
        this.measuring = -1
        this.measure()
      })
    }
  }

  private measure() {
    updateSpacers(this.a, this.b, this.chunks)
    if (this.revertDOM) this.updateRevertButtons()
  }

  private updateRevertButtons() {
    let dom = this.revertDOM!, next = dom.firstChild as HTMLElement | null
    let vpA = this.a.viewport, vpB = this.b.viewport
    for (let i = 0; i < this.chunks.length; i++) {
      let chunk = this.chunks[i]
      if (chunk.fromA > vpA.to || chunk.fromB > vpB.to) break
      if (chunk.fromA < vpA.from || chunk.fromB < vpB.from) continue
      let top = this.a.lineBlockAt(chunk.fromA).top + "px"
      while (next && +(next.dataset.chunk!) < i) next = rm(next)
      if (next && next.dataset.chunk! == String(i)) {
        if (next.style.top != top) next.style.top = top
        next = next.nextSibling as HTMLElement | null
      } else {
        dom.insertBefore(this.renderRevertButton(top, i), next)
      }
    }
    while (next) next = rm(next)
  }

  private renderRevertButton(top: string, chunk: number) {
    let elt
    if (this.renderRevert) {
      elt = this.renderRevert()
    } else {
      elt = document.createElement("button")
      let text = this.a.state.phrase("Revert this chunk")
      elt.setAttribute("aria-label", text)
      elt.setAttribute("title", text)
      elt.textContent = this.revertToLeft ? "⇜" : "⇝"
    }
    elt.style.top = top
    elt.setAttribute("data-chunk", String(chunk))
    return elt
  }

  private revertClicked(e: MouseEvent) {
    let target = e.target as HTMLElement | null, chunk
    while (target && target.parentNode != this.revertDOM) target = target.parentNode as HTMLElement | null
    if (target && (chunk = this.chunks[target.dataset.chunk as any])) {
      let [source, dest, srcFrom, srcTo, destFrom, destTo] = this.revertToA
        ? [this.b, this.a, chunk.fromB, chunk.toB, chunk.fromA, chunk.toA]
        : [this.a, this.b, chunk.fromA, chunk.toA, chunk.fromB, chunk.toB]
      let insert = source.state.sliceDoc(srcFrom, Math.max(srcFrom, srcTo - 1))
      if (srcFrom != srcTo) insert += source.state.lineBreak
      dest.dispatch({
        changes: {from: destFrom, to: Math.min(dest.state.doc.length, destTo), insert},
        userEvent: "revert"
      })
      e.preventDefault()
    }
  }

  /// Destroy this merge view.
  destroy() {
    this.a.destroy()
    this.b.destroy()
    if (this.measuring > -1)
      (this.dom.ownerDocument.defaultView || window).cancelAnimationFrame(this.measuring)
    this.dom.remove()
  }
}

function rm(elt: HTMLElement) {
  let next = elt.nextSibling
  elt.remove()
  return next as HTMLElement | null
}

/// Get the changed chunks for the merge view that this editor is part
/// of, plus the side it is on. Or null if the editor isn't part of a
/// merge view or the merge view hasn't finished initializing yet.
export function getChunks(state: EditorState) {
  let field = state.field(ChunkField, false)
  if (!field) return null
  return {chunks: field, side: state.facet(mergeConfig).side}
}
