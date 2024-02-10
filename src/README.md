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

## Example

An example is available at [Try CodeMirror](https://codemirror.net/try/?example=Merge%20View).

## API Reference

### Side-by-side Merge View

@MergeConfig

@DirectMergeConfig

@MergeView

### Unified Merge View

@unifiedMergeView

@acceptChunk

@rejectChunk

@getOriginalDoc

@originalDocChangeEffect

@updateOriginalDoc

### Chunks

@Chunk

@getChunks

@goToNextChunk

@goToPreviousChunk

### Diffing Utilities

@Change

@diff

@presentableDiff

@DiffConfig
