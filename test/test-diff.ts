import {diff, presentableDiff, Change} from "@codemirror/merge"
import ist from "ist"

function apply(diff: readonly Change[], orig: string, changed: string) {
  let pos = 0, result = ""
  for (let ch of diff) {
    result += orig.slice(pos, ch.fromA)
    result += changed.slice(ch.fromB, ch.toB)
    pos = ch.toA
  }
  result += orig.slice(pos)
  return result
}

function checkShape(diff: readonly Change[], shape: string) {
  let posA = 0, posB = 0, changes = []
  for (let part of shape.split(" ")) {
    let ch = /(\d+)\/(\d+)/.exec(part)
    if (ch) {
      let toA = posA + +ch[1], toB = posB + +ch[2]
      changes.push({fromA: posA, toA, fromB: posB, toB})
      posA = toA; posB = toB
    } else {
      let len = +part
      posA += len; posB += len
    }
  }
  ist(JSON.stringify(diff), JSON.stringify(changes))
}

describe("diff", () => {
  it("produces close to minimal diffs", () => {
    for (let i = 0; i < 1000; i++) {
      let len = Math.ceil(Math.sqrt(i)) * 5 + 5
      let str = ""
      for (let j = 0; j < len; j++) str += "  abcdefghij"[Math.floor(Math.random() * 12)]
      let changed = "", skipped = 0, inserted = 0
      for (let pos = 0;;) {
        if (pos >= len) break
        let skip = Math.floor(Math.random() * 10) + 1
        skipped += Math.min(skip, len - pos)
        changed += str.slice(pos, pos + skip)
        pos += skip
        if (pos >= len) break
        let insert = Math.floor(Math.random() * 5)
        inserted += insert
        changed += "X".repeat(insert)
        pos += Math.floor(Math.random() * 5)
      }
      let d = diff(str, changed)
      let dSkipped = len - d.reduce((l, ch) => l + (ch.toA - ch.fromA), 0)
      let dInserted = d.reduce((l, ch) => l + (ch.toB - ch.fromB), 0)
      let margin = Math.round(len / 10)
      if (dSkipped < skipped - margin || dInserted > inserted + margin) {
        console.log("failure for", JSON.stringify(str), JSON.stringify(changed))
        ist(dSkipped, skipped)
        ist(dInserted, inserted)
      }
      ist(apply(d, str, changed), changed)
    }
  })

  it("doesn't cut in the middle of surrogate pairs", () => {
    for (let [a, b, shape] of [
      ["🐶", "🐯", "2/2"],
      ["👨🏽", "👩🏽", "2/2 2"],
      ["👩🏼", "👩🏽", "2 2/2"],
      ["🍏🍎", "🍎", "2/0 2"],
      ["🍎", "🍏🍎", "0/2 2"],
      ["x🍎", "x🍏🍎", "1 0/2 2"],
      ["🍎x", "🍏🍎x", "0/2 3"],
    ]) {
      let d = diff(a, b)
      checkShape(d, shape)
      ist(apply(d, a, b), b)
    }
  })

  it("handles random input", () => {
    let alphabet = "AAACGTT"
    function word(len: number) {
      let w = ""
      for (let l = 0; l < 100; l++) w += alphabet[Math.floor(Math.random() * alphabet.length)]
      return w
    }
    for (let i = 0; i <= 1000; i++) {
      let a = word(50), b = word(50), d = diff(a, b)
      ist(apply(d, a, b), b)
    }
  })

  it("can limit scan depth", () => {
    let t0 = Date.now()
    diff("a".repeat(10000), "b".repeat(10000), {scanLimit: 500})
    ist(Date.now() < t0 + 100)
  })

  it("can time out diffs", () => {
    let t0 = Date.now()
    diff("a".repeat(10000), "b".repeat(10000), {timeout: 50})
    ist(Date.now() < t0 + 100)
  })
})

function parseDiff(d: string) {
  let change = /\[(.*?)\/(.*?)\]/g
  return {a: d.replace(change, (_, a) => a),
          b: d.replace(change, (_, _a, b) => b)}
}

function serializeDiff(diff: readonly Change[], a: string, b: string) {
  let posA = 0, result = ""
  for (let ch of diff) {
    result += a.slice(posA, ch.fromA) + "[" + a.slice(ch.fromA, ch.toA) + "/" + b.slice(ch.fromB, ch.toB) + "]"
    posA = ch.toA
  }
  return result + a.slice(posA)
}

describe("presentableDiff", () => {
  function test(name: string, diff: string) {
    it(name, () => {
      let {a, b} = parseDiff(diff)
      let result = presentableDiff(a, b)
      ist(serializeDiff(result, a, b), diff)
      ist(apply(result, a, b), b)
    })
  }

  test("grows changes to word start", "one [two/twi] three")
  test("grows changes to word end", "one [iwo/two] three")
  test("grows changes from both sides", "[drop/drip]")

  test("doesn't grow short insertions", "blo[/o]p")
  test("doesn't grow short deletions", "blo[o/]p")
  test("does grow long insertions", "[oaks/oaktrees]")
  test("does grow long deletions", "[oaktrees/oaks]")

  test("aligns to the end of words", "fromA[/ + offA]")
  test("aligns to the start of words", "[offA + /]fromA")

  test("removes small unchanged ranges", "[one->two/a->b]")

  test("moves indentation after a change", "x\n[   foo/]\n   bar\n   baz")

  test("aligns insertions to line boundaries", " x,\n[/ y,]\n z,\n")

  test("aligns deletions to line boundaries", " x,\n[ y,/]\n z,\n")
})
