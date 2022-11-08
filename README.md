# @codemirror/merge [![NPM version](https://img.shields.io/npm/v/@codemirror/merge.svg)](https://www.npmjs.org/package/@codemirror/merge)

[ [**WEBSITE**](https://codemirror.net/) | [**DOCS**](https://codemirror.net/docs/ref/#merge) | [**ISSUES**](https://github.com/codemirror/dev/issues) | [**FORUM**](https://discuss.codemirror.net/c/v6/) | [**CHANGELOG**](https://github.com/codemirror/merge/blob/main/CHANGELOG.md) ]

This package implements a side-by-side merge view for the
[CodeMirror](https://codemirror.net/) code editor.

This code is released under an
[MIT license](https://github.com/codemirror/commands/tree/main/LICENSE).

We aim to be an inclusive, welcoming community. To make that explicit,
we have a [code of
conduct](http://contributor-covenant.org/version/1/1/0/) that applies
to communication around the project.

## Reference

### class MergeView

A merge view manages two editors side-by-side, highlighting the
difference between them and vertically aligning unchanged lines.
If you want one of the editors to be read-only, you have to
configure that in its extensions.

By default, views are not scrollable. Style them (`.cm-mergeView`)
with a height and `overflow: auto` to make them scrollable.

 * `new `**`MergeView`**`(config: Object)`\
   Create a new merge view.

    * **`config`**`: Object`

       * **`a`**`: EditorStateConfig`\
         Configuration for the first editor (the left one in a
         left-to-right context).

       * **`b`**`: EditorStateConfig`\
         Configuration for the second editor.

       * **`parent`**`?: Element | DocumentFragment`\
         Parent element to append the view to.

       * **`root`**`?: Document | ShadowRoot`\
         An optional root. Only necessary if the view is mounted in a
         shadow root or a document other than the global `document`
         object.

       * **`revertControls`**`?: "a-to-b" | "b-to-a"`\
         Controls whether revert controls are shown between changed
         chunks.

       * **`renderRevertControl`**`?: fn() → HTMLElement`\
         When given, this function is called to render the button to
         revert a chunk.

       * **`highlightChanges`**`?: boolean`\
         By default, the merge view will mark inserted and deleted text
         in changed chunks. Set this to false to turn that off.

       * **`gutter`**`?: boolean`\
         Controls whether a gutter marker is shown next to changed lines.

       * **`collapseUnchanged`**`?: {margin?: number, minSize?: number}`\
         When given, long stretches of unchanged text are collapsed.
         `margin` gives the number of lines to leave visible after/before
         a change (default is 3), and `minSize` gives the minimum amount
         of collapsible lines that need to be present (defaults to 4).

 * **`a`**`: EditorView`\
   The first editor.

 * **`b`**`: EditorView`\
   The second editor.

 * **`dom`**`: HTMLElement`\
   The outer DOM element holding the view.

 * **`destroy`**`()`\
   Destroy this merge view.

This package also exports the diffing utilities it uses internally.

 * type **`Changes`**
   ` = readonly {fromA: number, toA: number, fromB: number, toB: number}[]`\
   Diffs are represented as arrays of changed ranges.


 * **`diff`**`(a: string, b: string) → Changes`\
   Compute the difference between two strings.


 * **`presentableDiff`**`(a: string, b: string) → Changes`\
   Compute the difference between the given strings, and clean up the
   resulting diff for presentation to users by dropping short
   unchanged ranges, and aligning changes to word boundaries when
   appropriate.
