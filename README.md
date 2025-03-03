<!-- NOTE: README.md is generated from src/README.md -->

# @codemirror/merge [![NPM version](https://img.shields.io/npm/v/@codemirror/merge.svg)](https://www.npmjs.org/package/@codemirror/merge)

[ [**WEBSITE**](https://codemirror.net/) | [**ISSUES**](https://github.com/codemirror/dev/issues) | [**FORUM**](https://discuss.codemirror.net/c/next/) | [**CHANGELOG**](https://github.com/codemirror/merge/blob/main/CHANGELOG.md) ]

This package implements a merge interface for the
[CodeMirror](https://codemirror.net/) code editor.

The [project page](https://codemirror.net/) has more information, a
number of [examples](https://codemirror.net/examples/) and the
[documentation](https://codemirror.net/docs/).

This code is released under an
[MIT license](https://github.com/codemirror/merge/tree/main/LICENSE).

We aim to be an inclusive, welcoming community. To make that explicit,
we have a [code of
conduct](http://contributor-covenant.org/version/1/1/0/) that applies
to communication around the project.

## Usage

A split merge view can be created like this:

```javascript
import {MergeView} from "@codemirror/merge"
import {EditorView, basicSetup} from "codemirror"
import {EditorState} from "@codemirror/state"

let doc = `one
two
three
four
five`

const view = new MergeView({
  a: {
    doc,
    extensions: basicSetup
  },
  b: {
    doc: doc.replace(/t/g, "T") + "\nSix",
    extensions: [
      basicSetup,
      EditorView.editable.of(false),
      EditorState.readOnly.of(true)
    ]
  },
  parent: document.body
})
```

Or a unified view like this:

```javascript
import {EditorView, basicSetup} from "codemirror"
import {unifiedMergeView} from "@codemirror/merge"

const view = new EditorView({
  parent: document.body,
  doc: "one\ntwo\nthree\nfour",
  extensions: [
    basicSetup,
    unifiedMergeView({
      original: "one\n...\nfour"
    })
  ]
})
```

## API Reference

### Side-by-side Merge View

<dl>
<dt id="user-content-mergeconfig">
  <h4>
    <code>interface</code>
    <a href="#user-content-mergeconfig">MergeConfig</a></h4>
</dt>

<dd><p>Configuration options to <code>MergeView</code> that can be provided both
initially and to <a href="#user-content-mergeview.reconfigure"><code>reconfigure</code></a>.</p>
<dl><dt id="user-content-mergeconfig.orientation">
  <code><strong><a href="#user-content-mergeconfig.orientation">orientation</a></strong>&#8288;?: &quot;a-b&quot; | &quot;b-a&quot;</code></dt>

<dd><p>Controls whether editor A or editor B is shown first. Defaults
to <code>&quot;a-b&quot;</code>.</p>
</dd><dt id="user-content-mergeconfig.revertcontrols">
  <code><strong><a href="#user-content-mergeconfig.revertcontrols">revertControls</a></strong>&#8288;?: &quot;a-to-b&quot; | &quot;b-to-a&quot;</code></dt>

<dd><p>Controls whether revert controls are shown between changed
chunks.</p>
</dd><dt id="user-content-mergeconfig.renderrevertcontrol">
  <code><strong><a href="#user-content-mergeconfig.renderrevertcontrol">renderRevertControl</a></strong>&#8288;?: fn() → <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement">HTMLElement</a></code></dt>

<dd><p>When given, this function is called to render the button to
revert a chunk.</p>
</dd><dt id="user-content-mergeconfig.highlightchanges">
  <code><strong><a href="#user-content-mergeconfig.highlightchanges">highlightChanges</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>By default, the merge view will mark inserted and deleted text
in changed chunks. Set this to false to turn that off.</p>
</dd><dt id="user-content-mergeconfig.gutter">
  <code><strong><a href="#user-content-mergeconfig.gutter">gutter</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>Controls whether a gutter marker is shown next to changed lines.</p>
</dd><dt id="user-content-mergeconfig.collapseunchanged">
  <code><strong><a href="#user-content-mergeconfig.collapseunchanged">collapseUnchanged</a></strong>&#8288;?: {margin&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>, minSize&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>}</code></dt>

<dd><p>When given, long stretches of unchanged text are collapsed.
<code>margin</code> gives the number of lines to leave visible after/before
a change (default is 3), and <code>minSize</code> gives the minimum amount
of collapsible lines that need to be present (defaults to 4).</p>
</dd><dt id="user-content-mergeconfig.diffconfig">
  <code><strong><a href="#user-content-mergeconfig.diffconfig">diffConfig</a></strong>&#8288;?: <a href="#user-content-diffconfig">DiffConfig</a></code></dt>

<dd><p>Pass options to the diff algorithm. By default, the merge view
sets <a href="#user-content-diffconfig.scanlimit"><code>scanLimit</code></a> to 500.</p>
</dd></dl>

</dd>
<dt id="user-content-directmergeconfig">
  <h4>
    <code>interface</code>
    <a href="#user-content-directmergeconfig">DirectMergeConfig</a> <code>extends <a href="#user-content-mergeconfig">MergeConfig</a></code></h4>
</dt>

<dd><p>Configuration options given to the <a href="#user-content-mergeview"><code>MergeView</code></a>
constructor.</p>
<dl><dt id="user-content-directmergeconfig.a">
  <code><strong><a href="#user-content-directmergeconfig.a">a</a></strong>: <a href="https://codemirror.net/docs/ref#state.EditorStateConfig">EditorStateConfig</a></code></dt>

<dd><p>Configuration for the first editor (the left one in a
left-to-right context).</p>
</dd><dt id="user-content-directmergeconfig.b">
  <code><strong><a href="#user-content-directmergeconfig.b">b</a></strong>: <a href="https://codemirror.net/docs/ref#state.EditorStateConfig">EditorStateConfig</a></code></dt>

<dd><p>Configuration for the second editor.</p>
</dd><dt id="user-content-directmergeconfig.parent">
  <code><strong><a href="#user-content-directmergeconfig.parent">parent</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en/docs/DOM/Element">Element</a> | <a href="https://developer.mozilla.org/en/docs/DOM/document.createDocumentFragment">DocumentFragment</a></code></dt>

<dd><p>Parent element to append the view to.</p>
</dd><dt id="user-content-directmergeconfig.root">
  <code><strong><a href="#user-content-directmergeconfig.root">root</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en/docs/DOM/document">Document</a> | <a href="https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot">ShadowRoot</a></code></dt>

<dd><p>An optional root. Only necessary if the view is mounted in a
shadow root or a document other than the global <code>document</code>
object.</p>
</dd></dl>

</dd>
<dt id="user-content-mergeview">
  <h4>
    <code>class</code>
    <a href="#user-content-mergeview">MergeView</a></h4>
</dt>

<dd><p>A merge view manages two editors side-by-side, highlighting the
difference between them and vertically aligning unchanged lines.
If you want one of the editors to be read-only, you have to
configure that in its extensions.</p>
<p>By default, views are not scrollable. Style them (<code>.cm-mergeView</code>)
with a height and <code>overflow: auto</code> to make them scrollable.</p>
<dl><dt id="user-content-mergeview.constructor">
  <code>new <strong><a href="#user-content-mergeview.constructor">MergeView</a></strong>(<a id="user-content-mergeview.constructor^config" href="#user-content-mergeview.constructor^config">config</a>: <a href="#user-content-directmergeconfig">DirectMergeConfig</a>)</code></dt>

<dd><p>Create a new merge view.</p>
</dd><dt id="user-content-mergeview.a">
  <code><strong><a href="#user-content-mergeview.a">a</a></strong>: <a href="https://codemirror.net/docs/ref#view.EditorView">EditorView</a></code></dt>

<dd><p>The first editor.</p>
</dd><dt id="user-content-mergeview.b">
  <code><strong><a href="#user-content-mergeview.b">b</a></strong>: <a href="https://codemirror.net/docs/ref#view.EditorView">EditorView</a></code></dt>

<dd><p>The second editor.</p>
</dd><dt id="user-content-mergeview.dom">
  <code><strong><a href="#user-content-mergeview.dom">dom</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement">HTMLElement</a></code></dt>

<dd><p>The outer DOM element holding the view.</p>
</dd><dt id="user-content-mergeview.chunks">
  <code><strong><a href="#user-content-mergeview.chunks">chunks</a></strong>: readonly <a href="#user-content-chunk">Chunk</a>[]</code></dt>

<dd><p>The current set of changed chunks.</p>
</dd><dt id="user-content-mergeview.reconfigure">
  <code><strong><a href="#user-content-mergeview.reconfigure">reconfigure</a></strong>(<a id="user-content-mergeview.reconfigure^config" href="#user-content-mergeview.reconfigure^config">config</a>: <a href="#user-content-mergeconfig">MergeConfig</a>)</code></dt>

<dd><p>Reconfigure an existing merge view.</p>
</dd><dt id="user-content-mergeview.destroy">
  <code><strong><a href="#user-content-mergeview.destroy">destroy</a></strong>()</code></dt>

<dd><p>Destroy this merge view.</p>
</dd></dl>

</dd>
<dt id="user-content-uncollapseunchanged">
  <code><strong><a href="#user-content-uncollapseunchanged">uncollapseUnchanged</a></strong>: <a href="https://codemirror.net/docs/ref#state.StateEffectType">StateEffectType</a>&lt;<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>&gt;</code></dt>

<dd><p>A state effect that expands the section of collapsed unchanged
code starting at the given position.</p>
</dd>
</dl>
<h3>Unified Merge View</h3>
<dl>
<dt id="user-content-unifiedmergeview">
  <code><strong><a href="#user-content-unifiedmergeview">unifiedMergeView</a></strong>(<a id="user-content-unifiedmergeview^config" href="#user-content-unifiedmergeview^config">config</a>: Object) → <a href="https://codemirror.net/docs/ref#state.Extension">Extension</a>[]</code></dt>

<dd><p>Create an extension that causes the editor to display changes
between its content and the given original document. Changed
chunks will be highlighted, with uneditable widgets displaying the
original text displayed above the new text.</p>
<dl><dt id="user-content-unifiedmergeview^config">
  <code><strong><a href="#user-content-unifiedmergeview^config">config</a></strong></code></dt>

<dd><dl><dt id="user-content-unifiedmergeview^config.original">
  <code><strong><a href="#user-content-unifiedmergeview^config.original">original</a></strong>: <a href="https://codemirror.net/docs/ref#state.Text">Text</a> | <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a></code></dt>

<dd><p>The other document to compare the editor content with.</p>
</dd><dt id="user-content-unifiedmergeview^config.highlightchanges">
  <code><strong><a href="#user-content-unifiedmergeview^config.highlightchanges">highlightChanges</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>By default, the merge view will mark inserted and deleted text
in changed chunks. Set this to false to turn that off.</p>
</dd><dt id="user-content-unifiedmergeview^config.gutter">
  <code><strong><a href="#user-content-unifiedmergeview^config.gutter">gutter</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>Controls whether a gutter marker is shown next to changed lines.</p>
</dd><dt id="user-content-unifiedmergeview^config.syntaxhighlightdeletions">
  <code><strong><a href="#user-content-unifiedmergeview^config.syntaxhighlightdeletions">syntaxHighlightDeletions</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>By default, deleted chunks are highlighted using the main
editor's language. Since these are just fragments, not full
documents, this doesn't always work well. Set this option to
false to disable syntax highlighting for deleted lines.</p>
</dd><dt id="user-content-unifiedmergeview^config.syntaxhighlightdeletionsmaxlength">
  <code><strong><a href="#user-content-unifiedmergeview^config.syntaxhighlightdeletionsmaxlength">syntaxHighlightDeletionsMaxLength</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>Deleted blocks larger than this size do not get
syntax-highlighted. Defaults to 3000.</p>
</dd><dt id="user-content-unifiedmergeview^config.mergecontrols">
  <code><strong><a href="#user-content-unifiedmergeview^config.mergecontrols">mergeControls</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>Controls whether accept/reject buttons are displayed for each
changed chunk. Defaults to true.</p>
</dd><dt id="user-content-unifiedmergeview^config.diffconfig">
  <code><strong><a href="#user-content-unifiedmergeview^config.diffconfig">diffConfig</a></strong>&#8288;?: <a href="#user-content-diffconfig">DiffConfig</a></code></dt>

<dd><p>Pass options to the diff algorithm. By default, the merge view
sets <a href="#user-content-diffconfig.scanlimit"><code>scanLimit</code></a> to 500.</p>
</dd><dt id="user-content-unifiedmergeview^config.collapseunchanged">
  <code><strong><a href="#user-content-unifiedmergeview^config.collapseunchanged">collapseUnchanged</a></strong>&#8288;?: {margin&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>, minSize&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>}</code></dt>

<dd><p>When given, long stretches of unchanged text are collapsed.
<code>margin</code> gives the number of lines to leave visible after/before
a change (default is 3), and <code>minSize</code> gives the minimum amount
of collapsible lines that need to be present (defaults to 4).</p>
</dd></dl></dd></dl></dd>
<dt id="user-content-acceptchunk">
  <code><strong><a href="#user-content-acceptchunk">acceptChunk</a></strong>(<a id="user-content-acceptchunk^view" href="#user-content-acceptchunk^view">view</a>: <a href="https://codemirror.net/docs/ref#view.EditorView">EditorView</a>, <a id="user-content-acceptchunk^pos" href="#user-content-acceptchunk^pos">pos</a>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>) → <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>In a <a href="#user-content-unifiedmergeview">unified</a> merge view, accept the
chunk under the given position or the cursor. This chunk will no
longer be highlighted unless it is edited again.</p>
</dd>
<dt id="user-content-rejectchunk">
  <code><strong><a href="#user-content-rejectchunk">rejectChunk</a></strong>(<a id="user-content-rejectchunk^view" href="#user-content-rejectchunk^view">view</a>: <a href="https://codemirror.net/docs/ref#view.EditorView">EditorView</a>, <a id="user-content-rejectchunk^pos" href="#user-content-rejectchunk^pos">pos</a>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>) → <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>In a <a href="#user-content-unifiedmergeview">unified</a> merge view, reject the
chunk under the given position or the cursor. Reverts that range
to the content it has in the original document.</p>
</dd>
<dt id="user-content-getoriginaldoc">
  <code><strong><a href="#user-content-getoriginaldoc">getOriginalDoc</a></strong>(<a id="user-content-getoriginaldoc^state" href="#user-content-getoriginaldoc^state">state</a>: <a href="https://codemirror.net/docs/ref#state.EditorState">EditorState</a>) → <a href="https://codemirror.net/docs/ref#state.Text">Text</a></code></dt>

<dd><p>Get the original document from a unified merge editor's state.</p>
</dd>
<dt id="user-content-originaldocchangeeffect">
  <code><strong><a href="#user-content-originaldocchangeeffect">originalDocChangeEffect</a></strong>(<a id="user-content-originaldocchangeeffect^state" href="#user-content-originaldocchangeeffect^state">state</a>: <a href="https://codemirror.net/docs/ref#state.EditorState">EditorState</a>, <a id="user-content-originaldocchangeeffect^changes" href="#user-content-originaldocchangeeffect^changes">changes</a>: <a href="https://codemirror.net/docs/ref#state.ChangeSet">ChangeSet</a>) → <a href="https://codemirror.net/docs/ref#state.StateEffect">StateEffect</a>&lt;{doc: <a href="https://codemirror.net/docs/ref#state.Text">Text</a>, changes: <a href="https://codemirror.net/docs/ref#state.ChangeSet">ChangeSet</a>}&gt;</code></dt>

<dd><p>Create an effect that, when added to a transaction on a unified
merge view, will update the original document that's being compared against.</p>
</dd>
<dt id="user-content-updateoriginaldoc">
  <code><strong><a href="#user-content-updateoriginaldoc">updateOriginalDoc</a></strong>: <a href="https://codemirror.net/docs/ref#state.StateEffectType">StateEffectType</a>&lt;{doc: <a href="https://codemirror.net/docs/ref#state.Text">Text</a>, changes: <a href="https://codemirror.net/docs/ref#state.ChangeSet">ChangeSet</a>}&gt;</code></dt>

<dd><p>The state effect used to signal changes in the original doc in a
unified merge view.</p>
</dd>
</dl>
<h3>Chunks</h3>
<dl>
<dt id="user-content-chunk">
  <h4>
    <code>class</code>
    <a href="#user-content-chunk">Chunk</a></h4>
</dt>

<dd><p>A chunk describes a range of lines which have changed content in
them. Either side (a/b) may either be empty (when its <code>to</code> is
equal to its <code>from</code>), or points at a range starting at the start
of the first changed line, to 1 past the end of the last changed
line. Note that <code>to</code> positions may point past the end of the
document. Use <code>endA</code>/<code>endB</code> if you need an end position that is
certain to be a valid document position.</p>
<dl><dt id="user-content-chunk.constructor">
  <code>new <strong><a href="#user-content-chunk.constructor">Chunk</a></strong>(<a id="user-content-chunk.constructor^changes" href="#user-content-chunk.constructor^changes">changes</a>: readonly <a href="#user-content-change">Change</a>[], <a id="user-content-chunk.constructor^froma" href="#user-content-chunk.constructor^froma">fromA</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>, <a id="user-content-chunk.constructor^toa" href="#user-content-chunk.constructor^toa">toA</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>, <a id="user-content-chunk.constructor^fromb" href="#user-content-chunk.constructor^fromb">fromB</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>, <a id="user-content-chunk.constructor^tob" href="#user-content-chunk.constructor^tob">toB</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>, <a id="user-content-chunk.constructor^precise" href="#user-content-chunk.constructor^precise">precise</a>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a> = true)</code></dt>

<dd></dd><dt id="user-content-chunk.changes">
  <code><strong><a href="#user-content-chunk.changes">changes</a></strong>: readonly <a href="#user-content-change">Change</a>[]</code></dt>

<dd><p>The individual changes inside this chunk. These are stored
relative to the start of the chunk, so you have to add
<code>chunk.fromA</code>/<code>fromB</code> to get document positions.</p>
</dd><dt id="user-content-chunk.froma">
  <code><strong><a href="#user-content-chunk.froma">fromA</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>The start of the chunk in document A.</p>
</dd><dt id="user-content-chunk.toa">
  <code><strong><a href="#user-content-chunk.toa">toA</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>The end of the chunk in document A. This is equal to <code>fromA</code>
when the chunk covers no lines in document A, or is one unit
past the end of the last line in the chunk if it does.</p>
</dd><dt id="user-content-chunk.fromb">
  <code><strong><a href="#user-content-chunk.fromb">fromB</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>The start of the chunk in document B.</p>
</dd><dt id="user-content-chunk.tob">
  <code><strong><a href="#user-content-chunk.tob">toB</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>The end of the chunk in document A.</p>
</dd><dt id="user-content-chunk.precise">
  <code><strong><a href="#user-content-chunk.precise">precise</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean">boolean</a></code></dt>

<dd><p>This is set to false when the diff used to compute this chunk
fell back to fast, imprecise diffing.</p>
</dd><dt id="user-content-chunk.enda">
  <code><strong><a href="#user-content-chunk.enda">endA</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>Returns <code>fromA</code> if the chunk is empty in A, or the end of the
last line in the chunk otherwise.</p>
</dd><dt id="user-content-chunk.endb">
  <code><strong><a href="#user-content-chunk.endb">endB</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>Returns <code>fromB</code> if the chunk is empty in B, or the end of the
last line in the chunk otherwise.</p>
</dd><dt id="user-content-chunk^build">
  <code>static <strong><a href="#user-content-chunk^build">build</a></strong>(<a id="user-content-chunk^build^a" href="#user-content-chunk^build^a">a</a>: <a href="https://codemirror.net/docs/ref#state.Text">Text</a>, <a id="user-content-chunk^build^b" href="#user-content-chunk^build^b">b</a>: <a href="https://codemirror.net/docs/ref#state.Text">Text</a>, <a id="user-content-chunk^build^conf" href="#user-content-chunk^build^conf">conf</a>&#8288;?: <a href="#user-content-diffconfig">DiffConfig</a>) → readonly <a href="#user-content-chunk">Chunk</a>[]</code></dt>

<dd><p>Build a set of changed chunks for the given documents.</p>
</dd><dt id="user-content-chunk^updatea">
  <code>static <strong><a href="#user-content-chunk^updatea">updateA</a></strong>(<a id="user-content-chunk^updatea^chunks" href="#user-content-chunk^updatea^chunks">chunks</a>: readonly <a href="#user-content-chunk">Chunk</a>[], <a id="user-content-chunk^updatea^a" href="#user-content-chunk^updatea^a">a</a>: <a href="https://codemirror.net/docs/ref#state.Text">Text</a>, <a id="user-content-chunk^updatea^b" href="#user-content-chunk^updatea^b">b</a>: <a href="https://codemirror.net/docs/ref#state.Text">Text</a>, <a id="user-content-chunk^updatea^changes" href="#user-content-chunk^updatea^changes">changes</a>: <a href="https://codemirror.net/docs/ref#state.ChangeDesc">ChangeDesc</a>, <a id="user-content-chunk^updatea^conf" href="#user-content-chunk^updatea^conf">conf</a>&#8288;?: <a href="#user-content-diffconfig">DiffConfig</a>) → readonly <a href="#user-content-chunk">Chunk</a>[]</code></dt>

<dd><p>Update a set of chunks for changes in document A. <code>a</code> should
hold the updated document A.</p>
</dd><dt id="user-content-chunk^updateb">
  <code>static <strong><a href="#user-content-chunk^updateb">updateB</a></strong>(<a id="user-content-chunk^updateb^chunks" href="#user-content-chunk^updateb^chunks">chunks</a>: readonly <a href="#user-content-chunk">Chunk</a>[], <a id="user-content-chunk^updateb^a" href="#user-content-chunk^updateb^a">a</a>: <a href="https://codemirror.net/docs/ref#state.Text">Text</a>, <a id="user-content-chunk^updateb^b" href="#user-content-chunk^updateb^b">b</a>: <a href="https://codemirror.net/docs/ref#state.Text">Text</a>, <a id="user-content-chunk^updateb^changes" href="#user-content-chunk^updateb^changes">changes</a>: <a href="https://codemirror.net/docs/ref#state.ChangeDesc">ChangeDesc</a>, <a id="user-content-chunk^updateb^conf" href="#user-content-chunk^updateb^conf">conf</a>&#8288;?: <a href="#user-content-diffconfig">DiffConfig</a>) → readonly <a href="#user-content-chunk">Chunk</a>[]</code></dt>

<dd><p>Update a set of chunks for changes in document B.</p>
</dd></dl>

</dd>
<dt id="user-content-getchunks">
  <code><strong><a href="#user-content-getchunks">getChunks</a></strong>(<a id="user-content-getchunks^state" href="#user-content-getchunks^state">state</a>: <a href="https://codemirror.net/docs/ref#state.EditorState">EditorState</a>) → {chunks: readonly <a href="#user-content-chunk">Chunk</a>[], side: &quot;a&quot; | &quot;b&quot; | <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null">null</a>} | <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/null">null</a></code></dt>

<dd><p>Get the changed chunks for the merge view that this editor is part
of, plus the side it is on if it is part of a <code>MergeView</code>. Returns
null if the editor doesn't have a merge extension active or the
merge view hasn't finished initializing yet.</p>
</dd>
<dt id="user-content-gotonextchunk">
  <code><strong><a href="#user-content-gotonextchunk">goToNextChunk</a></strong>: <a href="https://codemirror.net/docs/ref#state.StateCommand">StateCommand</a></code></dt>

<dd><p>Move the selection to the next changed chunk.</p>
</dd>
<dt id="user-content-gotopreviouschunk">
  <code><strong><a href="#user-content-gotopreviouschunk">goToPreviousChunk</a></strong>: <a href="https://codemirror.net/docs/ref#state.StateCommand">StateCommand</a></code></dt>

<dd><p>Move the selection to the previous changed chunk.</p>
</dd>
</dl>
<h3>Diffing Utilities</h3>
<dl>
<dt id="user-content-change">
  <h4>
    <code>class</code>
    <a href="#user-content-change">Change</a></h4>
</dt>

<dd><p>A changed range.</p>
<dl><dt id="user-content-change.constructor">
  <code>new <strong><a href="#user-content-change.constructor">Change</a></strong>(<a id="user-content-change.constructor^froma" href="#user-content-change.constructor^froma">fromA</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>, <a id="user-content-change.constructor^toa" href="#user-content-change.constructor^toa">toA</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>, <a id="user-content-change.constructor^fromb" href="#user-content-change.constructor^fromb">fromB</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>, <a id="user-content-change.constructor^tob" href="#user-content-change.constructor^tob">toB</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a>)</code></dt>

<dd></dd><dt id="user-content-change.froma">
  <code><strong><a href="#user-content-change.froma">fromA</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>The start of the change in document A.</p>
</dd><dt id="user-content-change.toa">
  <code><strong><a href="#user-content-change.toa">toA</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>The end of the change in document A. This is equal to <code>fromA</code>
in case of insertions.</p>
</dd><dt id="user-content-change.fromb">
  <code><strong><a href="#user-content-change.fromb">fromB</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>The start of the change in document B.</p>
</dd><dt id="user-content-change.tob">
  <code><strong><a href="#user-content-change.tob">toB</a></strong>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>The end of the change in document B. This is equal to <code>fromB</code>
for deletions.</p>
</dd></dl>

</dd>
<dt id="user-content-diff">
  <code><strong><a href="#user-content-diff">diff</a></strong>(<a id="user-content-diff^a" href="#user-content-diff^a">a</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a>, <a id="user-content-diff^b" href="#user-content-diff^b">b</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a>, <a id="user-content-diff^config" href="#user-content-diff^config">config</a>&#8288;?: <a href="#user-content-diffconfig">DiffConfig</a>) → readonly <a href="#user-content-change">Change</a>[]</code></dt>

<dd><p>Compute the difference between two strings.</p>
</dd>
<dt id="user-content-presentablediff">
  <code><strong><a href="#user-content-presentablediff">presentableDiff</a></strong>(<a id="user-content-presentablediff^a" href="#user-content-presentablediff^a">a</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a>, <a id="user-content-presentablediff^b" href="#user-content-presentablediff^b">b</a>: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String">string</a>, <a id="user-content-presentablediff^config" href="#user-content-presentablediff^config">config</a>&#8288;?: <a href="#user-content-diffconfig">DiffConfig</a>) → readonly <a href="#user-content-change">Change</a>[]</code></dt>

<dd><p>Compute the difference between the given strings, and clean up the
resulting diff for presentation to users by dropping short
unchanged ranges, and aligning changes to word boundaries when
appropriate.</p>
</dd>
<dt id="user-content-diffconfig">
  <h4>
    <code>interface</code>
    <a href="#user-content-diffconfig">DiffConfig</a></h4>
</dt>

<dd><p>Options passed to diffing functions.</p>
<dl><dt id="user-content-diffconfig.scanlimit">
  <code><strong><a href="#user-content-diffconfig.scanlimit">scanLimit</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>When given, this limits the depth of full (expensive) diff
computations, causing them to give up and fall back to a faster
but less precise approach when there is more than this many
changed characters in a scanned range. This should help avoid
quadratic running time on large, very different inputs.</p>
</dd><dt id="user-content-diffconfig.timeout">
  <code><strong><a href="#user-content-diffconfig.timeout">timeout</a></strong>&#8288;?: <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number">number</a></code></dt>

<dd><p>When set, this makes the algorithm periodically check how long
it has been running, and if it has taken more than the given
number of milliseconds, it aborts detailed diffing in falls back
to the imprecise algorithm.</p>
</dd></dl>

</dd>
</dl>
