import {EditorView} from "@codemirror/view"

export const baseTheme = EditorView.baseTheme({
  ".cm-mergeView": { // FIXME how to target this?
    display: "flex"
  },

  ".cm-merge-a .cm-changedLine": {
    backgroundColor: "rgba(255, 0, 0, .2)"
  },

  ".cm-merge-b .cm-changedLine": {
    backgroundColor: "rgba(0, 255, 0, .2)"
  },

  ".cm-merge-a .cm-changedText": {
    textDecoration: "underline #cc9988"
  },

  ".cm-merge-b .cm-changedText": {
    textDecoration: "underline #77dd88"
  },
})
