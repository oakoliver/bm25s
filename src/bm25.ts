/**
 * BM25 - Main class for BM25 indexing and retrieval
 * 
 * High-performance implementation inspired by bm25s (Python)
 * Uses eager sparse scoring for extremely fast retrieval
 */

import {
  type BM25Method,
  calculateDocFreqs,
  buildIdfArray,
  buildNonOccurrenceArray,
  buildScoresAndIndices,
  computeRelevanceScores,
  getTfcScorer,
  getIdfScorer,
} from "./scoring";
import { buildCSCMatrix, type CSCMatrix, serializeCSC, deserializeCSC } from "./sparse";
import { topK, type TopKResult } from "./selection";
import { type Tokenized, tokenize, Tokenizer, type TokenizerOptions } from "./tokenizer";

/**
 * BM25 Configuration options
 */
export interface BM25Options {
  /** k1 parameter (term frequency saturation) - default: 1.5 */
  k1?: number;
  /** b parameter (document length normalization) - default: 0.75 */
  b?: number;
  /** delta parameter for BM25L/BM25+ - default: 0.5 */
  delta?: number;
  /** BM25 variant method - default: "lucene" */
  method?: BM25Method;
  /** IDF scoring method (defaults to same as method) */
  idfMethod?: BM25Method;
}

/**
 * Internal BM25 index storage
 */
interface BM25Index {
  /** CSC sparse matrix with precomputed scores */
  matrix: CSCMatrix;
  /** Number of documents */
  numDocs: number;
  /** Vocabulary size */
  vocabSize: number;
  /** Non-occurrence array for BM25L/BM25+ */
  nonOccArray: Float64Array | null;
}

/**
 * Retrieval results
 */
export interface RetrievalResults {
  /** Retrieved document indices or documents */
  documents: number[][] | any[][];
  /** Retrieval scores */
  scores: Float64Array[];
}

/**
 * BM25 retriever class
 * 
 * @example
 * ```typescript
 * import { BM25, tokenize } from "bun-bm25s";
 * 
 * const corpus = [
 *   "a cat is a feline and likes to purr",
 *   "a dog is the human's best friend and loves to play",
 *   "a bird is a beautiful animal that can fly",
 * ];
 * 
 * // Tokenize and index
 * const corpusTokens = tokenize(corpus);
 * const retriever = new BM25();
 * retriever.index(corpusTokens);
 * 
 * // Query
 * const queryTokens = tokenize(["does the fish purr like a cat?"]);
 * const results = retriever.retrieve(queryTokens, { k: 2 });
 * 
 * console.log(results.documents); // [[0, 2]]
 * console.log(results.scores);    // [[0.82, 0.45]]
 * ```
 */
export class BM25 {
  // BM25 Parameters
  private k1: number;
  private b: number;
  private delta: number;
  private method: BM25Method;
  private idfMethod: BM25Method;

  // Index storage
  private _index: BM25Index | null = null;
  private vocabDict: Map<string, number> = new Map();
  private corpus: any[] | null = null;

  // Methods requiring non-occurrence scoring
  private static readonly NON_OCC_METHODS: BM25Method[] = ["bm25l", "bm25+"];

  constructor(options: BM25Options = {}) {
    this.k1 = options.k1 ?? 1.5;
    this.b = options.b ?? 0.75;
    this.delta = options.delta ?? 0.5;
    this.method = options.method ?? "lucene";
    this.idfMethod = options.idfMethod ?? this.method;
  }

  /**
   * Get the BM25 method being used
   */
  getMethod(): BM25Method {
    return this.method;
  }

  /**
   * Check if index has been built
   */
  isIndexed(): boolean {
    return this._index !== null;
  }

  /**
   * Get number of indexed documents
   */
  getNumDocs(): number {
    return this._index?.numDocs ?? 0;
  }

  /**
   * Get vocabulary size
   */
  getVocabSize(): number {
    return this._index?.vocabSize ?? 0;
  }

  /**
   * Build the BM25 index from tokenized corpus
   * 
   * @param corpus - Tokenized corpus (from tokenize() function) or array of token ID arrays
   * @param options - Indexing options
   */
  index(
    corpus: Tokenized | number[][],
    options: {
      /** Store original corpus for retrieval */
      corpus?: any[];
      /** Show progress (currently unused, for API compatibility) */
      showProgress?: boolean;
    } = {}
  ): void {
    let corpusTokenIds: number[][];
    let vocabSize: number;

    // Handle different input types
    if (Array.isArray(corpus) && corpus.length > 0 && Array.isArray(corpus[0])) {
      // Already token IDs
      corpusTokenIds = corpus as number[][];
      // Compute vocab size from max token ID
      let maxId = 0;
      for (const doc of corpusTokenIds) {
        for (const id of doc) {
          if (id > maxId) maxId = id;
        }
      }
      vocabSize = maxId + 1;
    } else if ("ids" in corpus && "vocab" in corpus) {
      // Tokenized object
      const tokenized = corpus as Tokenized;
      corpusTokenIds = tokenized.ids;
      vocabSize = tokenized.vocab.size;
      this.vocabDict = new Map(tokenized.vocab);
    } else {
      throw new Error("Invalid corpus format. Expected Tokenized object or array of token ID arrays.");
    }

    // Store original corpus if provided
    if (options.corpus) {
      this.corpus = options.corpus;
    }

    // Build the index
    this.buildIndex(corpusTokenIds, vocabSize);
  }

  /**
   * Internal method to build the index
   */
  private buildIndex(corpusTokenIds: number[][], vocabSize: number): void {
    const numDocs = corpusTokenIds.length;

    // Calculate average document length
    let totalLen = 0;
    for (const doc of corpusTokenIds) {
      totalLen += doc.length;
    }
    const avgDocLen = totalLen / numDocs;

    // Step 1: Calculate document frequencies
    const docFreqs = calculateDocFreqs(corpusTokenIds, vocabSize);

    // Step 2: Build IDF array
    const idfScorer = getIdfScorer(this.idfMethod);
    const idfArray = buildIdfArray(docFreqs, numDocs, idfScorer);

    // Step 3: Build non-occurrence array for BM25L/BM25+
    let nonOccArray: Float64Array | null = null;
    if (BM25.NON_OCC_METHODS.includes(this.method)) {
      const tfcScorer = getTfcScorer(this.method);
      nonOccArray = buildNonOccurrenceArray(
        docFreqs,
        numDocs,
        avgDocLen,
        idfScorer,
        tfcScorer,
        this.k1,
        this.b,
        this.delta
      );
    }

    // Step 4: Build BM25 scores for all (doc, token) pairs
    const { scores, docIndices, vocabIndices } = buildScoresAndIndices(
      corpusTokenIds,
      idfArray,
      avgDocLen,
      {
        k1: this.k1,
        b: this.b,
        delta: this.delta,
        method: this.method,
        idfMethod: this.idfMethod,
      },
      nonOccArray
    );

    // Step 5: Build CSC sparse matrix
    const matrix = buildCSCMatrix(
      scores,
      docIndices,
      vocabIndices,
      numDocs,
      vocabSize
    );

    // Store index
    this._index = {
      matrix,
      numDocs,
      vocabSize,
      nonOccArray,
    };
  }

  /**
   * Convert query tokens to token IDs
   */
  private getTokenIds(queryTokens: string[]): number[] {
    const ids: number[] = [];
    for (const token of queryTokens) {
      const id = this.vocabDict.get(token);
      if (id !== undefined) {
        ids.push(id);
      }
    }
    return ids;
  }

  /**
   * Compute relevance scores for a single query
   */
  private getScores(queryTokenIds: number[]): Float64Array {
    if (!this._index) {
      throw new Error("Index not built. Call index() first.");
    }

    return computeRelevanceScores(
      this._index.matrix.data,
      this._index.matrix.indptr,
      this._index.matrix.indices,
      this._index.numDocs,
      queryTokenIds,
      this._index.nonOccArray
    );
  }

  /**
   * Retrieve top-k documents for given queries
   * 
   * @param queryTokens - Tokenized queries (from tokenize()) or array of token ID arrays
   * @param options - Retrieval options
   */
  retrieve(
    queryTokens: Tokenized | number[][] | string[][],
    options: {
      /** Number of documents to retrieve per query - default: 10 */
      k?: number;
      /** Sort results by score (descending) - default: true */
      sorted?: boolean;
      /** Corpus to use for returning documents instead of indices */
      corpus?: any[];
      /** Return format - default: "tuple" */
      returnAs?: "tuple" | "documents";
    } = {}
  ): RetrievalResults | any[][] {
    if (!this._index) {
      throw new Error("Index not built. Call index() first.");
    }

    const k = Math.min(options.k ?? 10, this._index.numDocs);
    const sorted = options.sorted ?? true;
    const corpus = options.corpus ?? this.corpus;
    const returnAs = options.returnAs ?? "tuple";

    // Convert to token ID arrays
    let queryTokenIdArrays: number[][];

    if (Array.isArray(queryTokens) && queryTokens.length > 0) {
      const firstQuery = queryTokens[0];
      if (Array.isArray(firstQuery)) {
        if (typeof firstQuery[0] === "string") {
          // String tokens - convert to IDs
          queryTokenIdArrays = (queryTokens as string[][]).map((q) =>
            this.getTokenIds(q)
          );
        } else {
          // Already token IDs
          queryTokenIdArrays = queryTokens as number[][];
        }
      } else {
        throw new Error("Invalid query format");
      }
    } else if ("ids" in queryTokens && "vocab" in queryTokens) {
      // Tokenized object - need to match vocabulary
      const tokenized = queryTokens as Tokenized;
      // Convert using the stored vocabulary
      const reverseVocab = new Map<number, string>();
      for (const [token, id] of tokenized.vocab) {
        reverseVocab.set(id, token);
      }
      queryTokenIdArrays = tokenized.ids.map((ids) => {
        const tokens = ids.map((id) => reverseVocab.get(id) ?? "");
        return this.getTokenIds(tokens);
      });
    } else {
      throw new Error("Invalid query format");
    }

    // Retrieve for each query
    const allDocuments: (number[] | any[])[] = [];
    const allScores: Float64Array[] = [];

    for (const queryIds of queryTokenIdArrays) {
      // Get scores for this query
      const scores = this.getScores(queryIds);

      // Get top-k results
      const topKResult = topK(scores, k, sorted);

      // Store results
      if (corpus) {
        const docs = Array.from(topKResult.indices).map((idx) => corpus[idx]);
        allDocuments.push(docs);
      } else {
        allDocuments.push(Array.from(topKResult.indices));
      }
      allScores.push(topKResult.scores);
    }

    if (returnAs === "documents") {
      return allDocuments;
    }

    return {
      documents: allDocuments as number[][],
      scores: allScores,
    };
  }

  /**
   * Save the BM25 index to a directory
   */
  async save(saveDir: string, options: { corpus?: any[] } = {}): Promise<void> {
    if (!this._index) {
      throw new Error("Index not built. Call index() first.");
    }

    const fs = await import("fs/promises");
    const path = await import("path");

    // Create directory
    await fs.mkdir(saveDir, { recursive: true });

    // Save matrix data
    const matrixBuffer = serializeCSC(this._index.matrix);
    await fs.writeFile(
      path.join(saveDir, "matrix.bin"),
      new Uint8Array(matrixBuffer)
    );

    // Save non-occurrence array if present
    if (this._index.nonOccArray) {
      await fs.writeFile(
        path.join(saveDir, "nonoccurrence.bin"),
        new Uint8Array(this._index.nonOccArray.buffer)
      );
    }

    // Save vocabulary
    const vocabObj: Record<string, number> = {};
    for (const [key, value] of this.vocabDict) {
      vocabObj[key] = value;
    }
    await fs.writeFile(
      path.join(saveDir, "vocab.json"),
      JSON.stringify(vocabObj)
    );

    // Save parameters
    const params = {
      k1: this.k1,
      b: this.b,
      delta: this.delta,
      method: this.method,
      idfMethod: this.idfMethod,
      numDocs: this._index.numDocs,
      vocabSize: this._index.vocabSize,
    };
    await fs.writeFile(
      path.join(saveDir, "params.json"),
      JSON.stringify(params, null, 2)
    );

    // Save corpus if provided
    const corpusToSave = options.corpus ?? this.corpus;
    if (corpusToSave) {
      const corpusLines = corpusToSave.map((doc) => JSON.stringify(doc)).join("\n");
      await fs.writeFile(path.join(saveDir, "corpus.jsonl"), corpusLines);
    }
  }

  /**
   * Load a BM25 index from a directory
   */
  static async load(
    saveDir: string,
    options: { loadCorpus?: boolean } = {}
  ): Promise<BM25> {
    const fs = await import("fs/promises");
    const path = await import("path");

    // Load parameters
    const paramsJson = await fs.readFile(
      path.join(saveDir, "params.json"),
      "utf-8"
    );
    const params = JSON.parse(paramsJson);

    // Create BM25 instance with saved parameters
    const bm25 = new BM25({
      k1: params.k1,
      b: params.b,
      delta: params.delta,
      method: params.method,
      idfMethod: params.idfMethod,
    });

    // Load matrix
    const matrixBuffer = await fs.readFile(path.join(saveDir, "matrix.bin"));
    const matrix = deserializeCSC(matrixBuffer.buffer as ArrayBuffer);

    // Load non-occurrence array if present
    let nonOccArray: Float64Array | null = null;
    try {
      const nonOccBuffer = await fs.readFile(
        path.join(saveDir, "nonoccurrence.bin")
      );
      nonOccArray = new Float64Array(nonOccBuffer.buffer);
    } catch {
      // File doesn't exist, which is fine for non-BM25L/BM25+ methods
    }

    // Load vocabulary
    const vocabJson = await fs.readFile(
      path.join(saveDir, "vocab.json"),
      "utf-8"
    );
    const vocabObj = JSON.parse(vocabJson);
    bm25.vocabDict = new Map(Object.entries(vocabObj).map(([k, v]) => [k, v as number]));

    // Set index
    bm25._index = {
      matrix,
      numDocs: params.numDocs,
      vocabSize: params.vocabSize,
      nonOccArray,
    };

    // Load corpus if requested
    if (options.loadCorpus) {
      try {
        const corpusText = await fs.readFile(
          path.join(saveDir, "corpus.jsonl"),
          "utf-8"
        );
        bm25.corpus = corpusText
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line));
      } catch {
        // Corpus file doesn't exist
      }
    }

    return bm25;
  }
}
