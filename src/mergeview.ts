import {EditorView} from "@codemirror/view"
import {EditorStateConfig, Transaction, EditorState, StateEffect, Prec, Compartment, ChangeSet} from "@codemirror/state"
import {Chunk, defaultDiffConfig} from "./chunk"
import {DiffConfig} from "./diff"
import {setChunks, ChunkField, mergeConfig} from "./merge"
import {decorateChunks, updateSpacers, Spacers, adjustSpacers, collapseUnchanged, changeGutter} from "./deco"
import {baseTheme, externalTheme} from "./theme"

/// Configuration options to `MergeView` that can be provided both
/// initially and to [`reconfigure`](#merge.MergeView.reconfigure).
export interface MergeConfig {
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
  collapseUnchanged?: {margin?: number, minSize?: number},
  /// Pass options to the diff algorithm. By default, the merge view
  /// sets [`scanLimit`](#merge.DiffConfig.scanLimit) to 500.
  diffConfig?: DiffConfig
}

/// Configuration options given to the [`MergeView`](#merge.MergeView)
/// constructor.
export interface DirectMergeConfig extends MergeConfig {
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
}

const collapseCompartment = new Compartment, configCompartment = new Compartment

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
  private diffConf: DiffConfig | undefined

  /// The current set of changed chunks.
  chunks: readonly Chunk[]

  private measuring = -1

  /// Create a new merge view.
  constructor(config: DirectMergeConfig) {
    this.diffConf = config.diffConfig || defaultDiffConfig

    let sharedExtensions = [
      Prec.low(decorateChunks),
      baseTheme,
      externalTheme,
      Spacers,
      EditorView.updateListener.of(update => {
        if (this.measuring < 0 && (update.heightChanged || update.viewportChanged) &&
            !update.transactions.some(tr => tr.effects.some(e => e.is(adjustSpacers))))
          this.measure()
      }),
    ]

    let configA = [mergeConfig.of({
      side: "a",
      sibling: () => this.b,
      highlightChanges: config.highlightChanges !== false,
      markGutter: config.gutter !== false
    })]
    if (config.gutter !== false) configA.push(changeGutter)
    let stateA = EditorState.create({
      doc: config.a.doc,
      selection: config.a.selection,
      extensions: [
        config.a.extensions || [],
        EditorView.editorAttributes.of({class: "cm-merge-a"}),
        configCompartment.of(configA),
        sharedExtensions
      ]
    })

    let configB = [mergeConfig.of({
      side: "b",
      sibling: () => this.a,
      highlightChanges: config.highlightChanges !== false,
      markGutter: config.gutter !== false
    })]
    if (config.gutter !== false) configB.push(changeGutter)
    let stateB = EditorState.create({
      doc: config.b.doc,
      selection: config.b.selection,
      extensions: [
        config.b.extensions || [],
        EditorView.editorAttributes.of({class: "cm-merge-b"}),
        configCompartment.of(configB),
        sharedExtensions
      ]
    })
    this.chunks = Chunk.build(stateA.doc, stateB.doc, this.diffConf)
    let add = [
      ChunkField.init(() => this.chunks),
      collapseCompartment.of(config.collapseUnchanged ? collapseUnchanged(config.collapseUnchanged) : [])
    ]
    stateA = stateA.update({effects: StateEffect.appendConfig.of(add)}).state
    stateB = stateB.update({effects: StateEffect.appendConfig.of(add)}).state

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
    this.editorDOM.appendChild(orientation == "a-b" ? wrapB : wrapA)
    this.a = new EditorView({
      state: stateA,
      parent: wrapA,
      root: config.root,
      dispatchTransactions: trs => this.dispatch(trs, this.a)
    })
    this.b = new EditorView({
      state: stateB,
      parent: wrapB,
      root: config.root,
      dispatchTransactions: trs => this.dispatch(trs, this.b)
    })
    this.setupRevertControls(!!config.revertControls, config.revertControls == "b-to-a", config.renderRevertControl)
    if (config.parent) config.parent.appendChild(this.dom)
    this.scheduleMeasure()
  }

  private dispatch(trs: readonly Transaction[], target: EditorView) {
    if (trs.some(tr => tr.docChanged)) {
      let last = trs[trs.length - 1]
      let changes = trs.reduce((chs, tr) => chs.compose(tr.changes), ChangeSet.empty(trs[0].startState.doc.length))
      this.chunks = target == this.a ? Chunk.updateA(this.chunks, last.newDoc, this.b.state.doc, changes, this.diffConf)
        : Chunk.updateB(this.chunks, this.a.state.doc, last.newDoc, changes, this.diffConf)
      target.update([...trs, last.state.update({effects: setChunks.of(this.chunks)})])
      let other = target == this.a ? this.b : this.a
      other.update([other.state.update({effects: setChunks.of(this.chunks)})])
      this.scheduleMeasure()
    } else {
      target.update(trs)
    }
  }

  /// Reconfigure an existing merge view.
  reconfigure(config: MergeConfig) {
    if ("diffConfig" in config) {
      this.diffConf = config.diffConfig
    }
    if ("orientation" in config) {
      let aB = config.orientation != "b-a"
      if (aB != (this.editorDOM.firstChild == this.a.dom.parentNode)) {
        let domA = this.a.dom.parentNode as HTMLElement, domB = this.b.dom.parentNode as HTMLElement
        domA.remove()
        domB.remove()
        this.editorDOM.insertBefore(aB ? domA : domB, this.editorDOM.firstChild)
        this.editorDOM.appendChild(aB ? domB : domA)
        this.revertToLeft = !this.revertToLeft
        if (this.revertDOM) this.revertDOM.textContent = ""
      }
    }
    if ("revertControls" in config || "renderRevertControl" in config) {
      let controls = !!this.revertDOM, toA = this.revertToA, render = this.renderRevert
      if ("revertControls" in config) {
        controls = !!config.revertControls
        toA = config.revertControls == "b-to-a"
      }
      if ("renderRevertControl" in config) render = config.renderRevertControl
      this.setupRevertControls(controls, toA, render)
    }
    let highlight = "highlightChanges" in config, gutter = "gutter" in config, collapse = "collapseUnchanged" in config
    if (highlight || gutter || collapse) {
      let effectsA: StateEffect<unknown>[] = [], effectsB: StateEffect<unknown>[] = []
      if (highlight || gutter) {
        let currentConfig = this.a.state.facet(mergeConfig)
        let markGutter = gutter ? config.gutter !== false : currentConfig.markGutter
        let highlightChanges = highlight ? config.highlightChanges !== false : currentConfig.highlightChanges
        effectsA.push(configCompartment.reconfigure([
          mergeConfig.of({side: "a", sibling: () => this.b, highlightChanges, markGutter}),
          markGutter ? changeGutter : []
        ]))
        effectsB.push(configCompartment.reconfigure([
          mergeConfig.of({side: "b", sibling: () => this.a, highlightChanges, markGutter}),
          markGutter ? changeGutter : []
        ]))
      }
      if (collapse) {
        let effect = collapseCompartment.reconfigure(
          config.collapseUnchanged ? collapseUnchanged(config.collapseUnchanged) : [])
        effectsA.push(effect)
        effectsB.push(effect)
      }
      this.a.dispatch({effects: effectsA})
      this.b.dispatch({effects: effectsB})
    }
    this.scheduleMeasure()
  }

  private setupRevertControls(controls: boolean, toA: boolean, render: (() => HTMLElement) | undefined) {
    this.revertToA = toA
    this.revertToLeft = this.revertToA == (this.editorDOM.firstChild == this.a.dom.parentNode)
    this.renderRevert = render
    if (!controls && this.revertDOM) {
      this.revertDOM.remove()
      this.revertDOM = null
    } else if (controls && !this.revertDOM) {
      this.revertDOM = this.editorDOM.insertBefore(document.createElement("div"), this.editorDOM.firstChild!.nextSibling)
      this.revertDOM.addEventListener("mousedown", e => this.revertClicked(e))
      this.revertDOM.className = "cm-merge-revert"
    } else if (this.revertDOM) {
      this.revertDOM.textContent = ""
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
      if (srcFrom != srcTo && destTo <= dest.state.doc.length) insert += source.state.lineBreak
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
