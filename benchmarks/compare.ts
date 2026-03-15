/**
 * Comparison benchmark: bun-bm25s vs Python bm25s
 * 
 * Run with: bun run benchmarks/compare.ts
 */

import { BM25, tokenize, type Tokenized } from "../src";
import { spawn } from "bun";
import { execSync } from "child_process";

// Sample vocabulary (same as Python benchmark)
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
    }
  } catch {
    // Ignore errors
  }
  
  return info;
}

// Seeded random for reproducibility (same seed as Python)
let seed = 42;
function seededRandom(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function generateCorpus(numDocs: number, avgWordsPerDoc: number = 50): string[] {
  const corpus: string[] = [];
  for (let i = 0; i < numDocs; i++) {
    const numWords = avgWordsPerDoc + Math.floor(seededRandom() * 51) - 25;
    const words: string[] = [];
    for (let j = 0; j < numWords; j++) {
      words.push(VOCABULARY[Math.floor(seededRandom() * VOCABULARY.length)]);
    }
    corpus.push(words.join(" "));
  }
  return corpus;
}

function generateQueries(numQueries: number, wordsPerQuery: number = 3): string[] {
  const queries: string[] = [];
  for (let i = 0; i < numQueries; i++) {
    const words: string[] = [];
    for (let j = 0; j < wordsPerQuery; j++) {
      words.push(VOCABULARY[Math.floor(seededRandom() * VOCABULARY.length)]);
    }
    queries.push(words.join(" "));
  }
  return queries;
}

interface BenchmarkResult {
  corpus_size: number;
  index_time_ms: number;
  avg_query_time_ms: number;
  queries_per_second: number;
  tokens_per_second: number;
  backend?: string;
}

interface PythonOutput {
  system_info: {
    chip?: string;
    cores?: string;
    memory?: string;
    numba_available: boolean;
  };
  numpy_results: BenchmarkResult[];
  numba_results: BenchmarkResult[];
}

function runBunBenchmark(corpusSize: number, numQueries: number = 1000): BenchmarkResult {
  // Reset seed for this run
  seed = 42;
  
  const corpus = generateCorpus(corpusSize);
  
  let totalTokens = 0;
  for (const doc of corpus) {
    totalTokens += doc.split(/\s+/).length;
  }
  
  const indexStart = performance.now();
  const corpusTokens = tokenize(corpus, { stopwords: false }) as Tokenized;
  const retriever = new BM25({ method: "lucene" });
  retriever.index(corpusTokens);
  const indexTime = performance.now() - indexStart;
  
  // Reset seed for queries
  seed = 42 + corpusSize; // Different seed for queries
  const queries = generateQueries(numQueries);
  const queryTokens = tokenize(queries, { stopwords: false }) as Tokenized;
  
  // Warm-up
  retriever.retrieve(queryTokens, { k: 10 });
  
  // Measure (3 runs)
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
  
  return {
    corpus_size: corpusSize,
    index_time_ms: indexTime,
    avg_query_time_ms: avgQueryTimePerQuery,
    queries_per_second: qps,
    tokens_per_second: tokensPerSec,
  };
}

async function runPythonBenchmark(): Promise<PythonOutput> {
  console.log("Running Python bm25s benchmark...");
  
  const proc = spawn(["python3", "benchmarks/compare_python.py"], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });
  
  const output = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  
  if (stderr) {
    console.log(stderr);
  }
  
  await proc.exited;
  
  return JSON.parse(output.trim());
}

function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)} µs`;
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatSpeedup(bunValue: number, pythonValue: number, higherIsBetter: boolean): string {
  const ratio = higherIsBetter ? bunValue / pythonValue : pythonValue / bunValue;
  const emoji = ratio > 1.05 ? "🚀" : ratio < 0.95 ? "🐢" : "⚖️";
  return `${ratio.toFixed(2)}x ${emoji}`;
}

function printComparisonTable(
  label: string,
  bunResults: BenchmarkResult[],
  pythonResults: BenchmarkResult[],
  pythonLabel: string
): { avgIndexSpeedup: number; avgQpsSpeedup: number } {
  console.log("\n" + "=".repeat(120));
  console.log(`INDEXING PERFORMANCE: bun-bm25s vs Python bm25s (${pythonLabel})`);
  console.log("=".repeat(120));
  console.log();
  console.log(
    "Corpus Size".padEnd(15) +
    "Python".padEnd(15) +
    "Bun".padEnd(15) +
    "Speedup".padEnd(15) +
    "Python tok/s".padEnd(18) +
    "Bun tok/s".padEnd(18) +
    "Speedup"
  );
  console.log("-".repeat(120));
  
  let avgIndexSpeedup = 0;
  let avgQpsSpeedup = 0;
  
  for (let i = 0; i < bunResults.length; i++) {
    const py = pythonResults[i];
    const bun = bunResults[i];
    
    avgIndexSpeedup += py.index_time_ms / bun.index_time_ms;
    
    console.log(
      formatNumber(py.corpus_size).padEnd(15) +
      formatTime(py.index_time_ms).padEnd(15) +
      formatTime(bun.index_time_ms).padEnd(15) +
      formatSpeedup(bun.index_time_ms, py.index_time_ms, false).padEnd(15) +
      formatNumber(Math.round(py.tokens_per_second)).padEnd(18) +
      formatNumber(Math.round(bun.tokens_per_second)).padEnd(18) +
      formatSpeedup(bun.tokens_per_second, py.tokens_per_second, true)
    );
  }
  
  console.log("\n" + "=".repeat(120));
  console.log(`RETRIEVAL PERFORMANCE: bun-bm25s vs Python bm25s (${pythonLabel}) - 1000 queries, k=10`);
  console.log("=".repeat(120));
  console.log();
  console.log(
    "Corpus Size".padEnd(15) +
    "Python QPS".padEnd(18) +
    "Bun QPS".padEnd(18) +
    "Speedup".padEnd(15) +
    "Python Latency".padEnd(18) +
    "Bun Latency".padEnd(18) +
    "Speedup"
  );
  console.log("-".repeat(120));
  
  for (let i = 0; i < bunResults.length; i++) {
    const py = pythonResults[i];
    const bun = bunResults[i];
    
    avgQpsSpeedup += bun.queries_per_second / py.queries_per_second;
    
    console.log(
      formatNumber(py.corpus_size).padEnd(15) +
      formatNumber(Math.round(py.queries_per_second)).padEnd(18) +
      formatNumber(Math.round(bun.queries_per_second)).padEnd(18) +
      formatSpeedup(bun.queries_per_second, py.queries_per_second, true).padEnd(15) +
      formatTime(py.avg_query_time_ms).padEnd(18) +
      formatTime(bun.avg_query_time_ms).padEnd(18) +
      formatSpeedup(bun.avg_query_time_ms, py.avg_query_time_ms, false)
    );
  }
  
  avgIndexSpeedup /= bunResults.length;
  avgQpsSpeedup /= bunResults.length;
  
  return { avgIndexSpeedup, avgQpsSpeedup };
}

async function main(): Promise<void> {
  const systemInfo = getSystemInfo();
  
  console.log("\n" + "=".repeat(100));
  console.log("BUN-BM25S vs PYTHON BM25S COMPARISON BENCHMARK");
  console.log("=".repeat(100));
  console.log();
  console.log("SYSTEM SPECIFICATIONS:");
  console.log("-".repeat(50));
  if (systemInfo.chip) console.log(`  Chip: ${systemInfo.chip}`);
  if (systemInfo.cores) console.log(`  Cores: ${systemInfo.cores}`);
  if (systemInfo.memory) console.log(`  Memory: ${systemInfo.memory}`);
  if (systemInfo.os) console.log(`  OS: ${systemInfo.os} ${systemInfo.osVersion || ""}`);
  console.log(`  Bun: ${Bun.version}`);
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log();
  
  // Warm-up Bun
  console.log("Warming up Bun JIT...");
  seed = 42;
  const warmupCorpus = generateCorpus(1000);
  const warmupTokens = tokenize(warmupCorpus, { stopwords: false }) as Tokenized;
  const warmupRetriever = new BM25();
  warmupRetriever.index(warmupTokens);
  seed = 1042;
  const warmupQueries = tokenize(generateQueries(100), { stopwords: false }) as Tokenized;
  warmupRetriever.retrieve(warmupQueries, { k: 10 });
  console.log("Warm-up complete.\n");
  
  // Run Python benchmark
  const pythonOutput = await runPythonBenchmark();
  
  console.log(`\nPython bm25s version: ${pythonOutput.system_info.numba_available ? "with numba" : "numpy only"}`);
  
  // Run Bun benchmark
  console.log("\nRunning Bun bm25s benchmark...");
  const corpusSizes = [1000, 5000, 10000, 50000, 100000];
  const bunResults: BenchmarkResult[] = [];
  
  for (const size of corpusSizes) {
    console.log(`  Benchmarking ${formatNumber(size)} documents...`);
    bunResults.push(runBunBenchmark(size, 1000));
  }
  
  // Print numpy comparison
  const numpyStats = printComparisonTable("numpy", bunResults, pythonOutput.numpy_results, "numpy backend");
  
  // Print numba comparison if available
  let numbaStats = { avgIndexSpeedup: 0, avgQpsSpeedup: 0 };
  if (pythonOutput.numba_results.length > 0) {
    numbaStats = printComparisonTable("numba", bunResults, pythonOutput.numba_results, "numba backend");
  }
  
  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log();
  
  console.log("vs Python bm25s (numpy backend):");
  console.log(`  - Indexing: ${numpyStats.avgIndexSpeedup.toFixed(2)}x faster`);
  console.log(`  - Retrieval: ${numpyStats.avgQpsSpeedup.toFixed(2)}x faster`);
  
  if (pythonOutput.numba_results.length > 0) {
    console.log();
    console.log("vs Python bm25s (numba backend - JIT compiled):");
    console.log(`  - Indexing: ${numbaStats.avgIndexSpeedup.toFixed(2)}x faster`);
    console.log(`  - Retrieval: ${numbaStats.avgQpsSpeedup.toFixed(2)}x faster`);
  }
  
  console.log();
  
  // Peak performance
  const lastBun = bunResults[bunResults.length - 1];
  console.log(`Peak bun-bm25s Performance (${formatNumber(lastBun.corpus_size)} docs):`);
  console.log(`  - Index throughput: ${formatNumber(Math.round(lastBun.tokens_per_second))} tokens/sec`);
  console.log(`  - Query throughput: ${formatNumber(Math.round(lastBun.queries_per_second))} QPS`);
  console.log(`  - Query latency: ${formatTime(lastBun.avg_query_time_ms)}`);
  console.log();
  
  if (numpyStats.avgIndexSpeedup > 1 && numpyStats.avgQpsSpeedup > 1) {
    console.log("🎉 bun-bm25s is faster than Python bm25s!");
  }
  
  console.log("\n✅ Comparison complete!\n");
}

main().catch(console.error);
