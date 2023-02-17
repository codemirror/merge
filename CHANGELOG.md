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
