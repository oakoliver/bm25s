/**
 * BM25 Scoring Functions
 * 
 * Implements multiple BM25 variants:
 * - Robertson (original)
 * - Lucene (accurate)
 * - ATIRE
 * - BM25L
 * - BM25+
 * 
 * Reference: Kamphuis et al. 2020
 * https://cs.uwaterloo.ca/~jimmylin/publications/Kamphuis_etal_ECIR2020_preprint.pdf
 */

export type BM25Method = "robertson" | "lucene" | "atire" | "bm25l" | "bm25+";

/**
 * Term Frequency Component (TFC) Scorers
 */

/**
 * Robertson (original) TFC scorer
 */
export function scoreTfcRobertson(
  tf: number,
  docLen: number,
  avgDocLen: number,
  k1: number,
  b: number,
  _delta?: number
): number {
  return tf / (k1 * ((1 - b) + b * docLen / avgDocLen) + tf);
}

/**
 * Lucene TFC scorer (same as Robertson)
 */
export function scoreTfcLucene(
  tf: number,
  docLen: number,
  avgDocLen: number,
  k1: number,
  b: number,
  _delta?: number
): number {
  return scoreTfcRobertson(tf, docLen, avgDocLen, k1, b);
}

/**
 * ATIRE TFC scorer
 */
export function scoreTfcAtire(
  tf: number,
  docLen: number,
  avgDocLen: number,
  k1: number,
  b: number,
  _delta?: number
): number {
  return (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * docLen / avgDocLen));
}

/**
 * BM25L TFC scorer
 */
export function scoreTfcBm25l(
  tf: number,
  docLen: number,
  avgDocLen: number,
  k1: number,
  b: number,
  delta: number = 0.5
): number {
  const c = tf / (1 - b + b * docLen / avgDocLen);
  return ((k1 + 1) * (c + delta)) / (k1 + c + delta);
}

/**
 * BM25+ TFC scorer
 */
export function scoreTfcBm25plus(
  tf: number,
  docLen: number,
  avgDocLen: number,
  k1: number,
  b: number,
  delta: number = 1.0
): number {
  const num = (k1 + 1) * tf;
  const den = k1 * (1 - b + b * docLen / avgDocLen) + tf;
  return (num / den) + delta;
}

/**
 * Get TFC scorer function by method name
 */
export function getTfcScorer(method: BM25Method): typeof scoreTfcRobertson {
  switch (method) {
    case "robertson":
      return scoreTfcRobertson;
    case "lucene":
      return scoreTfcLucene;
    case "atire":
      return scoreTfcAtire;
    case "bm25l":
      return scoreTfcBm25l;
    case "bm25+":
      return scoreTfcBm25plus;
    default:
      throw new Error(`Unknown TFC method: ${method}`);
  }
}

/**
 * Inverse Document Frequency (IDF) Scorers
 */

/**
 * Robertson (original) IDF scorer
 */
export function scoreIdfRobertson(
  df: number,
  N: number,
  allowNegative: boolean = false
): number {
  let inner = (N - df + 0.5) / (df + 0.5);
  if (!allowNegative && inner < 1) {
    inner = 1;
  }
  return Math.log(inner);
}

/**
 * Lucene IDF scorer
 */
export function scoreIdfLucene(df: number, N: number): number {
  return Math.log(1 + (N - df + 0.5) / (df + 0.5));
}

/**
 * ATIRE IDF scorer
 */
export function scoreIdfAtire(df: number, N: number): number {
  return Math.log(N / df);
}

/**
 * BM25L IDF scorer
 */
export function scoreIdfBm25l(df: number, N: number): number {
  return Math.log((N + 1) / (df + 0.5));
}

/**
 * BM25+ IDF scorer
 */
export function scoreIdfBm25plus(df: number, N: number): number {
  return Math.log((N + 1) / df);
}

/**
 * Get IDF scorer function by method name
 */
export function getIdfScorer(method: BM25Method): typeof scoreIdfRobertson {
  switch (method) {
    case "robertson":
      return scoreIdfRobertson;
    case "lucene":
      return scoreIdfLucene;
    case "atire":
      return scoreIdfAtire;
    case "bm25l":
      return scoreIdfBm25l;
    case "bm25+":
      return scoreIdfBm25plus;
    default:
      throw new Error(`Unknown IDF method: ${method}`);
  }
}

/**
 * Calculate document frequencies for all tokens
 * Returns a Map from token ID to document frequency
 */
export function calculateDocFreqs(
  corpusTokenIds: number[][],
  vocabSize: number
): Float64Array {
  const docFreqs = new Float64Array(vocabSize);

  for (const docTokens of corpusTokenIds) {
    // Use Set to count each token only once per document
    const uniqueTokens = new Set(docTokens);
    for (const tokenId of uniqueTokens) {
      docFreqs[tokenId]++;
    }
  }

  return docFreqs;
}

/**
 * Build IDF array for all tokens
 */
export function buildIdfArray(
  docFreqs: Float64Array,
  numDocs: number,
  idfScorer: typeof scoreIdfRobertson
): Float64Array {
  const idfArray = new Float64Array(docFreqs.length);

  for (let i = 0; i < docFreqs.length; i++) {
    const df = docFreqs[i];
    if (df > 0) {
      idfArray[i] = idfScorer(df, numDocs);
    }
  }

  return idfArray;
}

/**
 * Build non-occurrence array for BM25L and BM25+ variants
 * This stores the score contribution for tokens that don't occur in a document
 */
export function buildNonOccurrenceArray(
  docFreqs: Float64Array,
  numDocs: number,
  avgDocLen: number,
  idfScorer: typeof scoreIdfRobertson,
  tfcScorer: typeof scoreTfcRobertson,
  k1: number,
  b: number,
  delta: number
): Float64Array {
  const nonOccArray = new Float64Array(docFreqs.length);

  for (let i = 0; i < docFreqs.length; i++) {
    const df = docFreqs[i];
    if (df > 0) {
      const idf = idfScorer(df, numDocs);
      const tfc = tfcScorer(0, avgDocLen, avgDocLen, k1, b, delta);
      nonOccArray[i] = idf * tfc;
    }
  }

  return nonOccArray;
}

/**
 * Count term frequencies in a document
 * Returns array of [tokenId, count] pairs
 */
export function countTermFreqs(tokenIds: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const id of tokenIds) {
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

export interface ScoringParams {
  k1: number;
  b: number;
  delta: number;
  method: BM25Method;
  idfMethod?: BM25Method;
}

/**
 * Build BM25 scores for each (doc, token) pair
 * Returns flat arrays for sparse matrix construction
 */
export function buildScoresAndIndices(
  corpusTokenIds: number[][],
  idfArray: Float64Array,
  avgDocLen: number,
  params: ScoringParams,
  nonOccArray?: Float64Array | null
): {
  scores: Float64Array;
  docIndices: Uint32Array;
  vocabIndices: Uint32Array;
} {
  const { k1, b, delta, method } = params;
  const tfcScorer = getTfcScorer(method);

  // Calculate total number of entries
  let totalEntries = 0;
  for (const doc of corpusTokenIds) {
    totalEntries += new Set(doc).size;
  }

  // Pre-allocate arrays
  const scores = new Float64Array(totalEntries);
  const docIndices = new Uint32Array(totalEntries);
  const vocabIndices = new Uint32Array(totalEntries);

  let idx = 0;
  const requiresNonOcc = method === "bm25l" || method === "bm25+";

  for (let docIdx = 0; docIdx < corpusTokenIds.length; docIdx++) {
    const tokenIds = corpusTokenIds[docIdx];
    const docLen = tokenIds.length;

    // Get term frequencies
    const termFreqs = countTermFreqs(tokenIds);

    for (const [tokenId, tf] of termFreqs) {
      // Calculate TFC component
      const tfc = tfcScorer(tf, docLen, avgDocLen, k1, b, delta);
      const idf = idfArray[tokenId];
      let score = idf * tfc;

      // Subtract non-occurrence score for BM25L/BM25+
      if (requiresNonOcc && nonOccArray) {
        score -= nonOccArray[tokenId];
      }

      scores[idx] = score;
      docIndices[idx] = docIdx;
      vocabIndices[idx] = tokenId;
      idx++;
    }
  }

  return { scores, docIndices, vocabIndices };
}

/**
 * Compute relevance scores for a query using precomputed BM25 index
 * This is the core retrieval function that sums scores from the sparse matrix
 * 
 * OPTIMIZED: Uses provided buffer to avoid allocation in hot path
 */
export function computeRelevanceScores(
  data: Float64Array,
  indptr: Uint32Array,
  indices: Uint32Array,
  numDocs: number,
  queryTokenIds: number[],
  nonOccArray?: Float64Array | null,
  scoreBuffer?: Float64Array
): Float64Array {
  // Reuse buffer if provided, otherwise allocate
  const scores = scoreBuffer && scoreBuffer.length >= numDocs 
    ? scoreBuffer 
    : new Float64Array(numDocs);
  
  // Clear scores (necessary when reusing buffer)
  if (scoreBuffer) {
    scores.fill(0, 0, numDocs);
  }

  const numTokens = queryTokenIds.length;
  const indptrLen = indptr.length - 1;

  // For each query token, add its contribution to all matching documents
  for (let t = 0; t < numTokens; t++) {
    const tokenId = queryTokenIds[t];
    if (tokenId >= indptrLen) continue;

    const start = indptr[tokenId];
    const end = indptr[tokenId + 1];

    // Unrolled loop for better performance on small ranges
    let j = start;
    const end4 = start + ((end - start) & ~3); // Round down to multiple of 4
    
    // Process 4 at a time
    for (; j < end4; j += 4) {
      scores[indices[j]] += data[j];
      scores[indices[j + 1]] += data[j + 1];
      scores[indices[j + 2]] += data[j + 2];
      scores[indices[j + 3]] += data[j + 3];
    }
    
    // Handle remaining
    for (; j < end; j++) {
      scores[indices[j]] += data[j];
    }
  }

  // Add non-occurrence scores for BM25L/BM25+
  if (nonOccArray) {
    let nonOccSum = 0;
    for (let t = 0; t < numTokens; t++) {
      const tokenId = queryTokenIds[t];
      if (tokenId < nonOccArray.length) {
        nonOccSum += nonOccArray[tokenId];
      }
    }
    if (nonOccSum !== 0) {
      for (let i = 0; i < numDocs; i++) {
        scores[i] += nonOccSum;
      }
    }
  }

  return scores;
}
