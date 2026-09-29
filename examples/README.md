# Examples

Two runnable demos. Both import the library straight from `../src`, so no build step is needed. Run them from the repository root with Bun.

| Demo | What it shows |
| --- | --- |
| `search.ts` | A search engine in a terminal: indexes a corpus paragraph by paragraph, times tokenization and indexing, then ranks results with score bars and highlighted query terms. It also indexes a synthetic corpus for throughput at scale. By default it searches a bundled, invented knowledge base; your own markdown is opt-in. |
| `multilingual.ts` | Queries in Korean, Danish, French, Chinese, German, Russian, Spanish and English against a small bundled corpus. It shows the Unicode splitter and stopword removal per query, and cross-checks every score against Python bm25s when that is installed. |

## search.ts

```sh
bun examples/search.ts                                             # bundled invented knowledge base
bun examples/search.ts path/to/docs -q "first query" -q "second"   # opt in: your own folder or .md file
bun examples/search.ts --docs 50000                                # smaller synthetic corpus (default 200000)
bun examples/search.ts --no-scale                                  # skip the synthetic corpus
```

- The default corpus comes from `kb-corpus.ts`, a seeded generator for the docs of "Driftwood", a fictional self-hosted job queue. It produces 14 articles and just under 300 paragraphs, and contains no real data. The default queries are written for it; pass `-q` to use your own.
- When you pass a path, markdown files are found recursively, skipping `node_modules`, `dist` and dot-directories. Front matter and fenced code blocks are dropped, and each remaining paragraph becomes one document. The result title comes from the front matter `title`, then the first `# heading`, then the file name.
- Results show the best paragraph per article, for the top three articles.
- Timings are the median of three runs. The synthetic corpus uses 50 Zipf-distributed pseudo-words per document and a fixed seed, so it is identical on every run. The 200,000-document default builds about 9M tokens and takes a few seconds.

## multilingual.ts

```sh
bun examples/multilingual.ts
BM25S_PYTHON=.venv/bin/python bun examples/multilingual.ts   # with the Python cross-check
```

- The corpus and queries live in `multilingual-corpus.json`. They are invented sentences written for this demo. The Chinese text is pre-segmented with spaces, because bm25s splits on word-character runs and does not segment Chinese itself.
- Stopwords are the union of all 15 bundled lists. Removed words are shown struck through.
- **Optional Python cross-check.** If the interpreter in `BM25S_PYTHON` (default `python3`) can import `bm25s` **0.3.11**, the demo runs `py_scores.py` on the same corpus. It compares every document score for every query and prints the maximum difference. Parity means under 5e-6; Python scores in float32, so differences of about 1e-7 are expected. Otherwise the Python columns are hidden and a note explains why. A different bm25s version is reported, not compared.

```sh
python3 -m venv .venv && .venv/bin/pip install bm25s==0.3.11
```

## Styling

The demos use [`@oakoliver/lipgloss`](https://www.npmjs.com/package/@oakoliver/lipgloss) for styling when it is installed (`bun add -d @oakoliver/lipgloss`). It is not a dependency of this package. Without it, `style.ts` falls back to a small built-in subset of the same API that prints plain truecolor ANSI, so the output looks almost the same. Set `NO_LIPGLOSS=1` to force the fallback.

Type-check the examples with `bunx tsc --noEmit -p examples/tsconfig.json`.
