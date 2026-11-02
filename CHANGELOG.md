# Changelog

## 2.1.0 (2026-11-02)

Synced with upstream Python bm25s **0.3.16** (was 0.3.11). The upstream diff
`0.3.11...0.3.16` is 13 commits across five releases. The score formulas,
stopword lists and default tokenizer did not change upstream in this range, so
results are identical to 2.0.0; this release adds API only, plus two
fail-fast behaviours for invalid input.

### Added

- `save(dir, { raiseOnSerializationError })` (upstream 0.3.16). See "Changed" for
  the default.
- `load(dir, { verbosity })`, accepted and ignored (upstream 0.3.14).
- Exported `SaveOptions` and `LoadOptions` types.
- `tests/fixtures/bm25s-0.3.16-reference.json` plus its generator: stopword
  lists, tokenization and scores produced by Python bm25s 0.3.16, checked by the
  test suite.

### Changed

- `topK()` and `retrieve()` throw a `RangeError` for a negative `k`
  (upstream 0.3.14: `ValueError`). Before, `retrieve({ k: -1 })` failed with an
  unrelated `TypeError`. `k = 0` still returns an empty result.
- `save()` now serializes the whole corpus before writing any file, so a corpus
  entry that cannot be serialized leaves no partial index in `saveDir`.
- Corpus entries that serialize to nothing (`undefined`, functions, symbols)
  are skipped with a `console.warn` instead of leaving a silent blank line.
  The loaded corpus is the same as before.
- **Deliberate difference from upstream:** an entry that `JSON.stringify` cannot
  serialize (circular reference, `BigInt`) still throws, now as a `TypeError`
  naming the entry and carrying the original error as `cause`. Upstream's
  default is to warn and skip it, which misaligns the saved corpus with the
  index; pass `raiseOnSerializationError: false` for that behaviour.

### Upstream changes and their disposition

| Upstream | Change | Disposition |
|---|---|---|
| 0.3.12 #198 | GIL-free concurrency: `nogil` numba kernels, serial numba path when `n_threads=1` | Python-only (numba / threads) |
| 0.3.12 #200, #209 | Corpus index paths for extensionless JSONL files; reject truncated corpora with a stale line index | Python-only (`JsonlCorpus` / mmap; the port keeps the corpus in memory) |
| 0.3.12 #207 | Contributor-eligibility GitHub workflow and CONTRIBUTING.md | Repo tooling, not ported |
| 0.3.13 #206 | `JsonlCorpus` loads zero-byte files as an empty corpus | Python-only (`JsonlCorpus`); the equivalent case, saving and loading an empty corpus, already worked and is now tested |
| 0.3.14 #213 | `topk` raises on negative `k` | Ported (`RangeError`) |
| 0.3.14 #211 | `verbosity` argument on `BM25.load` | Ported as an accepted no-op; upstream only uses it for mmap corpus logging |
| 0.3.14 #216 | Apply `weight_mask` after adding the non-occurrence score | Not applicable: the port has no `weight_mask` (never ported, in 0.3.11 or since) |
| 0.3.15 #217 | `load_qrels(return_dict=True)` keeps all qrels per query | Python-only (BEIR utilities, out of scope) |
| 0.3.16 #219 | Opt-in error for unserializable corpus entries in `BM25.save` | Ported as `raiseOnSerializationError`; default differs (see above) |
