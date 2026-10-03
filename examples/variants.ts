/**
 * Score the same query with every BM25 variant.
 *
 * Run: bun examples/variants.ts "cats that sleep"
 */

import { BM25, tokenize, type BM25Method } from "../src";
import { corpus } from "./corpus";

const query = process.argv.slice(2).join(" ") || "cats that sleep";
const methods: BM25Method[] = ["lucene", "robertson", "atire", "bm25l", "bm25+"];

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

const corpusTokens = tokenize(corpus);
const queryTokens = tokenize([query]);
const short = (doc: number) => {
  const text = corpus[doc];
  return text.length > 34 ? `${text.slice(0, 33)}…` : text;
};

console.log(`${bold("query")}  ${query}\n`);
console.log(dim(`  ${"method".padEnd(10)} ${"#1".padEnd(44)} ${"#2"}`));
for (const method of methods) {
  const retriever = new BM25({ method });
  retriever.index(corpusTokens);
  const { documents, scores } = retriever.retrieve(queryTokens, { k: 2 });
  const cells = documents[0].map((doc, i) => `${scores[0][i].toFixed(2).padStart(5)} ${short(doc)}`);
  console.log(`  ${bold(method.padEnd(10))} ${cells[0].padEnd(44)} ${cells[1]}`);
}
