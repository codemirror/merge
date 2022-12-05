// This algorithm was heavily inspired by Neil Fraser's
// diff-match-patch library. See https://github.com/google/diff-match-patch/

/// A changed range.
export class Change {
  constructor(
    /// The start of the change in document A.
    readonly fromA: number,
    /// The end of the change in document A. This is equal to `fromA`
    /// in case of insertions.
    readonly toA: number,
    /// The start of the change in document B.
    readonly fromB: number,
    /// The end of the change in document B. This is equal to `fromB`
    /// for deletions.
    readonly toB: number
  ) {}

  /// @internal
  offset(offA: number, offB: number) {
    return new Change(this.fromA + offA, this.toA + offA, this.fromB + offB, this.toB + offB)
  }
}

function findDiff(a: string, fromA: number, toA: number, b: string, fromB: number, toB: number): Change[] {
  if (a == b) return []

  // Remove identical prefix and suffix
  let prefix = commonPrefix(a, fromA, toA, b, fromB, toB)
  let suffix = commonSuffix(a, fromA + prefix, toA, b, fromB + prefix, toB)
  fromA += prefix; toA -= suffix
  fromB += prefix; toB -= suffix
  let lenA = toA - fromA, lenB = toB - fromB
  // Nothing left in one of them
  if (!lenA || !lenB) return [new Change(fromA, toA, fromB, toB)]

  // Try to find one string in the other to cover cases with just 2
  // deletions/insertions.
  if (lenA > lenB) {
    let found = a.slice(fromA, toA).indexOf(b.slice(fromB, toB))
    if (found > -1) return [
      new Change(fromA, fromA + found, fromB, fromB),
      new Change(fromA + found + lenB, toA, toB, toB)
    ]
  } else if (lenB > lenA) {
    let found = b.slice(fromB, toB).indexOf(a.slice(fromA, toA))
    if (found > -1) return [
      new Change(fromA, fromA, fromB, fromB + found),
      new Change(toA, toA, fromB + found + lenA, toB)
    ]
  }

  // Only one character left on one side, does not occur in other
  // string.
  if (lenA == 1 || lenB == 1) return [new Change(fromA, toA, fromB, toB)]

  // Try to split the problem in two by finding a substring of one of
  // the strings in the other.
  let half = halfMatch(a, fromA, toA, b, fromB, toB)
  if (half) {
    let [sharedA, sharedB, sharedLen] = half
    return findDiff(a, fromA, sharedA, b, fromB, sharedB)
      .concat(findDiff(a, sharedA + sharedLen, toA, b, sharedB + sharedLen, toB))
  }

  // Fall back to more expensive general search for a shared
  // subsequence.
  return findSnake(a, fromA, toA, b, fromB, toB)
}

// Implementation of Myers 1986 "An O(ND) Difference Algorithm and Its Variations"
function findSnake(a: string, fromA: number, toA: number, b: string, fromB: number, toB: number): Change[] {
  let lenA = toA - fromA, lenB = toB - fromB
  let off = Math.ceil((lenA + lenB) / 2)
  frontier1.reset(off)
  frontier2.reset(off)
  let match1 = (x: number, y: number) => a.charCodeAt(fromA + x) == b.charCodeAt(fromB + y)
  let match2 = (x: number, y: number) => a.charCodeAt(toA - x - 1) == b.charCodeAt(toB - y - 1)
  let test1 = (lenA - lenB) % 2 != 0 ? frontier2 : null, test2 = test1 ? null : frontier1
  for (let depth = 0; depth < off; depth++) {
    let done = frontier1.advance(depth, lenA, lenB, off, test1, false, match1) ||
      frontier2.advance(depth, lenA, lenB, off, test2, true, match2)
    if (done) return bisect(a, fromA, toA, fromA + done[0], b, fromB, toB, fromB + done[1])
  }
  // No commonality at all.
  return [new Change(fromA, toA, fromB, toB)]
}

class Frontier {
  vec: number[] = []
  len!: number
  start!: number
  end!: number

  reset(off: number) {
    this.len = off << 1
    for (let i = 0; i < this.len; i++) this.vec[i] = -1
    this.vec[off + 1] = 0
    this.start = this.end = 0
  }

  advance(depth: number, lenX: number, lenY: number, vOff: number, other: Frontier | null,
          fromBack: boolean, match: (a: number, b: number) => boolean) {
    for (let k = -depth + this.start; k <= depth - this.end; k += 2) {
      let off = vOff + k
      let x = k == -depth || (k != depth && this.vec[off - 1] < this.vec[off + 1])
        ? this.vec[off + 1] : this.vec[off - 1] + 1
      let y = x - k
      while (x < lenX && y < lenY && match(x, y)) { x++; y++ }
      this.vec[off] = x
      if (x > lenX) {
        this.end += 2
      } else if (y > lenY) {
        this.start += 2
      } else if (other) {
        let offOther = vOff + (lenX - lenY) - k
        if (offOther >= 0 && offOther < this.len && other.vec[offOther] != -1) {
          if (!fromBack) {
            let xOther = lenX - other.vec[offOther]
            if (x >= xOther) return [x, y]
          } else {
            let xOther = other.vec[offOther]
            if (xOther >= lenX - x) return [xOther, vOff + xOther - offOther]
          }
        }
      }
    }
    return null
  }
}

// Reused across calls to avoid growing the vectors again and again
const frontier1 = new Frontier, frontier2 = new Frontier

// Given a position in both strings, recursively call `findDiff` with
// the sub-problems before and after that position. Make sure cut
// points lie on character boundaries.
function bisect(a: string, fromA: number, toA: number, splitA: number,
                b: string, fromB: number, toB: number, splitB: number) {
  let stop = false
  if (!validIndex(a, splitA) && ++splitA == toA) stop = true
  if (!validIndex(b, splitB) && ++splitB == toB) stop = true
  if (stop) return [new Change(fromA, toA, fromB, toB)]
  return findDiff(a, fromA, splitA, b, fromB, splitB).concat(findDiff(a, splitA, toA, b, splitB, toB))
}

function chunkSize(lenA: number, lenB: number) {
  let size = 1, max = Math.min(lenA, lenB)
  while (size < max) size = size << 1
  return size
}

// Common prefix length of the given ranges. Because string comparison
// is so much faster than a JavaScript by-character loop, this
// compares whole chunks at a time.
function commonPrefix(a: string, fromA: number, toA: number, b: string, fromB: number, toB: number): number {
  if (fromA == toA || fromA == toB || a.charCodeAt(fromA) != b.charCodeAt(fromB)) return 0
  let chunk = chunkSize(toA - fromA, toB - fromB)
  for (let pA = fromA, pB = fromB;;) {
    let endA = pA + chunk, endB = pB + chunk
    if (endA > toA || endB > toB || a.slice(pA, endA) != b.slice(pB, endB)) {
      if (chunk == 1) return pA - fromA - (validIndex(a, pA) ? 0 : 1)
      chunk = chunk >> 1
    } else if (endA == toA || endB == toB) {
      return endA - fromA
    } else {
      pA = endA; pB = endB
    }
  }
}

// Common suffix length
function commonSuffix(a: string, fromA: number, toA: number, b: string, fromB: number, toB: number): number {
  if (fromA == toA || fromB == toB || a.charCodeAt(toA - 1) != b.charCodeAt(toB - 1)) return 0
  let chunk = chunkSize(toA - fromA, toB - fromB)
  for (let pA = toA, pB = toB;;) {
    let sA = pA - chunk, sB = pB - chunk
    if (sA < fromA || sB < fromB || a.slice(sA, pA) != b.slice(sB, pB)) {
      if (chunk == 1) return toA - pA - (validIndex(a, pA) ? 0 : 1)
      chunk = chunk >> 1
    } else if (sA == fromA || sB == fromB) {
      return toA - sA
    } else {
      pA = sA; pB = sB
    }
  }
}

// Find a shared substring that is at least half the length of the
// longer range. Returns an array describing the substring [startA,
// startB, len], or null.
function halfMatch(
  a: string, fromA: number, toA: number, b: string, fromB: number, toB: number
): [number, number, number] | null{
  let lenA = toA - fromA, lenB = toB - fromB
  if (lenA < lenB) {
    let result = halfMatch(b, fromB, toB, a, fromA, toA)
    return result && [result[1], result[0], result[2]]
  }
  // From here a is known to be at least as long as b

  if (lenA < 4 || lenB * 2 < lenA) return null

  let rangeB = b.slice(fromB, toB)
  // Does a substring of `b` exist within `a` that is at least half
  // the length of `a`?
  function scanFrom(seedFrom: number): [number, number, number] | null {
    // Look for a ¼ length substring
    let seedTo = seedFrom + Math.floor(lenA / 4)
    if (!validIndex(a, seedFrom)) seedFrom++
    if (!validIndex(a, seedTo)) seedTo--
    if (seedFrom >= seedTo) return null
    let seed = a.slice(seedFrom, seedTo)
    let found = -1, best: [number, number, number] | undefined
    while ((found = rangeB.indexOf(seed, found + 1)) != -1) {
      let prefixAfter = commonPrefix(a, seedTo, toA, b, fromB + found + seed.length, toB)
      let suffixBefore = commonSuffix(a, fromA, seedFrom, b, fromB, fromB + found)
      let length = seed.length + prefixAfter + suffixBefore
      if (!best || best[2] < length) best = [seedFrom - suffixBefore, fromB + found - suffixBefore, length]
    }
    return best && best[2] * 2 > lenA ? best : null
  }

  // Try to find a match around the second and third quarters of
  // string.
  let match1 = scanFrom(fromA + Math.ceil(lenA / 4))
  let match2 = scanFrom(fromA + Math.ceil(lenA / 2))
  return match1 && (!match2 || match2[2] < match1[2]) ? match1 : match2
}

function mergeAdjacent(changes: Change[], minGap: number) {
  for (let i = 1; i < changes.length; i++) {
    let prev = changes[i - 1], cur = changes[i]
    if (prev.toA > cur.fromA - minGap && prev.toB > cur.fromB - minGap) {
      changes[i - 1] = new Change(prev.fromA, cur.toA, prev.fromB, cur.toB)
      changes.splice(i--, 1)
    }
  }
}

// Reorder and merge changes
function normalize(a: string, b: string, changes: Change[]) {
  for (;;) {
    mergeAdjacent(changes, 1)
    let moved = false
    // Move unchanged ranges that can be fully moved across an
    // adjacent insertion/deletion, to simplify the diff.
    for (let i = 0; i < changes.length; i++) {
      let ch = changes[i], pre, post
      // The half-match heuristic sometimes produces non-minimal
      // diffs. Strip matching pre- and post-fixes again here.
      if (pre = commonPrefix(a, ch.fromA, ch.toA, b, ch.fromB, ch.toB))
        ch = changes[i] = new Change(ch.fromA + pre, ch.toA, ch.fromB + pre, ch.toB)
      if (post = commonSuffix(a, ch.fromA, ch.toA, b, ch.fromB, ch.toB))
        ch = changes[i] = new Change(ch.fromA, ch.toA - post, ch.fromB, ch.toB - post)
      let lenA = ch.toA - ch.fromA, lenB = ch.toB - ch.fromB
      // Only look at plain insertions/deletions
      if (lenA && lenB) continue
      let beforeLen = ch.fromA - (i ? changes[i - 1].toA : 0)
      let afterLen = (i < changes.length - 1 ? changes[i + 1].fromA : a.length) - ch.toA
      if (!beforeLen || !afterLen) continue
      let text = lenA ? a.slice(ch.fromA, ch.toA) : b.slice(ch.fromB, ch.toB)
      if (beforeLen <= text.length &&
          a.slice(ch.fromA - beforeLen, ch.fromA) == text.slice(text.length - beforeLen)) {
        // Text before matches the end of the change
        changes[i] = new Change(ch.fromA - beforeLen, ch.toA - beforeLen, ch.fromB - beforeLen, ch.toB - beforeLen)
        moved = true
      } else if (afterLen <= text.length &&
                 a.slice(ch.toA, ch.toA + afterLen) == text.slice(0, afterLen)) {
        // Text after matches the start of the change
        changes[i] = new Change(ch.fromA + afterLen, ch.toA + afterLen, ch.fromB + afterLen, ch.toB + afterLen)
        moved = true
      }
    }
    if (!moved) break
  }
  return changes
}

// Process a change set to make it suitable for presenting to users.
function makePresentable(changes: Change[], a: string, b: string) {
  for (let posA = 0, i = 0; i < changes.length; i++) {
    let change = changes[i]
    let lenA = change.toA - change.fromA, lenB = change.toB - change.fromB
    // Don't touch short insertions or deletions.
    if (lenA && lenB || lenA > 3 || lenB > 3) {
      let nextChangeA = i == changes.length - 1 ? a.length : changes[i + 1].fromA
      let maxScanBefore = change.fromA - posA, maxScanAfter = nextChangeA - change.toA
      let boundBefore = findWordBoundaryBefore(a, change.fromA, Math.min(maxScanBefore, 5))
      let boundAfter = findWordBoundaryAfter(a, change.toA, Math.min(maxScanAfter, 5))
      let lenBefore = change.fromA - boundBefore, lenAfter = boundAfter - change.toA
      if (!lenA || !lenB) {
        let changeLen = Math.max(lenA, lenB)
        let [changeText, changeFrom, changeTo] = lenA ? [a, change.fromA, change.toA] : [b, change.fromB, change.toB]
        let indentBefore, indentLen
        // An insertion or deletion that falls inside words on both
        // sides can maybe be moved to align with word boundaries.
        if (lenBefore && lenAfter) {
          if (changeLen > lenBefore &&
              a.slice(boundBefore, change.fromA) == changeText.slice(changeTo - lenBefore, changeTo)) {
            change = changes[i] = new Change(boundBefore, boundBefore + lenA, change.fromB - lenBefore, change.toB - lenBefore)
            boundBefore = change.fromA
            boundAfter = findWordBoundaryAfter(a, change.toA, Math.min(nextChangeA - change.toA, 5))
          } else if (changeLen > lenAfter &&
                     a.slice(change.toA, boundAfter) == changeText.slice(changeFrom, changeFrom + lenAfter)) {
            change = changes[i] = new Change(boundAfter - lenA, boundAfter, change.fromB + lenAfter, change.toB + lenAfter)
            boundAfter = change.toA
            boundBefore = findWordBoundaryBefore(a, change.fromA, Math.min(change.fromA - posA, 5))
          }
          lenBefore = change.fromA - boundBefore; lenAfter = boundAfter - change.toA
        // Indentation before the change is repeated at its end. Move it across.
        } else if (!lenBefore && !lenAfter &&
                   (indentLen = change.fromA - (indentBefore = findIndentBefore(a, change.fromA, maxScanBefore))) &&
                   a.slice(indentBefore, change.fromA) == changeText.slice(changeTo - indentLen, changeTo)) {
          change = changes[i] = new Change(indentBefore, indentBefore + lenA,
                                           change.fromB - indentLen, change.toB - indentLen)
        }
      }
      // Grow the change to the word boundaries.
      if (lenBefore || lenAfter) {
        change = changes[i] = new Change(change.fromA - lenBefore, change.toA + lenAfter,
                                         change.fromB - lenBefore, change.toB + lenAfter)
      }
      posA = change.toA
    }
  }

  mergeAdjacent(changes, 3)
  return changes
}

let wordChar: RegExp | null
try { wordChar = new RegExp("[\\p{Alphabetic}\\p{Number}]", "u") } catch (_) {}

function asciiWordChar(code: number) {
  return code > 48 && code < 58 || code > 64 && code < 91 || code > 96 && code < 123
}

function wordCharAfter(s: string, pos: number) {
  if (pos == s.length) return 0
  let next = s.charCodeAt(pos)
  if (next < 192) return asciiWordChar(next) ? 1 : 0
  if (!wordChar) return 0
  if (!isSurrogate1(next) || pos == s.length - 1) return wordChar.test(String.fromCharCode(next)) ? 1 : 0
  return wordChar.test(s.slice(pos, pos + 2)) ? 2 : 0
}

function wordCharBefore(s: string, pos: number) {
  if (!pos) return 0
  let prev = s.charCodeAt(pos - 1)
  if (prev < 192) return asciiWordChar(prev) ? 1 : 0
  if (!wordChar) return 0
  if (!isSurrogate2(prev) || pos == 1) return wordChar.test(String.fromCharCode(prev)) ? 1 : 0
  return wordChar.test(s.slice(pos - 2, pos)) ? 2 : 0
}

function findWordBoundaryAfter(s: string, pos: number, max: number) {
  if (pos == s.length || !wordCharBefore(s, pos)) return pos
  for (let cur = pos, end = pos + max;;) {
    let size = wordCharAfter(s, cur)
    if (!size) return cur
    cur += size
    if (cur > end) return pos
  }
}

function findWordBoundaryBefore(s: string, pos: number, max: number) {
  if (!pos || !wordCharAfter(s, pos)) return pos
  for (let cur = pos, end = pos - max;;) {
    let size = wordCharBefore(s, cur)
    if (!size) return cur
    cur -= size
    if (cur < end) return pos
  }
}

function findIndentBefore(s: string, pos: number, max: number) {
  for (let cur = pos, end = pos - max;;) {
    let next = cur ? s.charCodeAt(cur - 1) : 10
    if (next == 10) return cur
    cur--
    if (cur < end || (next != 32 && next != 9)) return pos
  }
}

const isSurrogate1 = (code: number) => code >= 0xD800 && code <= 0xDBFF
const isSurrogate2 = (code: number) => code >= 0xDC00 && code <= 0xDFFF

// Returns false if index looks like it is in the middle of a
// surrogate pair.
function validIndex(s: string, index: number) {
  return !index || index == s.length || !isSurrogate1(s.charCodeAt(index - 1)) || !isSurrogate2(s.charCodeAt(index))
}

/// Compute the difference between two strings.
export function diff(a: string, b: string): readonly Change[] {
  return normalize(a, b, findDiff(a, 0, a.length, b, 0, b.length))
}

/// Compute the difference between the given strings, and clean up the
/// resulting diff for presentation to users by dropping short
/// unchanged ranges, and aligning changes to word boundaries when
/// appropriate.
export function presentableDiff(a: string, b: string): readonly Change[] {
  return makePresentable(diff(a, b) as Change[], a, b)
}
