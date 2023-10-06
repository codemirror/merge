## 6.2.0 (2023-10-06)

### New features

The package now exports `goToNextChunk` and `goToPreviousChunk` commands that allow by-changed-chunk document navigation.

## 6.1.3 (2023-09-28)

### Bug fixes

Create alignment spacers for the whole document, not just the viewport, to avoid scroll position popping and misalignment.

## 6.1.2 (2023-08-18)

### Bug fixes

Fall back to treating entire documents as changed when they are too large to compute a diff in a reasonable timeframe.

## 6.1.1 (2023-06-05)

### Bug fixes

Fix a crash when `unifiedMergeView` is added to an existing state by reconfiguration.

## 6.1.0 (2023-05-06)

### Bug fixes

Add `<ins>`/`<del>` tags around inserted and deleted lines to give screen readers a chance to communicate their role.

### New features

The new `unifiedMergeView` extension can be used to display a diff inside a single editor, by inserting deleted content as widgets in the document.

## 6.0.2 (2023-04-18)

### Bug fixes

Fix a bug that could cause `diff` to loop endlessly when the input contains astral characters in specific positions.

## 6.0.1 (2023-03-28)

### Bug fixes

Fix a bug that would cause diffing to loop infinitely with some inputs.

## 6.0.0 (2023-03-22)

### Bug fixes

Improve performance of the merge view when the inputs are almost entirely different.

### New features

`diff` and `presentableDiff` now take an optional `scanLimit` option that can be used to trade speed for accuracy on very different inputs.

## 0.1.6 (2023-02-28)

### Bug fixes

Fix a bug where changed chunks could be found in equal documents.

## 0.1.5 (2023-02-26)

### New features

`Chunk` now exposes static methods for building an updating sets of chunks directly.

## 0.1.4 (2023-02-17)

### Bug fixes

Fix a bug that caused an extra stray newline to be inserted when pressing the merge button for a change at the end of the document.

Avoid generating incorrect chunks for insertions or deletions at the end of the document.

## 0.1.3 (2022-12-09)

### New features

It is now possible to change the configuration of a merge view with its `reconfigure` method.

## 0.1.2 (2022-12-05)

### New features

The `Chunk` data structure, and the set of chunks kept by the merge view, are now part of the public interface.

The new `orientation` option makes it possible to show editor B first.

## 0.1.1 (2022-11-14)

### Bug fixes

Color changed chunks in editor A red by default.
## 0.1.0 (2022-11-10)

### Breaking changes

First numbered release.
