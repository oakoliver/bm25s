/**
 * Tests for top-k selection.
 */
import { describe, it, expect } from "bun:test";
import { topK } from "../src/selection";
import { BM25, tokenize, type Tokenized } from "../src/index";

/** Reference: stable sort by score descending, ties by ascending index. */
function referenceTopK(scores: Float64Array, k: number): number[] {
  return Array.from(scores.keys())
    .sort((a, b) => scores[b] - scores[a] || a - b)
    .slice(0, k);
}

describe("topK", () => {
  it("matches a stable full sort, including ties, for any n and k", () => {
    let seed = 7;
    const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (const n of [1, 5, 10, 50, 999, 1000, 1001, 5000]) {
      // Few distinct values, so ties are common
      const scores = Float64Array.from({ length: n }, () => Math.floor(random() * 4));
      for (const k of [1, 3, 10, Math.ceil(n / 2), n]) {
        const result = topK(scores, k);
        expect(Array.from(result.indices)).toEqual(referenceTopK(scores, k));
        expect(Array.from(result.scores)).toEqual(referenceTopK(scores, k).map((i) => scores[i]));
      }
    }
  });

  it("queries a 1K-doc corpus at least as fast as a 5K-doc corpus", () => {
    const words = Array.from({ length: 500 }, (_, i) => `w${i}`);
    let seed = 42;
    const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const text = (n: number) =>
      Array.from({ length: n }, () => words[Math.floor(random() * words.length)]).join(" ");

    const qps = (numDocs: number) => {
      const retriever = new BM25();
      retriever.index(tokenize(Array.from({ length: numDocs }, () => text(50))) as Tokenized);
      const queries = tokenize(Array.from({ length: 500 }, () => text(3))) as Tokenized;
      retriever.retrieve(queries, { k: 10 });
      const start = performance.now();
      retriever.retrieve(queries, { k: 10 });
      return 500 / (performance.now() - start);
    };

    // A 1K corpus has a fifth of the postings; before the fix it was 3-10x
    // slower than 5K. Allow generous noise.
    expect(qps(1000)).toBeGreaterThan(qps(5000) * 0.7);
  });
});
