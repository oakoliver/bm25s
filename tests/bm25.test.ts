import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { BM25, tokenize, Tokenizer, type Tokenized } from "../src";
import { rmSync, existsSync } from "fs";

describe("Tokenizer", () => {
  describe("tokenize function", () => {
    it("should tokenize a simple string", () => {
      const result = tokenize(["hello world"]) as Tokenized;
      expect(result.ids.length).toBe(1);
      expect(result.ids[0].length).toBe(2);
      expect(result.vocab.size).toBe(2);
    });

    it("should handle multiple documents", () => {
      const result = tokenize([
        "hello world",
        "foo bar baz",
        "hello foo",
      ]) as Tokenized;
      expect(result.ids.length).toBe(3);
      expect(result.vocab.size).toBe(5); // hello, world, foo, bar, baz
    });

    it("should remove stopwords by default", () => {
      const result = tokenize(["the quick brown fox"]) as Tokenized;
      // "the" is a stopword
      expect(result.ids[0].length).toBe(3); // quick, brown, fox
    });

    it("should disable stopwords when specified", () => {
      const result = tokenize(["the quick brown fox"], {
        stopwords: false,
      }) as Tokenized;
      expect(result.ids[0].length).toBe(4); // the, quick, brown, fox
    });

    it("should lowercase by default", () => {
      const result = tokenize(["Hello World UPPER"]) as Tokenized;
      expect(result.vocab.has("hello")).toBe(true);
      expect(result.vocab.has("world")).toBe(true);
      expect(result.vocab.has("upper")).toBe(true);
      expect(result.vocab.has("Hello")).toBe(false);
    });

    it("should handle empty strings", () => {
      const result = tokenize([""]) as Tokenized;
      expect(result.ids.length).toBe(1);
      // Should have empty token
      expect(result.ids[0].length).toBe(1);
    });

    it("should filter short tokens", () => {
      const result = tokenize(["a b cd ef"]) as Tokenized;
      // Default pattern requires 2+ chars, but 'a' and 'b' are removed
      expect(result.ids[0].length).toBe(2); // cd, ef
    });
  });

  describe("Tokenizer class", () => {
    it("should allow custom stopwords", () => {
      const tokenizer = new Tokenizer({ stopwords: ["custom", "stop"] });
      const result = tokenizer.tokenize(
        ["custom words here stop"],
        { returnAs: "tuple" }
      ) as Tokenized;
      expect(result.vocab.has("custom")).toBe(false);
      expect(result.vocab.has("stop")).toBe(false);
      expect(result.vocab.has("words")).toBe(true);
      expect(result.vocab.has("here")).toBe(true);
    });

    it("should support streaming tokenization", () => {
      const tokenizer = new Tokenizer({ stopwords: false });
      const texts = ["doc one", "doc two", "doc three"];
      const results: number[][] = [];
      
      for (const ids of tokenizer.streamingTokenize(texts)) {
        results.push(ids);
      }
      
      expect(results.length).toBe(3);
    });

    it("should decode token IDs back to strings", () => {
      const tokenizer = new Tokenizer({ stopwords: false });
      const result = tokenizer.tokenize(
        ["hello world"],
        { returnAs: "tuple" }
      ) as Tokenized;
      
      const decoded = tokenizer.decode(result.ids);
      expect(decoded[0]).toContain("hello");
      expect(decoded[0]).toContain("world");
    });

    it("should support custom stemmer", () => {
      // Simple stemmer that just returns first 4 chars
      const simpleStemmer = (word: string) => word.slice(0, 4);
      
      const tokenizer = new Tokenizer({
        stemmer: simpleStemmer,
        stopwords: false,
      });
      
      const result = tokenizer.tokenize(
        ["running runner runs"],
        { returnAs: "tuple" }
      ) as Tokenized;
      
      // "running" -> "runn", "runner" -> "runn", "runs" -> "runs" (4 chars)
      expect(result.vocab.size).toBe(2);
      expect(result.vocab.has("runn")).toBe(true);
      expect(result.vocab.has("runs")).toBe(true);
    });
  });
});

describe("BM25", () => {
  const corpus = [
    "a cat is a feline and likes to purr",
    "a dog is the human's best friend and loves to play",
    "a bird is a beautiful animal that can fly",
    "a fish is a creature that lives in water and swims",
  ];

  let corpusTokens: Tokenized;

  beforeAll(() => {
    corpusTokens = tokenize(corpus) as Tokenized;
  });

  describe("indexing", () => {
    it("should create an index from tokenized corpus", () => {
      const retriever = new BM25();
      retriever.index(corpusTokens);
      
      expect(retriever.isIndexed()).toBe(true);
      expect(retriever.getNumDocs()).toBe(4);
      expect(retriever.getVocabSize()).toBeGreaterThan(0);
    });

    it("should support different BM25 methods", () => {
      const methods = ["robertson", "lucene", "atire", "bm25l", "bm25+"] as const;
      
      for (const method of methods) {
        const retriever = new BM25({ method });
        retriever.index(corpusTokens);
        expect(retriever.getMethod()).toBe(method);
        expect(retriever.isIndexed()).toBe(true);
      }
    });
  });

  describe("retrieval", () => {
    it("should retrieve relevant documents", () => {
      const retriever = new BM25();
      retriever.index(corpusTokens);
      
      const query = "does the fish purr like a cat?";
      const queryTokens = tokenize([query]) as Tokenized;
      
      const results = retriever.retrieve(queryTokens, { k: 2 });
      
      expect(results.documents.length).toBe(1); // 1 query
      expect(results.documents[0].length).toBe(2); // top 2 results
      expect(results.scores.length).toBe(1);
      expect(results.scores[0].length).toBe(2);
    });

    it("should rank documents by relevance", () => {
      const retriever = new BM25();
      retriever.index(corpusTokens);
      
      // Query about cats should rank cat document first
      const catQuery = tokenize(["cat feline purr"]) as Tokenized;
      const catResults = retriever.retrieve(catQuery, { k: 4 });
      
      // First result should be about cat (index 0)
      expect(catResults.documents[0][0]).toBe(0);
      
      // Query about fish should rank fish document first
      const fishQuery = tokenize(["fish water swims"]) as Tokenized;
      const fishResults = retriever.retrieve(fishQuery, { k: 4 });
      
      // First result should be about fish (index 3)
      expect(fishResults.documents[0][0]).toBe(3);
    });

    it("should handle multiple queries", () => {
      const retriever = new BM25();
      retriever.index(corpusTokens);
      
      const queries = ["cat purr", "dog play", "bird fly"];
      const queryTokens = tokenize(queries) as Tokenized;
      
      const results = retriever.retrieve(queryTokens, { k: 2 });
      
      expect(results.documents.length).toBe(3);
      expect(results.scores.length).toBe(3);
    });

    it("should return documents when corpus is provided", () => {
      const retriever = new BM25();
      retriever.index(corpusTokens, { corpus });
      
      const queryTokens = tokenize(["cat"]) as Tokenized;
      const results = retriever.retrieve(queryTokens, { k: 1 });
      
      // Should return actual document string
      expect(typeof results.documents[0][0]).toBe("string");
      expect(results.documents[0][0]).toContain("cat");
    });

    it("should handle unsorted results", () => {
      const retriever = new BM25();
      retriever.index(corpusTokens);
      
      const queryTokens = tokenize(["cat"]) as Tokenized;
      const results = retriever.retrieve(queryTokens, { k: 4, sorted: false });
      
      expect(results.documents[0].length).toBe(4);
    });
  });

  describe("save and load", () => {
    const testDir = "./test-bm25-index";

    afterAll(() => {
      // Cleanup
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true });
      }
    });

    it("should save and load index", async () => {
      const retriever = new BM25();
      retriever.index(corpusTokens);
      
      await retriever.save(testDir);
      
      const loaded = await BM25.load(testDir);
      
      expect(loaded.isIndexed()).toBe(true);
      expect(loaded.getNumDocs()).toBe(retriever.getNumDocs());
      expect(loaded.getVocabSize()).toBe(retriever.getVocabSize());
      
      // Should get same results
      const queryTokens = tokenize(["cat purr"]) as Tokenized;
      
      const originalResults = retriever.retrieve(queryTokens, { k: 2 });
      const loadedResults = loaded.retrieve(queryTokens, { k: 2 });
      
      expect(loadedResults.documents[0]).toEqual(originalResults.documents[0]);
    });

    it("should save and load with corpus", async () => {
      const retriever = new BM25();
      retriever.index(corpusTokens, { corpus });
      
      await retriever.save(testDir, { corpus });
      
      const loaded = await BM25.load(testDir, { loadCorpus: true });
      
      const queryTokens = tokenize(["cat"]) as Tokenized;
      const results = loaded.retrieve(queryTokens, { k: 1 });
      
      expect(typeof results.documents[0][0]).toBe("string");
    });
  });
});

describe("BM25 Scoring", () => {
  it("should compute correct IDF values", () => {
    // Simple corpus where we can verify IDF
    const simpleDocs = [
      "word word word", // word appears in doc 0
      "word other",     // word appears in doc 1  
      "other thing",    // word does NOT appear in doc 2
    ];
    
    const tokens = tokenize(simpleDocs) as Tokenized;
    const retriever = new BM25({ method: "lucene" });
    retriever.index(tokens);
    
    // Query for "word" should rank docs 0 and 1 higher than doc 2
    const queryTokens = tokenize(["word"]) as Tokenized;
    const results = retriever.retrieve(queryTokens, { k: 3 });
    
    // Doc 0 should have highest score (word appears 3 times)
    expect(results.documents[0][0]).toBe(0);
    // Doc 2 should have score 0 (doesn't contain word)
    expect(results.scores[0][2]).toBe(0);
  });

  it("should prefer documents with higher term frequency", () => {
    const docs = [
      "cat",
      "cat cat",
      "cat cat cat",
    ];
    
    const tokens = tokenize(docs, { stopwords: false }) as Tokenized;
    const retriever = new BM25();
    retriever.index(tokens);
    
    const queryTokens = tokenize(["cat"], { stopwords: false }) as Tokenized;
    const results = retriever.retrieve(queryTokens, { k: 3 });
    
    // Doc with most "cat" mentions should rank highest
    expect(results.documents[0][0]).toBe(2);
    // Scores should be in descending order
    expect(results.scores[0][0]).toBeGreaterThan(results.scores[0][1]);
    expect(results.scores[0][1]).toBeGreaterThan(results.scores[0][2]);
  });
});

describe("BM25 Parameters", () => {
  const corpus = [
    "cat cat cat cat cat",
    "cat dog",
    "bird fish",
  ];

  it("should use custom k1 parameter", () => {
    const tokens = tokenize(corpus, { stopwords: false }) as Tokenized;
    
    // Higher k1 means term frequency has more impact
    const retrieverLowK1 = new BM25({ k1: 0.5 });
    const retrieverHighK1 = new BM25({ k1: 3.0 });
    
    retrieverLowK1.index(tokens);
    retrieverHighK1.index(tokens);
    
    const queryTokens = tokenize(["cat"], { stopwords: false }) as Tokenized;
    
    const resultsLowK1 = retrieverLowK1.retrieve(queryTokens, { k: 3 });
    const resultsHighK1 = retrieverHighK1.retrieve(queryTokens, { k: 3 });
    
    // Both should rank doc 0 first (most cats)
    expect(resultsLowK1.documents[0][0]).toBe(0);
    expect(resultsHighK1.documents[0][0]).toBe(0);
    
    // With higher k1, the score difference between doc 0 and doc 1 should be larger
    const diffLowK1 = resultsLowK1.scores[0][0] - resultsLowK1.scores[0][1];
    const diffHighK1 = resultsHighK1.scores[0][0] - resultsHighK1.scores[0][1];
    expect(diffHighK1).toBeGreaterThan(diffLowK1);
  });

  it("should use custom b parameter for length normalization", () => {
    const tokens = tokenize(corpus, { stopwords: false }) as Tokenized;
    
    // b=0 means no length normalization
    // b=1 means full length normalization
    const retrieverNoNorm = new BM25({ b: 0 });
    const retrieverFullNorm = new BM25({ b: 1 });
    
    retrieverNoNorm.index(tokens);
    retrieverFullNorm.index(tokens);
    
    expect(retrieverNoNorm.isIndexed()).toBe(true);
    expect(retrieverFullNorm.isIndexed()).toBe(true);
  });

  it("should use delta parameter for BM25L and BM25+", () => {
    const tokens = tokenize(corpus, { stopwords: false }) as Tokenized;
    
    const retrieverBM25L = new BM25({ method: "bm25l", delta: 0.5 });
    const retrieverBM25Plus = new BM25({ method: "bm25+", delta: 1.0 });
    
    retrieverBM25L.index(tokens);
    retrieverBM25Plus.index(tokens);
    
    const queryTokens = tokenize(["cat"], { stopwords: false }) as Tokenized;
    
    const resultsL = retrieverBM25L.retrieve(queryTokens, { k: 3 });
    const resultsPlus = retrieverBM25Plus.retrieve(queryTokens, { k: 3 });
    
    // Both should work and return results
    expect(resultsL.documents[0].length).toBe(3);
    expect(resultsPlus.documents[0].length).toBe(3);
  });

  it("should support separate idfMethod", () => {
    const tokens = tokenize(corpus, { stopwords: false }) as Tokenized;
    
    // Use ATIRE method with Robertson IDF
    const retriever = new BM25({ method: "atire", idfMethod: "robertson" });
    retriever.index(tokens);
    
    expect(retriever.getMethod()).toBe("atire");
    expect(retriever.isIndexed()).toBe(true);
  });
});

describe("BM25 Return Formats", () => {
  const corpus = [
    "a cat is a feline and likes to purr",
    "a dog is the human's best friend",
    "a bird is a beautiful animal that can fly",
  ];

  it("should return documents only with returnAs='documents'", () => {
    const tokens = tokenize(corpus) as Tokenized;
    const retriever = new BM25();
    retriever.index(tokens, { corpus });
    
    const queryTokens = tokenize(["cat"]) as Tokenized;
    const results = retriever.retrieve(queryTokens, { 
      k: 2, 
      returnAs: "documents" 
    }) as string[][];
    
    // Should return array of arrays (not object with documents/scores)
    expect(Array.isArray(results)).toBe(true);
    expect(Array.isArray(results[0])).toBe(true);
    expect(typeof results[0][0]).toBe("string");
  });

  it("should return tuple format by default", () => {
    const tokens = tokenize(corpus) as Tokenized;
    const retriever = new BM25();
    retriever.index(tokens);
    
    const queryTokens = tokenize(["cat"]) as Tokenized;
    const results = retriever.retrieve(queryTokens, { k: 2 });
    
    // Should have documents and scores properties
    expect(results).toHaveProperty("documents");
    expect(results).toHaveProperty("scores");
  });

  it("should use corpus from retrieve options over stored corpus", () => {
    const tokens = tokenize(corpus) as Tokenized;
    const retriever = new BM25();
    retriever.index(tokens, { corpus });
    
    const titles = ["Cat Doc", "Dog Doc", "Bird Doc"];
    
    const queryTokens = tokenize(["cat"]) as Tokenized;
    const results = retriever.retrieve(queryTokens, { 
      k: 1, 
      corpus: titles 
    });
    
    // Should return title, not full document
    expect(results.documents[0][0]).toBe("Cat Doc");
  });
});

describe("Tokenizer Advanced", () => {
  it("should save and load vocabulary", () => {
    const tokenizer = new Tokenizer({ stopwords: false });
    tokenizer.tokenize(["hello world foo bar"]);
    
    const savedVocab = tokenizer.saveVocab();
    
    // Create new tokenizer and load vocab
    const newTokenizer = new Tokenizer({ stopwords: false });
    newTokenizer.loadVocab(savedVocab);
    
    // Vocab should match
    expect(newTokenizer.vocabSize).toBe(tokenizer.vocabSize);
  });

  it("should save and load vocabulary with stemmer", () => {
    const stemmer = (word: string) => word.slice(0, 4);
    const tokenizer = new Tokenizer({ stopwords: false, stemmer });
    tokenizer.tokenize(["running runner jumped"]);
    
    const savedVocab = tokenizer.saveVocab();
    
    // Verify stem mappings are saved
    expect(savedVocab.wordToStem.length).toBeGreaterThan(0);
    expect(savedVocab.stemToId.length).toBeGreaterThan(0);
    
    // Create new tokenizer and load vocab
    const newTokenizer = new Tokenizer({ stopwords: false, stemmer });
    newTokenizer.loadVocab(savedVocab);
    
    expect(newTokenizer.vocabSize).toBe(tokenizer.vocabSize);
  });

  it("should reset vocabulary", () => {
    const tokenizer = new Tokenizer({ stopwords: false });
    tokenizer.tokenize(["hello world"]);
    
    expect(tokenizer.vocabSize).toBe(2);
    
    tokenizer.resetVocab();
    
    expect(tokenizer.vocabSize).toBe(0);
  });

  it("should support custom splitter function", () => {
    // Split on commas instead of whitespace
    const splitter = (text: string) => text.split(",").map(s => s.trim()).filter(s => s.length >= 2);
    
    const tokenizer = new Tokenizer({ 
      stopwords: false, 
      splitter,
      lower: true 
    });
    
    const result = tokenizer.tokenize(
      ["apple, banana, cherry"],
      { returnAs: "tuple" }
    ) as Tokenized;
    
    expect(result.vocab.has("apple")).toBe(true);
    expect(result.vocab.has("banana")).toBe(true);
    expect(result.vocab.has("cherry")).toBe(true);
    expect(result.vocab.size).toBe(3);
  });

  it("should support regex pattern splitter", () => {
    const tokenizer = new Tokenizer({ 
      stopwords: false, 
      splitter: /[a-z]+/gi  // Match only letters
    });
    
    const result = tokenizer.tokenize(
      ["hello-world_test"],
      { returnAs: "tuple" }
    ) as Tokenized;
    
    expect(result.vocab.has("hello")).toBe(true);
    expect(result.vocab.has("world")).toBe(true);
    expect(result.vocab.has("test")).toBe(true);
  });

  it("should handle updateVocab='if_empty' option", () => {
    const tokenizer = new Tokenizer({ stopwords: false });
    
    // First call should update vocab
    tokenizer.tokenize(["hello world"], { updateVocab: "if_empty" });
    expect(tokenizer.vocabSize).toBe(2);
    
    // Second call should NOT update vocab (it's not empty)
    tokenizer.tokenize(["foo bar baz"], { updateVocab: "if_empty" });
    expect(tokenizer.vocabSize).toBe(2); // Still 2, not 5
  });

  it("should handle stopwords for different languages", () => {
    // German stopwords
    const tokenizerDE = new Tokenizer({ stopwords: "de" });
    const resultDE = tokenizerDE.tokenize(
      ["der die das"],
      { returnAs: "tuple" }
    ) as Tokenized;
    
    // Common German articles should be removed
    expect(resultDE.ids[0].length).toBeLessThanOrEqual(1); // Empty or placeholder
    
    // French stopwords
    const tokenizerFR = new Tokenizer({ stopwords: "fr" });
    const resultFR = tokenizerFR.tokenize(
      ["le la les"],
      { returnAs: "tuple" }
    ) as Tokenized;
    
    expect(resultFR.ids[0].length).toBeLessThanOrEqual(1);
  });
});

describe("Edge Cases", () => {
  it("should handle empty corpus", () => {
    const tokens = tokenize([]) as Tokenized;
    const retriever = new BM25();
    
    // Should not throw
    retriever.index(tokens);
    expect(retriever.getNumDocs()).toBe(0);
  });

  it("should handle query with no matching tokens", () => {
    const corpus = ["cat dog bird"];
    const tokens = tokenize(corpus, { stopwords: false }) as Tokenized;
    
    const retriever = new BM25();
    retriever.index(tokens);
    
    // Query with completely different terms
    const queryTokens = tokenize(["xyz123 unknown"], { stopwords: false }) as Tokenized;
    const results = retriever.retrieve(queryTokens, { k: 1 });
    
    // Should return result with 0 score
    expect(results.documents[0].length).toBe(1);
    expect(results.scores[0][0]).toBe(0);
  });

  it("should handle single document corpus", () => {
    const tokens = tokenize(["only one document here"], { stopwords: false }) as Tokenized;
    
    const retriever = new BM25();
    retriever.index(tokens);
    
    expect(retriever.getNumDocs()).toBe(1);
    
    const queryTokens = tokenize(["document"], { stopwords: false }) as Tokenized;
    const results = retriever.retrieve(queryTokens, { k: 5 });
    
    // Should return only 1 result even though k=5
    expect(results.documents[0].length).toBe(1);
  });

  it("should handle k larger than corpus size", () => {
    const corpus = ["doc one", "doc two"];
    const tokens = tokenize(corpus, { stopwords: false }) as Tokenized;
    
    const retriever = new BM25();
    retriever.index(tokens);
    
    const queryTokens = tokenize(["doc"], { stopwords: false }) as Tokenized;
    const results = retriever.retrieve(queryTokens, { k: 100 });
    
    // Should cap at corpus size
    expect(results.documents[0].length).toBe(2);
  });

  it("should throw error when retrieving without index", () => {
    const retriever = new BM25();
    const queryTokens = tokenize(["test"]) as Tokenized;
    
    expect(() => retriever.retrieve(queryTokens)).toThrow("Index not built");
  });

  it("should handle documents with only stopwords", () => {
    const tokens = tokenize(["the a an is are"]) as Tokenized;
    
    const retriever = new BM25();
    retriever.index(tokens);
    
    // Should have indexed (with empty token placeholder)
    expect(retriever.getNumDocs()).toBe(1);
  });
});

describe("Performance", () => {
  it("should handle large corpus efficiently", () => {
    // Generate a larger corpus
    const numDocs = 1000;
    const words = ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape"];
    const largeDocs: string[] = [];
    
    for (let i = 0; i < numDocs; i++) {
      const numWords = 10 + Math.floor(Math.random() * 40);
      const docWords: string[] = [];
      for (let j = 0; j < numWords; j++) {
        docWords.push(words[Math.floor(Math.random() * words.length)]);
      }
      largeDocs.push(docWords.join(" "));
    }
    
    const startTime = performance.now();
    
    const tokens = tokenize(largeDocs, { stopwords: false }) as Tokenized;
    const retriever = new BM25();
    retriever.index(tokens);
    
    const indexTime = performance.now() - startTime;
    
    // Index should be fast (< 1 second for 1000 docs)
    expect(indexTime).toBeLessThan(1000);
    
    // Query should be very fast
    const queryStart = performance.now();
    const queryTokens = tokenize(["apple banana"], { stopwords: false }) as Tokenized;
    retriever.retrieve(queryTokens, { k: 10 });
    const queryTime = performance.now() - queryStart;
    
    // Single query should be < 10ms
    expect(queryTime).toBeLessThan(10);
  });

  it("should handle batch queries efficiently", () => {
    const numDocs = 500;
    const words = ["alpha", "beta", "gamma", "delta", "epsilon"];
    const docs: string[] = [];
    
    for (let i = 0; i < numDocs; i++) {
      const numWords = 5 + Math.floor(Math.random() * 20);
      const docWords: string[] = [];
      for (let j = 0; j < numWords; j++) {
        docWords.push(words[Math.floor(Math.random() * words.length)]);
      }
      docs.push(docWords.join(" "));
    }
    
    const tokens = tokenize(docs, { stopwords: false }) as Tokenized;
    const retriever = new BM25();
    retriever.index(tokens);
    
    // Generate 100 queries
    const queries: string[] = [];
    for (let i = 0; i < 100; i++) {
      queries.push(`${words[i % words.length]} ${words[(i + 1) % words.length]}`);
    }
    
    const queryStart = performance.now();
    const queryTokens = tokenize(queries, { stopwords: false }) as Tokenized;
    retriever.retrieve(queryTokens, { k: 10 });
    const queryTime = performance.now() - queryStart;
    
    // 100 queries should complete in < 100ms
    expect(queryTime).toBeLessThan(100);
  });
});
