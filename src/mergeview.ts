import {EditorView} from "@codemirror/view"
import {EditorStateConfig, Transaction, EditorState} from "@codemirror/state"
import {Chunk, getChunks, updateChunksA, updateChunksB} from "./chunk"
import {decorateChunks} from "./deco"
import {baseTheme} from "./theme"

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

  chunks: readonly Chunk[]

  constructor(config: MergeConfig) {
    let stateA = EditorState.create({
      doc: config.a.doc,
      selection: config.a.selection,
      extensions: [
        config.a.extensions || [],
        decorateChunks(this, true),
        baseTheme,
        EditorView.editorAttributes.of({class: "cm-merge-a"})
      ]
    })
    let stateB = EditorState.create({
      doc: config.b.doc,
      selection: config.b.selection,
      extensions: [
        config.b.extensions || [],
        decorateChunks(this, false),
        baseTheme,
        EditorView.editorAttributes.of({class: "cm-merge-b"})
      ]
    })
    this.chunks = getChunks(stateA.doc, stateB.doc)

    this.dom = document.createElement("div")
    this.dom.className = "cm-mergeView"
    this.a = new EditorView({
      state: stateA,
      parent: this.dom,
      root: config.root,
      dispatch: tr => this.dispatch(tr, this.a)
    })
    this.b = new EditorView({
      state: stateB,
      parent: this.dom,
      root: config.root,
      dispatch: tr => this.dispatch(tr, this.b)
    })
    if (config.parent) config.parent.appendChild(this.dom)
  }

  dispatch(tr: Transaction, target: EditorView) {
    if (tr.docChanged) {
      this.chunks = target == this.a ? updateChunksA(this.chunks, tr, this.b.state.doc)
        : updateChunksB(this.chunks, tr, this.a.state.doc)
      target.dispatch(tr)
      ;(target == this.a ? this.b : this.a).update([])
    } else {
      target.dispatch(tr)
    }
  }
}
