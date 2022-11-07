import {EditorView} from "@codemirror/view"
import {EditorStateConfig, Transaction, EditorState, StateEffect} from "@codemirror/state"
import {Chunk, getChunks, updateChunksA, updateChunksB, setChunks, ChunkField, Side} from "./chunk"
import {decorateChunks, measureSpacers, Spacers, adjustSpacers} from "./deco"
import {baseTheme, externalTheme} from "./theme"

export type MergeConfig = {
  a: EditorStateConfig
  b: EditorStateConfig
  parent?: Element | DocumentFragment
  root?: Document | ShadowRoot
}

export class MergeView {
  /// The first editor.
  a: EditorView
  /// The second editor.
  b: EditorView

  dom: HTMLElement
  private editorDOM: HTMLElement

  private chunks: readonly Chunk[]

  private measuringSpacers = -1

  constructor(config: MergeConfig) {
    let sharedExtensions = [
      decorateChunks,
      baseTheme,
      externalTheme,
      Spacers,
      EditorView.updateListener.of(update => {
        if (this.measuringSpacers < 0 && (update.heightChanged || update.viewportChanged) &&
            !update.transactions.some(tr => tr.effects.some(e => e.is(adjustSpacers))))
          this.measureSpacers()
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
    this.b = new EditorView({
      state: stateB,
      parent: this.editorDOM,
      root: config.root,
      dispatch: tr => this.dispatch(tr, this.b)
    })
    if (config.parent) config.parent.appendChild(this.dom)
    this.scheduleMeasureSpacers()
  }

  dispatch(tr: Transaction, target: EditorView) {
    if (tr.docChanged) {
      this.chunks = target == this.a ? updateChunksA(this.chunks, tr, this.b.state.doc)
        : updateChunksB(this.chunks, tr, this.a.state.doc)
      target.update([tr, tr.state.update({effects: setChunks.of(this.chunks)})])
      let other = target == this.a ? this.b : this.a
      other.update([other.state.update({effects: setChunks.of(this.chunks)})])
      this.scheduleMeasureSpacers()
    } else {
      target.update([tr])
    }
  }

  private scheduleMeasureSpacers() {
    if (this.measuringSpacers < 0) {
      let win = (this.dom.ownerDocument.defaultView || window)
      this.measuringSpacers = win.requestAnimationFrame(() => {
        this.measuringSpacers = -1
        this.measureSpacers()
      })
    }
  }

  private measureSpacers() {
    measureSpacers(this.a, this.b, this.chunks)
  }

  destroy() {
    this.a.destroy()
    this.b.destroy()
    if (this.measuringSpacers > -1)
      (this.dom.ownerDocument.defaultView || window).cancelAnimationFrame(this.measuringSpacers)
  }
}
