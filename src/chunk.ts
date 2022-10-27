import {Transaction, Text, ChangeSet, Range} from "@codemirror/state"
import {Decoration} from "@codemirror/view"
import {Changes, diff} from "./diff"

// A chunk holds either a range of lines which have changed content in
// them (not including lines where the change ends right at the line
// start), or an empty range.
export class Chunk {
  constructor(
    readonly changes: Changes,
    readonly fromA: number, readonly toA: number,
    readonly fromB: number, readonly toB: number,
    /// @internal
    public decoA: readonly Range<Decoration>[] | null = null,
    /// @internal
    public decoB: readonly Range<Decoration>[] | null = null
  ) {}

  offset(offA: number, offB: number) {
    return offA || offB
      ? new Chunk(this.changes, this.fromA + offA, this.toA + offA, this.fromB + offB, this.toB + offB,
                  this.decoA, this.decoB)
      : this
  }
}

function fromLine(fromA: number, fromB: number, a: Text, b: Text) {
  let lineA = a.lineAt(fromA), lineB = b.lineAt(fromB)
  return lineA.to == fromA && lineB.to == fromB
    ? [Math.min(a.length, fromA + 1), Math.min(b.length, fromB + 1)] : [lineA.from, lineB.from]
}

function toLine(toA: number, toB: number, a: Text, b: Text) {
  let lineA = a.lineAt(toA), lineB = b.lineAt(toB)
  return lineA.from == toA && lineB.from == toB
    ? [Math.max(0, toA - 1), Math.max(0, toB - 1)] : [lineA.to, lineB.to]
}

function toChunks(changes: Changes, a: Text, b: Text, offA: number, offB: number) {
  let chunks = []
  for (let i = 0; i < changes.length; i++) {
    let change = changes[i]
    let [fromA, fromB] = fromLine(change.fromA + offA, change.fromB + offB, a, b)
    let [toA, toB] = toLine(change.toA + offA, change.toB + offB, a, b)
    let chunk = [change.offset(-fromA, -fromB)]
    while (i < changes.length - 1) {
      let next = changes[i + 1]
      let [nextA, nextB] = fromLine(next.fromA + offA, next.fromB + offB, a, b)
      if (nextA > toA + 1 && nextB > toB + 1) break
      chunk.push(next.offset(-fromA, -fromB))
      ;[toA, toB] = toLine(next.toA + offA, next.toB + offB, a, b)
      i++
    }
    chunks.push(new Chunk(chunk, fromA, Math.max(fromA, toA), fromB, Math.max(fromB, toB)))
  }
  return chunks
}

export function getChunks(a: Text, b: Text): readonly Chunk[] {
  return toChunks(diff(a.toString(), b.toString()), a, b, 0, 0)
}

const updateMargin = 2048

type UpdateRange = {fromA: number, toA: number, fromB: number, toB: number, diffA: number, diffB: number}

// Finds the given position in the chunks. Returns the extent of the
// chunk it overlaps with if it overlaps, or a position corresponding
// to that position on both sides otherwise.
function findPos(
  chunks: readonly Chunk[], pos: number, isA: boolean
): {fromA: number, toA: number, fromB: number, toB: number} {
  let lo = 0, hi = chunks.length
  for (;;) {
    if (lo == hi) {
      let refA = 0, refB = 0
      if (lo) ({toA: refA, toB: refB} = chunks[lo - 1])
      let off = pos - (isA ? refA : refB), posA = refA + off, posB = refB + off
      return {fromA: posA, toA: posA, fromB: posB, toB: posB}
    }
    let mid = (lo + hi) >> 1, chunk = chunks[mid]
    let [from, to] = isA ? [chunk.fromA, chunk.toA] : [chunk.fromB, chunk.toB]
    if (from > pos) hi = mid
    else if (to < pos) lo = mid + 1
    else return chunk
  }
}

function findRangesForChange(chunks: readonly Chunk[], changes: ChangeSet, isA: boolean, otherLen: number) {
  let ranges: UpdateRange[] = []
  changes.iterChangedRanges((cFromA, cToA, cFromB, cToB) => {
    let fromA = 0, toA = isA ? changes.length : otherLen
    let fromB = 0, toB = isA ? otherLen : changes.length
    if (cFromA > updateMargin)
      ({fromA, fromB} = findPos(chunks, cFromA - updateMargin, isA))
    if (cToA < changes.length - updateMargin)
      ({toA, toB} = findPos(chunks, cToA + updateMargin, isA))
    let lenDiff = (cToB - cFromB) - (cToA - cFromA), last
    let [diffA, diffB] = isA ? [lenDiff, 0] : [0, lenDiff]
    if (ranges.length && (last = ranges[ranges.length - 1]).toA >= fromA)
      ranges[ranges.length - 1] = {fromA: last.fromA, fromB: last.fromB, toA, toB,
                                   diffA: last.diffA + diffA, diffB: last.diffB + diffB}
    else
      ranges.push({fromA, toA, fromB, toB, diffA, diffB})
  })
  return ranges
}

function updateChunks(ranges: readonly UpdateRange[], chunks: readonly Chunk[], a: Text, b: Text): readonly Chunk[] {
  if (!ranges.length) return chunks
  let chunkI = 0, offA = 0, offB = 0
  let result = []
  for (let range of ranges) {
    let fromA = range.fromA + offA, toA = range.toA + offA + range.diffA
    let fromB = range.fromB + offB, toB = range.toB + offB + range.diffB
    let next
    while (chunkI < chunks.length && toA >= (next = chunks[chunkI]).toA) {
      if (next.toA <= fromA) result.push(next.offset(offA, offB))
      chunkI++
    }
    for (let chunk of toChunks(diff(a.sliceString(fromA, toA), b.sliceString(fromB, toB)), a, b, fromA, fromB))
      result.push(chunk)
    offA += range.diffA
    offB += range.diffB
  }
  while (chunkI < chunks.length) result.push(chunks[chunkI++].offset(offA, offB))
  return result
}

/// @internal
export function updateChunksA(chunks: readonly Chunk[], transaction: Transaction, b: Text) {
  return updateChunks(findRangesForChange(chunks, transaction.changes, true, b.length), chunks, transaction.newDoc, b)
}

/// @internal
export function updateChunksB(chunks: readonly Chunk[], transaction: Transaction, a: Text) {
  return updateChunks(findRangesForChange(chunks, transaction.changes, false, a.length), chunks, a, transaction.newDoc)
}
