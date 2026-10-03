// The README quickstart, verbatim except for the import path. Compiled under
// --strict by tests/types.test.ts; not executed.

import { BM25, tokenize } from "../../src/index";

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

export {};
