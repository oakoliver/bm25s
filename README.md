# bun-bm25s

A Bun-native, zero-dependency implementation of BM25 for extremely fast full-text search. Inspired by the Python [bm25s](https://github.com/xhluca/bm25s) library.

## Features

- **Blazing Fast**: 4.3M+ tokens/sec indexing, 2-3x faster than Python bm25s
- **Zero Dependencies**: Pure TypeScript, no external packages required
- **Bun Native**: Optimized for the Bun runtime
- **Multiple BM25 Variants**: Robertson, Lucene, ATIRE, BM25L, BM25+
- **Eager Sparse Scoring**: Precomputes scores during indexing for instant retrieval
- **Built-in Tokenizer**: Stopwords for 12 languages, custom stemming support
- **Persistence**: Save and load indices to/from disk

## Installation

```bash
bun add bun-bm25s
```

Or clone and use directly:

```bash
git clone https://github.com/oakoliver/bun-bm25s
cd bun-bm25s
bun install
```

## Quickstart

```typescript
import { BM25, tokenize } from "bun-bm25s";

// Create your corpus
const corpus = [
  "a cat is a feline and likes to purr",
  "a dog is the human's best friend and loves to play",
  "a bird is a beautiful animal that can fly",
  "a fish is a creature that lives in water and swims",
];

// Tokenize the corpus and index it
const corpusTokens = tokenize(corpus);
const retriever = new BM25();
retriever.index(corpusTokens);

// Query the corpus
const query = "does the fish purr like a cat?";
const queryTokens = tokenize([query]);
const { documents, scores } = retriever.retrieve(queryTokens, { k: 2 });

console.log(`Best match (score: ${scores[0][0].toFixed(2)}): Document ${documents[0][0]}`);
// Best match (score: 1.23): Document 0

// Save the index for later
await retriever.save("my_index");

// Load it when needed
const loaded = await BM25.load("my_index");
```

## API Reference

### `tokenize(texts, options?)`

Tokenize text documents into token IDs.

```typescript
import { tokenize } from "bun-bm25s";

// Basic usage
const result = tokenize(["hello world", "foo bar"]);
console.log(result.ids);   // [[0, 1], [2, 3]]
console.log(result.vocab); // Map { 'hello' => 0, 'world' => 1, ... }

// With options
const result = tokenize(texts, {
  lower: true,           // Convert to lowercase (default: true)
  stopwords: "en",       // Language or custom list (default: "en")
  stemmer: (word) => word.slice(0, 6),  // Custom stemmer function
  splitter: /\w+/g,      // Custom regex or function
});

// Return only IDs (no vocab)
const ids = tokenize(texts, { returnIds: true });
```

**Supported stopword languages:** `en`, `de`, `fr`, `es`, `it`, `pt`, `nl`, `ru`, `ar`, `zh`, `ja`, `ko`

### `Tokenizer` Class

For more control, use the `Tokenizer` class directly:

```typescript
import { Tokenizer } from "bun-bm25s";

const tokenizer = new Tokenizer({
  lower: true,
  stopwords: ["the", "a", "an"],
  stemmer: myCustomStemmer,
});

// Tokenize with vocab updates
const result = tokenizer.tokenize(texts, { returnAs: "tuple" });

// Streaming tokenization for large datasets
for (const ids of tokenizer.streamingTokenize(texts)) {
  // Process each document's IDs
}

// Save/load vocabulary
const vocab = tokenizer.saveVocab();
tokenizer.loadVocab(vocab);
```

### `BM25` Class

Main class for indexing and retrieval.

```typescript
import { BM25 } from "bun-bm25s";

// Create with options
const retriever = new BM25({
  method: "lucene",    // BM25 variant (default: "lucene")
  k1: 1.5,             // Term frequency saturation (default: 1.5)
  b: 0.75,             // Document length normalization (default: 0.75)
  delta: 0.5,          // For BM25L/BM25+ (default: 0.5)
  idfMethod: "lucene", // IDF calculation method (default: same as method)
});
```

#### Methods

**`index(corpusTokens, options?)`**

Build the BM25 index from tokenized documents.

```typescript
retriever.index(corpusTokens, {
  corpus: originalDocs,  // Store original documents for retrieval
});
```

**`retrieve(queryTokens, options?)`**

Retrieve top-k documents for queries.

```typescript
const results = retriever.retrieve(queryTokens, {
  k: 10,              // Number of results (default: 10)
  sorted: true,       // Sort by score descending (default: true)
  corpus: titles,     // Override corpus for results
  returnAs: "tuple",  // "tuple" (default) or "documents"
});

// Results format
console.log(results.documents); // [[docIdx1, docIdx2, ...], ...]
console.log(results.scores);    // [Float64Array([score1, score2, ...]), ...]
```

**`save(directory, options?)`**

Save the index to disk.

```typescript
await retriever.save("./my_index", {
  corpus: originalDocs,  // Optionally save corpus
});
```

**`BM25.load(directory, options?)`**

Load an index from disk.

```typescript
const retriever = await BM25.load("./my_index", {
  loadCorpus: true,  // Load saved corpus
});
```

## BM25 Variants

Choose the variant that best fits your use case:

| Method | Description | Use Case |
|--------|-------------|----------|
| `lucene` | Lucene's exact implementation (default) | General purpose, production |
| `robertson` | Original BM25 (Robertson et al.) | Academic, research |
| `atire` | ATIRE implementation | Compatible with ATIRE systems |
| `bm25l` | BM25L (with delta parameter) | Long documents |
| `bm25+` | BM25+ (with delta parameter) | Handles term absence better |

```typescript
// Using different variants
const lucene = new BM25({ method: "lucene" });
const robertson = new BM25({ method: "robertson", k1: 1.2, b: 0.75 });
const bm25l = new BM25({ method: "bm25l", delta: 1.0 });
```

## Benchmarks

*Benchmarks run on Apple M2 Max (12 cores, 96GB RAM), macOS 26.1, Bun 1.3.10*

### Comparison with Python bm25s

bun-bm25s is significantly faster than the original Python bm25s library (numpy backend):

**vs Python bm25s (numpy backend):**

| Metric | Python (numpy) | bun-bm25s | Speedup |
|--------|----------------|-----------|---------|
| Indexing (100K docs) | 2.54 s | 1.20 s | **2.1x faster** |
| Retrieval (100K docs) | 1,067 QPS | 2,730 QPS | **2.6x faster** |

**Indexing Performance:**

| Corpus Size | Python bm25s | bun-bm25s | Speedup |
|-------------|--------------|-----------|---------|
| 1,000 | 25 ms | 16 ms | **1.6x faster** |
| 5,000 | 125 ms | 63 ms | **2.0x faster** |
| 10,000 | 248 ms | 117 ms | **2.1x faster** |
| 50,000 | 1.27 s | 571 ms | **2.2x faster** |
| 100,000 | 2.54 s | 1.20 s | **2.1x faster** |

**Retrieval Performance (1000 queries, k=10):**

| Corpus Size | Python QPS | bun-bm25s QPS | Speedup |
|-------------|------------|---------------|---------|
| 5,000 | 15,217 | 49,262 | **3.2x faster** |
| 10,000 | 8,369 | 27,103 | **3.2x faster** |
| 50,000 | 1,984 | 6,086 | **3.1x faster** |
| 100,000 | 1,067 | 3,181 | **3.0x faster** |

**vs Python bm25s (numba backend):**

When Python bm25s uses the numba JIT-compiled backend, the comparison changes:

| Metric | Python (numba) | bun-bm25s | Notes |
|--------|----------------|-----------|-------|
| Indexing | Slower | **2.0x faster** | bun-bm25s wins |
| Retrieval (small corpus) | 211K QPS | 6.8K QPS | numba JIT is faster |
| Retrieval (large corpus) | ~3K QPS | ~3K QPS | Comparable |

> **Note:** Python's numba backend excels at retrieval on small corpora due to JIT compilation. For larger corpora (50K+ docs), performance converges. bun-bm25s wins on indexing speed and offers zero dependencies with simpler deployment.

**Summary:**
- **2x faster** indexing vs both numpy and numba backends
- **2.5-3x faster** retrieval vs numpy backend
- **4.3M+ tokens/sec** indexing throughput
- **3K+ QPS** retrieval on 100K documents

Run the comparison yourself:

```bash
# Install Python bm25s first: pip install bm25s numba
bun run benchmarks/compare.ts
```

### Detailed Benchmarks

### Indexing & Retrieval Performance

| Corpus Size | Index Time | Tokens/sec | Query Latency | QPS |
|-------------|------------|------------|---------------|-----|
| 1,000 | 16 ms | 3.1M | 145 µs | 6,891 |
| 5,000 | 60 ms | 4.1M | 22 µs | 45,964 |
| 10,000 | 114 ms | 4.4M | 38 µs | 26,039 |
| 50,000 | 552 ms | 4.5M | 164 µs | 6,109 |
| 100,000 | 1.08 s | 4.6M | 329 µs | 3,036 |

### BM25 Variant Comparison (10K docs)

| Method | Index Time | QPS |
|--------|------------|-----|
| robertson | 64 ms | 27,323 |
| lucene | 64 ms | 28,185 |
| atire | 66 ms | 27,802 |
| bm25l | 69 ms | 26,112 |
| bm25+ | 67 ms | 24,522 |

### Top-K Retrieval Impact

| Top-K | Query Time (100 queries) | QPS |
|-------|--------------------------|-----|
| k=1 | 3.17 ms | 31,520 |
| k=10 | 4.29 ms | 23,306 |
| k=100 | 9.26 ms | 10,802 |
| k=500 | 31.66 ms | 3,159 |

Run benchmarks yourself:

```bash
bun run benchmarks/benchmark.ts
```

## How It Works

bun-bm25s uses **eager sparse scoring** - a technique that precomputes BM25 scores during indexing and stores them in a Compressed Sparse Column (CSC) matrix. This allows O(1) lookup of all documents containing a given token at query time.

### Architecture

1. **Tokenization**: Documents are tokenized, stopwords removed, and optionally stemmed
2. **Indexing**: BM25 scores are precomputed for every (document, token) pair
3. **Storage**: Scores are stored in CSC sparse matrix format for memory efficiency
4. **Retrieval**: Query tokens are looked up in the matrix and scores aggregated
5. **Selection**: Top-k results are selected using efficient partial sorting

### CSC Matrix Format

The CSC (Compressed Sparse Column) format stores:
- `data`: Non-zero BM25 scores
- `indices`: Document indices for each score
- `indptr`: Column pointers for each token

This allows iterating over all documents containing a specific token in O(nnz) time, where nnz is the number of documents containing that token.

## Examples

### Basic Search

```typescript
import { BM25, tokenize } from "bun-bm25s";

const docs = [
  "The quick brown fox jumps over the lazy dog",
  "A fast auburn fox leaps above a sleepy canine",
  "The dog is sleeping peacefully in the sun",
];

const tokens = tokenize(docs);
const bm25 = new BM25();
bm25.index(tokens, { corpus: docs });

const queryTokens = tokenize(["quick fox jumping"]);
const results = bm25.retrieve(queryTokens, { k: 2 });

results.documents[0].forEach((doc, i) => {
  console.log(`${i + 1}. (${results.scores[0][i].toFixed(2)}) ${doc}`);
});
```

### With Custom Stemming

```typescript
import { BM25, Tokenizer } from "bun-bm25s";

// Porter-style suffix stripping (simplified)
const stemmer = (word: string) => {
  return word
    .replace(/ing$/, "")
    .replace(/ed$/, "")
    .replace(/s$/, "");
};

const tokenizer = new Tokenizer({
  stemmer,
  stopwords: "en",
});

const docs = ["running", "runs", "ran", "runner"];
const tokens = tokenizer.tokenize(docs, { returnAs: "tuple" });

const bm25 = new BM25();
bm25.index(tokens);
```

### Persisting Indices

```typescript
import { BM25, tokenize } from "bun-bm25s";

// Index once
const docs = loadMyDocuments(); // Your documents
const tokens = tokenize(docs);
const bm25 = new BM25();
bm25.index(tokens, { corpus: docs });

// Save to disk
await bm25.save("./search_index", { corpus: docs });

// Later: load and search
const loaded = await BM25.load("./search_index", { loadCorpus: true });
const results = loaded.retrieve(tokenize(["search query"]), { k: 10 });
```

### Multiple Queries

```typescript
const queries = [
  "machine learning algorithms",
  "neural network training",
  "deep learning models",
];

const queryTokens = tokenize(queries);
const results = bm25.retrieve(queryTokens, { k: 5 });

// results.documents is array of arrays: [[q1 results], [q2 results], [q3 results]]
queries.forEach((query, i) => {
  console.log(`\nResults for: "${query}"`);
  results.documents[i].forEach((docIdx, j) => {
    console.log(`  ${j + 1}. Doc ${docIdx} (score: ${results.scores[i][j].toFixed(2)})`);
  });
});
```

## Testing

```bash
bun test
```

## License

MIT

## Author

**Antonio Oliveira** - Senior Technical Architect & Fractional CTO

- Website: [oakoliver.com](https://oakoliver.com)
- GitHub: [@oliveiraantoniocc](https://github.com/oliveiraantoniocc)
- LinkedIn: [oliveiraantoniocc](https://www.linkedin.com/in/oliveiraantoniocc/)
- Mentoring: [codementor.io/@oliveira.antonio.cc](https://www.codementor.io/@oliveira.antonio.cc)

## Acknowledgements

- [bm25s](https://github.com/xhluca/bm25s) - The Python library that inspired this implementation
- [Kamphuis et al. 2020](https://link.springer.com/chapter/10.1007/978-3-030-45442-5_4) - Which BM25 Do You Mean? A Large-Scale Reproducibility Study of Scoring Variants
