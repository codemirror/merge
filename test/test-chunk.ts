import {Text, EditorState} from "@codemirror/state"
import {Chunk} from "@codemirror/merge"
import ist from "ist"

function byJSON(a: any, b: any) { return JSON.stringify(a) == JSON.stringify(b) }

let linesA = []
for (let i = 1; i <= 1000; i++) linesA.push("line " + i)
let linesB = linesA.slice()
linesB[499] = "line D"
linesB.splice(699, 50, "line ??", "line !!")
let docA = Text.of(linesA), docB = Text.of(linesB)

describe("chunks", () => {
  it("enumerates changed chunks", () => {
    let chunks = Chunk.build(docA, docB)
    ist(chunks.length, 2)

    let [ch1, ch2] = chunks
    ist([ch1.fromA, ch1.toA], [docA.line(500).from, docA.line(501).from], byJSON)
    ist([ch1.fromB, ch1.toB], [docB.line(500).from, docB.line(501).from], byJSON)

    ist([ch2.fromA, ch2.toA], [docA.line(700).from, docA.line(750).from], byJSON)
    ist([ch2.fromB, ch2.toB], [docB.line(700).from, docB.line(702).from], byJSON)

    ist(ch2.changes.length, 2)
    let [c1, c2] = ch2.changes
    ist([c1.fromA, c1.fromB, c1.toB], [5, 5, 7], byJSON)
    ist([c2.toA, c2.fromB, c2.toB], [docA.line(749).to - ch2.fromA, 13, 15], byJSON)
  })

  it("handles changes at end of document", () => {
    let [ch1] = Chunk.build(Text.of(["one", ""]), Text.of(["one", "", ""]))
    ist([ch1.fromA, ch1.toA], [4, 4], byJSON)
    ist([ch1.fromB, ch1.toB], [4, 5], byJSON)
  })

  it("can update chunks for changes", () => {
    let stateA = EditorState.create({doc: docA}), stateB = EditorState.create({doc: docB})
    let chunks = Chunk.build(stateA.doc, stateB.doc)

    let tr1 = stateA.update({changes: {from: 0, insert: "line NULL\n"}})
    let chunks1 = Chunk.updateA(chunks, tr1.newDoc, stateB.doc, tr1.changes)
    ist(chunks1.length, 3)
    let [ch1, ch2] = chunks1
    ist([ch1.fromA, ch1.toA, ch1.fromB, ch1.toB], [0, 10, 0, 0], byJSON)
    ist([ch2.fromA, ch2.fromB], [tr1.newDoc.line(501).from, stateB.doc.line(500).from], byJSON)
    stateA = tr1.state

    let tr2 = stateB.update({changes: [
      {from: stateB.doc.line(600).from + 1, insert: "---"},
      {from: stateB.doc.length, insert: "\n???"}
    ]})
    let chunks2 = Chunk.updateB(chunks1, stateA.doc, tr2.newDoc, tr2.changes)
    ist(chunks2.length, 5)
    let [, , ch3, , ch5] = chunks2
    ist([ch3.fromA, ch3.toA], [stateA.doc.line(601).from, stateA.doc.line(602).from], byJSON)
    ist([ch3.fromB, ch3.toB], [tr2.newDoc.line(600).from, tr2.newDoc.line(601).from], byJSON)
    ist([ch5.fromA, ch5.toA], [stateA.doc.length - 9, stateA.doc.length + 1], byJSON)
    ist([ch5.fromB, ch5.toB], [tr2.newDoc.length - 13, tr2.newDoc.length + 1], byJSON)
  })

  it("can handle deleting updates", () => {
    let stateA = EditorState.create({doc: docA})
    let chunks = Chunk.build(stateA.doc, docB)

    let tr = stateA.update({changes: {from: 0, to: 100}})
    let chunks1 = Chunk.updateA(chunks, tr.newDoc, docB, tr.changes)
    ist(chunks1.length, 3)
    ist(chunks1.map(c => c.fromA), [0, 4283, 6083], byJSON)
    ist(chunks1.map(c => c.fromB), [0, 4383, 6181], byJSON)
  })

  it("clears chunks when a is set to equal b", () => {
    let sA = EditorState.create({doc: ""}), sB = EditorState.create({doc: "foo\n"})
    let chs = Chunk.build(sA.doc, sB.doc)
    let tr = sA.update({changes: {from: 0, insert: sB.doc}})
    ist(Chunk.updateA(chs, tr.newDoc, sB.doc, tr.changes).length, 0)
  })

  it("drops old chunks when a doc is cleared", () => {
    let sA = EditorState.create({doc: "A\nb\nC\nd\nE"}), sB = EditorState.create({doc: "a\nb\nc\nd\ne"})
    let chs = Chunk.build(sA.doc, sB.doc)
    let tr = sA.update({changes: {from: 0, to: sA.doc.length}})
    let updated = Chunk.updateA(chs, tr.newDoc, sB.doc, tr.changes)
    ist(updated.length, 1)
    ist(updated[0].toB, sB.doc.length + 1)
  })
})
