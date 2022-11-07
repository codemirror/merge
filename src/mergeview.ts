import {EditorView} from "@codemirror/view"
import {EditorStateConfig, Transaction, EditorState, StateEffect} from "@codemirror/state"
import {Chunk, getChunks, updateChunksA, updateChunksB, setChunks, ChunkField, Side} from "./chunk"
import {decorateChunks, updateSpacers, Spacers, adjustSpacers} from "./deco"
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
  /// Controls whether revert controls are shown between changed
  /// chunks.
  revertControls?: "a-to-b" | "b-to-a"
}

/// A merge view manages two editors side-by-side, highlighting the
/// difference between them and vertically aligning unchanged lines.
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

  private chunks: readonly Chunk[]

  private measuring = -1

  /// Create a new merge view.
  constructor(config: MergeConfig) {
    let sharedExtensions = [
      decorateChunks,
      baseTheme,
      externalTheme,
      Spacers,
      EditorView.updateListener.of(update => {
        if (this.measuring < 0 && (update.heightChanged || update.viewportChanged) &&
            !update.transactions.some(tr => tr.effects.some(e => e.is(adjustSpacers))))
          this.measure()
      })
    ]

    let stateA = EditorState.create({
      doc: config.a.doc,
      selection: config.a.selection,
      extensions: [
        config.a.extensions || [],
        Side.of("a"),
        EditorView.editorAttributes.of({class: "cm-merge-a"}),
        sharedExtensions
      ]
    })
    let stateB = EditorState.create({
      doc: config.b.doc,
      selection: config.b.selection,
      extensions: [
        config.b.extensions || [],
        Side.of("b"),
        EditorView.editorAttributes.of({class: "cm-merge-b"}),
        sharedExtensions
      ]
    })
    this.chunks = getChunks(stateA.doc, stateB.doc)
    let field = ChunkField.init(() => this.chunks)
    stateA = stateA.update({effects: StateEffect.appendConfig.of(field)}).state
    stateB = stateB.update({effects: StateEffect.appendConfig.of(field)}).state

    this.dom = document.createElement("div")
    this.dom.className = "cm-mergeView"
    this.editorDOM = this.dom.appendChild(document.createElement("div"))
    this.editorDOM.className = "cm-mergeViewEditors"
    this.a = new EditorView({
      state: stateA,
      parent: this.editorDOM,
      root: config.root,
      dispatch: tr => this.dispatch(tr, this.a)
    })
    if (config.revertControls) {
      this.revertDOM = this.editorDOM.appendChild(document.createElement("div"))
      this.revertToA = config.revertControls == "b-to-a"
      this.revertDOM.addEventListener("mousedown", e => this.revertClicked(e))
      this.revertDOM.className = "cm-merge-revert"
    }
    this.b = new EditorView({
      state: stateB,
      parent: this.editorDOM,
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
    let button = document.createElement("button")
    button.style.top = top
    button.setAttribute("data-chunk", String(chunk))
    button.setAttribute("aria-label", this.a.state.phrase("Revert this chunk"))
    button.textContent = this.revertToA ? "⇜" : "⇝"
    return button
  }

  private revertClicked(e: MouseEvent) {
    let target = e.target as HTMLElement, chunk
    if (target.nodeName == "BUTTON" && (chunk = this.chunks[target.dataset.chunk as any])) {
      let [source, dest, srcFrom, srcTo, destFrom, destTo] = this.revertToA
        ? [this.b, this.a, chunk.fromB, chunk.toB, chunk.fromA, chunk.toA]
        : [this.a, this.b, chunk.fromA, chunk.toA, chunk.fromB, chunk.toB]
      let insert = source.state.sliceDoc(srcFrom, srcTo)
      if (destFrom == destTo) insert += source.state.lineBreak
      dest.dispatch({
        changes: {from: destFrom, to: destTo, insert},
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
