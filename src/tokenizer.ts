/**
 * High-performance tokenization module for BM25
 */

import { getStopwords, type StopwordsLanguage } from "./stopwords.js";

/**
 * Result of tokenization containing token IDs and vocabulary
 */
export interface Tokenized {
  /** List of token IDs for each document */
  ids: number[][];
  /** Mapping from tokens to their IDs */
  vocab: Map<string, number>;
}

/**
 * Stemmer function type - takes a word and returns its stem
 */
export type StemmerFn = (word: string) => string;

/**
 * Splitter function type - takes text and returns tokens
 */
export type SplitterFn = (text: string) => string[];

/**
 * Default token pattern matching runs of 2+ word characters.
 *
 * Equivalent to Python's r"(?u)\b\w\w+\b" (the bm25s default). In Python,
 * `\w` and `\b` are Unicode-aware, whereas in JavaScript they are ASCII-only
 * even with the `u` flag (so "café" would become "caf" and Hangul would be
 * dropped entirely). A maximal run of Unicode letters/numbers/underscore of
 * length >= 2 is exactly what the Python pattern matches.
 */
const DEFAULT_TOKEN_PATTERN = /[\p{L}\p{N}_]{2,}/gu;

/**
 * Create a splitter function from a regex pattern
 */
export function createSplitter(pattern: RegExp | string): SplitterFn {
  const regex = typeof pattern === "string" ? new RegExp(pattern, "gu") : pattern;
  return (text: string) => {
    // Reset regex state for global patterns
    regex.lastIndex = 0;
    return text.match(regex) || [];
  };
}

/**
 * Default splitter using the standard token pattern
 */
export const defaultSplitter: SplitterFn = createSplitter(DEFAULT_TOKEN_PATTERN);

export interface TokenizerOptions {
  /** Convert text to lowercase (default: true) */
  lower?: boolean;
  /** Regex pattern or splitter function for tokenization */
  splitter?: RegExp | string | SplitterFn;
  /** Stopwords language or custom list */
  stopwords?: StopwordsLanguage | string | string[] | null | false;
  /** Optional stemmer function */
  stemmer?: StemmerFn | null;
  /** Whether to allow empty documents (adds empty string token) */
  allowEmpty?: boolean;
}

/**
 * High-performance tokenizer class
 * 
 * Supports:
 * - Lowercase conversion
 * - Custom splitter patterns
 * - Stopword removal
 * - Optional stemming
 * - Vocabulary management
 */
/** Options for {@link Tokenizer.tokenize}. */
export interface TokenizeCallOptions {
  /** Update vocabulary (default: true for first call, false otherwise) */
  updateVocab?: boolean | "if_empty";
  /** Return format: token ids per text (default) or a {@link Tokenized} tuple */
  returnAs?: "ids" | "tuple";
}

/** Options for {@link tokenize}. */
export interface TokenizeOptions extends TokenizerOptions {
  /** Return token ids per text (true) or a {@link Tokenized} tuple (false, default) */
  returnIds?: boolean;
}

export class Tokenizer {
  private lower: boolean;
  private splitter: SplitterFn;
  private stopwordsSet: Set<string>;
  private stemmer: StemmerFn | null;
  private allowEmpty: boolean;

  // Vocabulary mappings
  private wordToId: Map<string, number> = new Map();
  private wordToStem: Map<string, string> = new Map();
  private stemToId: Map<string, number> = new Map();

  constructor(options: TokenizerOptions = {}) {
    this.lower = options.lower ?? true;
    this.allowEmpty = options.allowEmpty ?? true;

    // Setup splitter
    if (typeof options.splitter === "function") {
      this.splitter = options.splitter;
    } else if (options.splitter) {
      this.splitter = createSplitter(options.splitter);
    } else {
      this.splitter = defaultSplitter;
    }

    // Setup stopwords
    this.stopwordsSet = getStopwords(options.stopwords ?? "en");

    // Setup stemmer
    this.stemmer = options.stemmer ?? null;
  }

  /**
   * Reset vocabulary to empty state
   */
  resetVocab(): void {
    this.wordToId.clear();
    this.wordToStem.clear();
    this.stemToId.clear();
  }

  /**
   * Get the current vocabulary dictionary
   */
  getVocabDict(): Map<string, number> {
    return this.stemmer ? this.stemToId : this.wordToId;
  }

  /**
   * Get vocabulary size
   */
  get vocabSize(): number {
    return this.getVocabDict().size;
  }

  /**
   * Tokenize a single text into token IDs
   * Updates vocabulary as needed
   */
  private tokenizeOne(
    text: string,
    updateVocab: boolean
  ): number[] {
    // Lowercase if needed
    const processedText = this.lower ? text.toLowerCase() : text;

    // Split into words
    const words = this.splitter(processedText);

    // Handle empty documents
    if (words.length === 0) {
      if (this.allowEmpty) {
        if (updateVocab && !this.wordToId.has("")) {
          const idx = this.getVocabDict().size;
          this.wordToId.set("", idx);
          if (this.stemmer) {
            this.wordToStem.set("", "");
            this.stemToId.set("", idx);
          }
        }
        const emptyId = this.wordToId.get("");
        return emptyId !== undefined ? [emptyId] : [];
      }
      return [];
    }

    const docIds: number[] = [];

    for (const word of words) {
      // Check if already in vocabulary
      const existingId = this.wordToId.get(word);
      if (existingId !== undefined) {
        docIds.push(existingId);
        continue;
      }

      // Skip stopwords
      if (this.stopwordsSet.has(word)) {
        continue;
      }

      // Handle stemming
      if (this.stemmer) {
        // Get or compute stem
        let stem = this.wordToStem.get(word);
        if (stem === undefined) {
          stem = this.stemmer(word);
          this.wordToStem.set(word, stem);
        }

        // Check if stem already has an ID
        const stemId = this.stemToId.get(stem);
        if (stemId !== undefined) {
          this.wordToId.set(word, stemId);
          docIds.push(stemId);
        } else if (updateVocab) {
          // Create new ID for this stem
          const newId = this.stemToId.size;
          this.stemToId.set(stem, newId);
          this.wordToId.set(word, newId);
          docIds.push(newId);
        }
      } else {
        // No stemmer - use word directly
        if (updateVocab) {
          const newId = this.wordToId.size;
          this.wordToId.set(word, newId);
          docIds.push(newId);
        }
      }
    }

    // Handle empty result after stopword removal
    if (docIds.length === 0 && this.allowEmpty) {
      const emptyId = this.wordToId.get("");
      if (emptyId !== undefined) {
        return [emptyId];
      } else if (updateVocab) {
        const idx = this.getVocabDict().size;
        this.wordToId.set("", idx);
        if (this.stemmer) {
          this.wordToStem.set("", "");
          this.stemToId.set("", idx);
        }
        return [idx];
      }
    }

    return docIds;
  }

  /**
   * Tokenize multiple texts. Returns token ids per text, or a
   * {@link Tokenized} tuple (ids plus vocabulary) with `returnAs: "tuple"`.
   */
  tokenize(texts: string[], options: TokenizeCallOptions & { returnAs: "tuple" }): Tokenized;
  tokenize(texts: string[], options?: TokenizeCallOptions & { returnAs?: "ids" }): number[][];
  tokenize(texts: string[], options?: TokenizeCallOptions): number[][] | Tokenized;
  tokenize(
    texts: string[],
    options: TokenizeCallOptions = {}
  ): number[][] | Tokenized {
    const updateVocab = options.updateVocab === "if_empty"
      ? this.wordToId.size === 0
      : options.updateVocab ?? true;

    const returnAs = options.returnAs ?? "ids";

    const ids = texts.map((text) => this.tokenizeOne(text, updateVocab));

    if (returnAs === "tuple") {
      return {
        ids,
        vocab: new Map(this.getVocabDict()),
      };
    }

    return ids;
  }

  /**
   * Generator-based tokenization for memory efficiency
   */
  *streamingTokenize(
    texts: Iterable<string>,
    updateVocab: boolean = true
  ): Generator<number[], void, unknown> {
    for (const text of texts) {
      yield this.tokenizeOne(text, updateVocab);
    }
  }

  /**
   * Convert token IDs back to strings
   */
  decode(docs: number[][]): string[][] {
    const vocab = this.getVocabDict();
    const reverseVocab = new Map<number, string>();
    for (const [token, id] of vocab) {
      reverseVocab.set(id, token);
    }

    return docs.map((docIds) =>
      docIds.map((id) => reverseVocab.get(id) ?? "")
    );
  }

  /**
   * Save vocabulary to JSON-serializable format
   */
  saveVocab(): {
    wordToId: [string, number][];
    wordToStem: [string, string][];
    stemToId: [string, number][];
  } {
    return {
      wordToId: Array.from(this.wordToId.entries()),
      wordToStem: Array.from(this.wordToStem.entries()),
      stemToId: Array.from(this.stemToId.entries()),
    };
  }

  /**
   * Load vocabulary from saved format
   */
  loadVocab(data: {
    wordToId: [string, number][];
    wordToStem: [string, string][];
    stemToId: [string, number][];
  }): void {
    this.wordToId = new Map(data.wordToId);
    this.wordToStem = new Map(data.wordToStem);
    this.stemToId = new Map(data.stemToId);
  }
}

/**
 * Simple tokenize function for one-off tokenization
 * 
 * @example
 * ```typescript
 * const result = tokenize(["hello world", "foo bar"]);
 * console.log(result.ids); // [[0, 1], [2, 3]]
 * console.log(result.vocab); // Map { 'hello' => 0, 'world' => 1, 'foo' => 2, 'bar' => 3 }
 * ```
 */
export function tokenize(texts: string | string[], options: TokenizeOptions & { returnIds: true }): number[][];
export function tokenize(texts: string | string[], options?: TokenizeOptions & { returnIds?: false }): Tokenized;
export function tokenize(texts: string | string[], options?: TokenizeOptions): Tokenized | number[][];
export function tokenize(
  texts: string | string[],
  options: TokenizeOptions = {}
): Tokenized | number[][] {
  const inputTexts = typeof texts === "string" ? [texts] : texts;
  const tokenizer = new Tokenizer(options);
  
  if (options.returnIds === true) {
    return tokenizer.tokenize(inputTexts, { returnAs: "ids" });
  }
  
  return tokenizer.tokenize(inputTexts, { returnAs: "tuple" });
}

/**
 * Convert Tokenized result to list of string lists
 */
export function convertTokenizedToStrings(tokenized: Tokenized): string[][] {
  const reverseVocab = new Map<number, string>();
  for (const [token, id] of tokenized.vocab) {
    reverseVocab.set(id, token);
  }

  return tokenized.ids.map((docIds) =>
    docIds.map((id) => reverseVocab.get(id) ?? "")
  );
}
