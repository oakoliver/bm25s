// Type-level expectations for BM25.retrieve(). Compiled under --strict by
// tests/types.test.ts; not executed.
import { BM25, tokenize } from "../../src/index";

const corpus = ["a cat purrs", "a dog plays"];
const query = tokenize(["cat"]);

// Indices by default
const indexed = new BM25();
indexed.index(tokenize(corpus));
const index: number = indexed.retrieve(query).documents[0][0];
const score: number = indexed.retrieve(query, { k: 1 }).scores[0][0];
// @ts-expect-error documents are indices, not strings
const notString: string = indexed.retrieve(query).documents[0][0];

// A corpus passed to retrieve() decides the document type
const titles = indexed.retrieve(query, { corpus: [{ title: "Cat" }, { title: "Dog" }] });
const title: string = titles.documents[0][0].title;
const docsOnly: string[][] = indexed.retrieve(query, { corpus, returnAs: "documents" });

// A stored corpus is declared on the class
const stored = new BM25<string>();
stored.index(tokenize(corpus), { corpus });
const text: string = stored.retrieve(query).documents[0][0];
const textsOnly: string[][] = stored.retrieve(query, { returnAs: "documents" });

export { index, score, notString, title, docsOnly, text, textsOnly };
