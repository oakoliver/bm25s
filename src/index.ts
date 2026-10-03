/**
 * bm25s - Ultra-fast BM25 implementation for Bun
 * 
 * Zero-dependency, high-performance lexical search library
 * inspired by Python's bm25s library.
 * 
 * @example
 * ```typescript
 * import { BM25, tokenize } from "bm25s";
 * 
 * // Create corpus
 * const corpus = [
 *   "a cat is a feline and likes to purr",
 *   "a dog is the human's best friend and loves to play",
 *   "a bird is a beautiful animal that can fly",
 *   "a fish is a creature that lives in water and swims",
 * ];
 * 
 * // Tokenize corpus
 * const corpusTokens = tokenize(corpus);
 * 
 * // Create and index
 * const retriever = new BM25();
 * retriever.index(corpusTokens);
 * 
 * // Search
 * const query = "does the fish purr like a cat?";
 * const queryTokens = tokenize([query]);
 * const results = retriever.retrieve(queryTokens, { k: 2 });
 * 
 * console.log("Top results:", results.documents);
 * console.log("Scores:", results.scores);
 * 
 * // Save index for later
 * await retriever.save("./my-index");
 * 
 * // Load saved index
 * const loaded = await BM25.load("./my-index");
 * ```
 */

// Main BM25 class
export { BM25, type BM25Options, type RetrievalResults, type RetrieveOptions } from "./bm25.js";

// Tokenization
export {
  tokenize,
  Tokenizer,
  convertTokenizedToStrings,
  createSplitter,
  defaultSplitter,
  type Tokenized,
  type TokenizerOptions,
  type TokenizeOptions,
  type TokenizeCallOptions,
  type StemmerFn,
  type SplitterFn,
} from "./tokenizer.js";

// Stopwords
export {
  getStopwords,
  STOPWORDS_EN,
  STOPWORDS_EN_PLUS,
  STOPWORDS_GERMAN,
  STOPWORDS_FRENCH,
  STOPWORDS_SPANISH,
  STOPWORDS_PORTUGUESE,
  STOPWORDS_ITALIAN,
  STOPWORDS_DUTCH,
  STOPWORDS_RUSSIAN,
  STOPWORDS_SWEDISH,
  STOPWORDS_NORWEGIAN,
  STOPWORDS_CHINESE,
  STOPWORDS_TURKISH,
  STOPWORDS_KOREAN,
  STOPWORDS_DANISH,
  STOPWORDS_MAP,
  type StopwordsLanguage,
} from "./stopwords.js";

// Scoring utilities (for advanced users)
export {
  type BM25Method,
  scoreTfcRobertson,
  scoreTfcLucene,
  scoreTfcAtire,
  scoreTfcBm25l,
  scoreTfcBm25plus,
  scoreIdfRobertson,
  scoreIdfLucene,
  scoreIdfAtire,
  scoreIdfBm25l,
  scoreIdfBm25plus,
  getTfcScorer,
  getIdfScorer,
} from "./scoring.js";

// Selection utilities
export { topK, batchTopK, argmax, argsortDesc, type TopKResult } from "./selection.js";

// Sparse matrix utilities (for advanced users)
export {
  buildCSCMatrix,
  buildCSCMatrixStable,
  getColumn,
  getColumnNnz,
  getTotalNnz,
  serializeCSC,
  deserializeCSC,
  type CSCMatrix,
} from "./sparse.js";
