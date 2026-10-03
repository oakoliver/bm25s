/**
 * Search a small corpus and print ranked, scored results.
 *
 * Run: bun examples/quick-search.ts "which animals hunt at night?"
 */

import { BM25, tokenize } from "../src";
import { corpus } from "./corpus";

const query = process.argv.slice(2).join(" ") || "which animals hunt at night?";
const k = 3;

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const accent = (s: string) => `\x1b[38;2;137;180;250m${s}\x1b[0m`;

const start = performance.now();
const retriever = new BM25();
retriever.index(tokenize(corpus));
const indexMs = performance.now() - start;

const { documents, scores } = retriever.retrieve(tokenize([query]), { k });
const best = scores[0][0] || 1;

console.log(dim(`indexed ${corpus.length} documents in ${indexMs.toFixed(2)} ms`));
console.log(`${bold("query")}  ${query}\n`);
// retrieve() always returns k results; documents sharing no query term score 0.
documents[0].forEach((doc, rank) => {
  const score = scores[0][rank];
  if (score <= 0) return;
  const bar = "█".repeat(Math.max(1, Math.round((score / best) * 12))).padEnd(12, " ");
  console.log(`  ${bold(`${rank + 1}.`)} ${accent(bar)} ${score.toFixed(2).padStart(5)}  ${corpus[doc]}`);
});
console.log();
