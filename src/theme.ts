import {EditorView} from "@codemirror/view"
import {StyleModule} from "style-mod"

export const externalTheme = EditorView.styleModule.of(new StyleModule({
  ".cm-mergeView": {
    overflow: "auto",
  },
  ".cm-mergeViewEditors": {
    display: "flex",
    alignItems: "stretch",
  }
}))

export const baseTheme = EditorView.baseTheme({
  "&": {
    flexGrow: 1
  },

  "& .cm-scroller, &": {
    height: "auto !important",
    overflow: "visible !important"
  },

  ".cm-changedLine": {
    backgroundColor: "rgba(150, 255, 0, .1)"
  },

  "&light.cm-merge-a .cm-changedText": {
    background: "linear-gradient(#e43, #e43) bottom/100% 1.7px no-repeat",
  },

  "&dark.cm-merge-a .cm-changedText": {
    background: "linear-gradient(#fa9, #fa9) bottom/100% 1.7px no-repeat",
  },

  "&light.cm-merge-b .cm-changedText": {
    background: "linear-gradient(#2b2, #2b2) bottom/100% 1.7px no-repeat",
  },

  "&dark.cm-merge-b .cm-changedText": {
    background: "linear-gradient(#8f8, #8f8) bottom/100% 1.7px no-repeat",
  },
})
