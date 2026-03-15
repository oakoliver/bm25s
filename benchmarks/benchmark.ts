/**
 * Benchmark script for bun-bm25s
 * 
 * Compares indexing and retrieval performance across different corpus sizes
 * and measures queries per second (QPS).
 * 
 * Run with: bun run benchmarks/benchmark.ts
 */

import { BM25, tokenize, type Tokenized } from "../src";
import { execSync } from "child_process";

interface SystemInfo {
  chip?: string;
  cores?: string;
  memory?: string;
  os?: string;
  osVersion?: string;
}

function getSystemInfo(): SystemInfo {
  const info: SystemInfo = {};
  
  try {
    if (process.platform === "darwin") {
      const result = execSync("system_profiler SPHardwareDataType", { encoding: "utf-8" });
      for (const line of result.split("\n")) {
        if (line.includes("Chip:")) {
          info.chip = line.split(":")[1]?.trim();
        } else if (line.includes("Total Number of Cores:")) {
          info.cores = line.split(":")[1]?.trim();
        } else if (line.includes("Memory:")) {
          info.memory = line.split(":")[1]?.trim();
        }
      }
      
      const swVers = execSync("sw_vers", { encoding: "utf-8" });
      for (const line of swVers.split("\n")) {
        if (line.includes("ProductName:")) {
          info.os = line.split(":")[1]?.trim();
        } else if (line.includes("ProductVersion:")) {
          info.osVersion = line.split(":")[1]?.trim();
        }
      }
    } else if (process.platform === "linux") {
      try {
        const cpuInfo = execSync("cat /proc/cpuinfo | grep 'model name' | head -1", { encoding: "utf-8" });
        info.chip = cpuInfo.split(":")[1]?.trim();
        
        const coreCount = execSync("nproc", { encoding: "utf-8" });
        info.cores = coreCount.trim();
        
        const memInfo = execSync("free -h | grep Mem | awk '{print $2}'", { encoding: "utf-8" });
        info.memory = memInfo.trim();
        
        const osRelease = execSync("cat /etc/os-release | grep PRETTY_NAME", { encoding: "utf-8" });
        info.os = osRelease.split("=")[1]?.replace(/"/g, "").trim();
      } catch {
        // Ignore errors on Linux
      }
    }
  } catch {
    // Ignore errors
  }
  
  return info;
}

// Sample vocabulary for generating synthetic documents
const VOCABULARY = [
  "algorithm", "computer", "science", "machine", "learning", "neural", "network",
  "deep", "data", "model", "training", "inference", "optimization", "gradient",
  "descent", "backpropagation", "activation", "function", "layer", "weight",
  "bias", "loss", "accuracy", "precision", "recall", "classification", "regression",
  "clustering", "dimensionality", "reduction", "feature", "extraction", "embedding",
  "vector", "matrix", "tensor", "computation", "parallel", "distributed", "system",
  "memory", "cache", "storage", "index", "search", "retrieval", "ranking", "score",
  "document", "query", "term", "frequency", "inverse", "sparse", "dense", "efficient",
  "performance", "benchmark", "evaluation", "metric", "test", "validation", "cross",
];

/**
 * Generate synthetic corpus with specified number of documents
 */
function generateCorpus(numDocs: number, avgWordsPerDoc: number = 50): string[] {
  const corpus: string[] = [];
  
  for (let i = 0; i < numDocs; i++) {
    const numWords = avgWordsPerDoc + Math.floor(Math.random() * 50) - 25;
    const words: string[] = [];
    
    for (let j = 0; j < numWords; j++) {
      words.push(VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)]);
    }
    
    corpus.push(words.join(" "));
  }
  
  return corpus;
}

/**
 * Generate random queries
 */
function generateQueries(numQueries: number, wordsPerQuery: number = 3): string[] {
  const queries: string[] = [];
  
  for (let i = 0; i < numQueries; i++) {
    const words: string[] = [];
    for (let j = 0; j < wordsPerQuery; j++) {
      words.push(VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)]);
    }
    queries.push(words.join(" "));
  }
  
  return queries;
}

/**
 * Format number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

/**
 * Format time in milliseconds
 */
function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)} µs`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * Run benchmark for a specific corpus size
 */
function runBenchmark(corpusSize: number, numQueries: number = 1000): {
  corpusSize: number;
  indexTimeMs: number;
  avgQueryTimeMs: number;
  queriesPerSecond: number;
  tokensPerSecond: number;
  memoryMB: number;
} {
  // Generate corpus
  const corpus = generateCorpus(corpusSize);
  
  // Count total tokens
  let totalTokens = 0;
  for (const doc of corpus) {
    totalTokens += doc.split(/\s+/).length;
  }
  
  // Measure indexing time
  const indexStart = performance.now();
  const corpusTokens = tokenize(corpus, { stopwords: false }) as Tokenized;
  const retriever = new BM25({ method: "lucene" });
  retriever.index(corpusTokens);
  const indexTime = performance.now() - indexStart;
  
  // Generate queries
  const queries = generateQueries(numQueries);
  const queryTokens = tokenize(queries, { stopwords: false }) as Tokenized;
  
  // Warm-up
  retriever.retrieve(queryTokens, { k: 10 });
  
  // Measure retrieval time (average of 3 runs)
  const runs = 3;
  let totalQueryTime = 0;
  
  for (let run = 0; run < runs; run++) {
    const queryStart = performance.now();
    retriever.retrieve(queryTokens, { k: 10 });
    totalQueryTime += performance.now() - queryStart;
  }
  
  const avgQueryTime = totalQueryTime / runs;
  const avgQueryTimePerQuery = avgQueryTime / numQueries;
  const qps = (numQueries / avgQueryTime) * 1000;
  const tokensPerSec = (totalTokens / indexTime) * 1000;
  
  // Estimate memory (rough approximation based on index size)
  const memoryMB = (retriever.getNumDocs() * retriever.getVocabSize() * 8) / (1024 * 1024) * 0.1;
  
  return {
    corpusSize,
    indexTimeMs: indexTime,
    avgQueryTimeMs: avgQueryTimePerQuery,
    queriesPerSecond: qps,
    tokensPerSecond: tokensPerSec,
    memoryMB,
  };
}

/**
 * Print results table
 */
function printResults(results: ReturnType<typeof runBenchmark>[]): void {
  console.log("\n" + "=".repeat(100));
  console.log("BENCHMARK RESULTS - bun-bm25s");
  console.log("=".repeat(100));
  console.log();
  
  // Header
  console.log(
    "Corpus Size".padEnd(15) +
    "Index Time".padEnd(15) +
    "Tokens/sec".padEnd(15) +
    "Query Time".padEnd(15) +
    "QPS".padEnd(15) +
    "Est. Memory"
  );
  console.log("-".repeat(100));
  
  // Results
  for (const result of results) {
    console.log(
      formatNumber(result.corpusSize).padEnd(15) +
      formatTime(result.indexTimeMs).padEnd(15) +
      formatNumber(Math.round(result.tokensPerSecond)).padEnd(15) +
      formatTime(result.avgQueryTimeMs).padEnd(15) +
      formatNumber(Math.round(result.queriesPerSecond)).padEnd(15) +
      `${result.memoryMB.toFixed(2)} MB`
    );
  }
  
  console.log();
}

/**
 * Run BM25 variant comparison
 */
function runVariantComparison(corpusSize: number = 10000): void {
  console.log("\n" + "=".repeat(80));
  console.log(`BM25 VARIANT COMPARISON (${formatNumber(corpusSize)} documents)`);
  console.log("=".repeat(80));
  console.log();
  
  const methods = ["robertson", "lucene", "atire", "bm25l", "bm25+"] as const;
  const corpus = generateCorpus(corpusSize);
  const corpusTokens = tokenize(corpus, { stopwords: false }) as Tokenized;
  
  const queries = generateQueries(100);
  const queryTokens = tokenize(queries, { stopwords: false }) as Tokenized;
  
  console.log(
    "Method".padEnd(15) +
    "Index Time".padEnd(15) +
    "Query Time".padEnd(15) +
    "QPS"
  );
  console.log("-".repeat(60));
  
  for (const method of methods) {
    const indexStart = performance.now();
    const retriever = new BM25({ method });
    retriever.index(corpusTokens);
    const indexTime = performance.now() - indexStart;
    
    // Warm-up
    retriever.retrieve(queryTokens, { k: 10 });
    
    // Measure
    const queryStart = performance.now();
    retriever.retrieve(queryTokens, { k: 10 });
    const queryTime = performance.now() - queryStart;
    
    const qps = (100 / queryTime) * 1000;
    
    console.log(
      method.padEnd(15) +
      formatTime(indexTime).padEnd(15) +
      formatTime(queryTime).padEnd(15) +
      formatNumber(Math.round(qps))
    );
  }
  
  console.log();
}

/**
 * Run top-k comparison
 */
function runTopKComparison(corpusSize: number = 10000): void {
  console.log("\n" + "=".repeat(80));
  console.log(`TOP-K RETRIEVAL COMPARISON (${formatNumber(corpusSize)} documents)`);
  console.log("=".repeat(80));
  console.log();
  
  const corpus = generateCorpus(corpusSize);
  const corpusTokens = tokenize(corpus, { stopwords: false }) as Tokenized;
  const retriever = new BM25();
  retriever.index(corpusTokens);
  
  const queries = generateQueries(100);
  const queryTokens = tokenize(queries, { stopwords: false }) as Tokenized;
  
  // Warm-up
  retriever.retrieve(queryTokens, { k: 10 });
  
  console.log(
    "Top-K".padEnd(10) +
    "Query Time".padEnd(15) +
    "QPS"
  );
  console.log("-".repeat(40));
  
  const kValues = [1, 5, 10, 50, 100, 500];
  
  for (const k of kValues) {
    const queryStart = performance.now();
    retriever.retrieve(queryTokens, { k });
    const queryTime = performance.now() - queryStart;
    
    const qps = (100 / queryTime) * 1000;
    
    console.log(
      `k=${k}`.padEnd(10) +
      formatTime(queryTime).padEnd(15) +
      formatNumber(Math.round(qps))
    );
  }
  
  console.log();
}

/**
 * Main benchmark runner
 */
async function main(): Promise<void> {
  const systemInfo = getSystemInfo();
  
  console.log("\n" + "=".repeat(80));
  console.log("BUN-BM25S BENCHMARK SUITE");
  console.log("=".repeat(80));
  console.log();
  console.log("SYSTEM SPECIFICATIONS:");
  console.log("-".repeat(50));
  if (systemInfo.chip) console.log(`  Chip: ${systemInfo.chip}`);
  if (systemInfo.cores) console.log(`  Cores: ${systemInfo.cores}`);
  if (systemInfo.memory) console.log(`  Memory: ${systemInfo.memory}`);
  if (systemInfo.os) console.log(`  OS: ${systemInfo.os} ${systemInfo.osVersion || ""}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Bun: ${Bun.version}`);
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log();
  
  // Warm-up JIT
  console.log("Warming up JIT compiler...");
  const warmupCorpus = generateCorpus(1000);
  const warmupTokens = tokenize(warmupCorpus, { stopwords: false }) as Tokenized;
  const warmupRetriever = new BM25();
  warmupRetriever.index(warmupTokens);
  const warmupQueries = tokenize(generateQueries(100), { stopwords: false }) as Tokenized;
  warmupRetriever.retrieve(warmupQueries, { k: 10 });
  console.log("Warm-up complete.\n");
  
  // Main benchmark
  console.log("Running main benchmark...");
  const corpusSizes = [1000, 5000, 10000, 50000, 100000];
  const results: ReturnType<typeof runBenchmark>[] = [];
  
  for (const size of corpusSizes) {
    console.log(`  Benchmarking ${formatNumber(size)} documents...`);
    results.push(runBenchmark(size, 1000));
  }
  
  printResults(results);
  
  // Variant comparison
  runVariantComparison(10000);
  
  // Top-K comparison
  runTopKComparison(10000);
  
  // Summary
  console.log("=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log();
  
  const largest = results[results.length - 1];
  console.log(`Peak Performance (${formatNumber(largest.corpusSize)} docs):`);
  console.log(`  - Index throughput: ${formatNumber(Math.round(largest.tokensPerSecond))} tokens/sec`);
  console.log(`  - Query throughput: ${formatNumber(Math.round(largest.queriesPerSecond))} queries/sec`);
  console.log(`  - Avg query latency: ${formatTime(largest.avgQueryTimeMs)}`);
  console.log();
  
  console.log("✅ Benchmark complete!\n");
}

main().catch(console.error);
