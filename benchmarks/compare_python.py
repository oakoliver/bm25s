#!/usr/bin/env python3
"""
Benchmark script for Python bm25s
Run with: python3 benchmarks/compare_python.py
"""

import time
import random
import json
import sys
import platform
import subprocess

import bm25s

# Try to import numba for accelerated backend
try:
    import numba

    HAS_NUMBA = True
except ImportError:
    HAS_NUMBA = False

# Sample vocabulary for generating synthetic documents
VOCABULARY = [
    "algorithm",
    "computer",
    "science",
    "machine",
    "learning",
    "neural",
    "network",
    "deep",
    "data",
    "model",
    "training",
    "inference",
    "optimization",
    "gradient",
    "descent",
    "backpropagation",
    "activation",
    "function",
    "layer",
    "weight",
    "bias",
    "loss",
    "accuracy",
    "precision",
    "recall",
    "classification",
    "regression",
    "clustering",
    "dimensionality",
    "reduction",
    "feature",
    "extraction",
    "embedding",
    "vector",
    "matrix",
    "tensor",
    "computation",
    "parallel",
    "distributed",
    "system",
    "memory",
    "cache",
    "storage",
    "index",
    "search",
    "retrieval",
    "ranking",
    "score",
    "document",
    "query",
    "term",
    "frequency",
    "inverse",
    "sparse",
    "dense",
    "efficient",
    "performance",
    "benchmark",
    "evaluation",
    "metric",
    "test",
    "validation",
    "cross",
]


def get_system_info() -> dict:
    """Get system information."""
    info = {
        "platform": platform.system(),
        "platform_version": platform.version(),
        "architecture": platform.machine(),
        "processor": platform.processor(),
        "python_version": platform.python_version(),
        "bm25s_version": bm25s.__version__,
        "numba_available": HAS_NUMBA,
    }

    # Get macOS specific info
    if platform.system() == "Darwin":
        try:
            result = subprocess.run(
                ["system_profiler", "SPHardwareDataType"],
                capture_output=True,
                text=True,
            )
            for line in result.stdout.split("\n"):
                if "Chip:" in line:
                    info["chip"] = line.split(":")[1].strip()
                elif "Total Number of Cores:" in line:
                    info["cores"] = line.split(":")[1].strip()
                elif "Memory:" in line:
                    info["memory"] = line.split(":")[1].strip()
        except:
            pass

    return info


def generate_corpus(num_docs: int, avg_words_per_doc: int = 50) -> list[str]:
    """Generate synthetic corpus with specified number of documents."""
    corpus = []
    for _ in range(num_docs):
        num_words = avg_words_per_doc + random.randint(-25, 25)
        words = [random.choice(VOCABULARY) for _ in range(num_words)]
        corpus.append(" ".join(words))
    return corpus


def generate_queries(num_queries: int, words_per_query: int = 3) -> list[str]:
    """Generate random queries."""
    queries = []
    for _ in range(num_queries):
        words = [random.choice(VOCABULARY) for _ in range(words_per_query)]
        queries.append(" ".join(words))
    return queries


def run_benchmark(
    corpus_size: int, num_queries: int = 1000, use_numba: bool = False
) -> dict:
    """Run benchmark for a specific corpus size."""
    # Generate corpus
    corpus = generate_corpus(corpus_size)

    # Count total tokens
    total_tokens = sum(len(doc.split()) for doc in corpus)

    # Measure indexing time
    backend = "numba" if use_numba and HAS_NUMBA else "numpy"

    index_start = time.perf_counter()
    corpus_tokens = bm25s.tokenize(corpus, stopwords=None, show_progress=False)
    retriever = bm25s.BM25(method="lucene", backend=backend)
    retriever.index(corpus_tokens, show_progress=False)
    index_time = (time.perf_counter() - index_start) * 1000  # ms

    # Generate queries
    queries = generate_queries(num_queries)
    query_tokens = bm25s.tokenize(queries, stopwords=None, show_progress=False)

    # Warm-up
    retriever.retrieve(query_tokens, k=10, show_progress=False)

    # Measure retrieval time (average of 3 runs)
    runs = 3
    total_query_time = 0

    for _ in range(runs):
        query_start = time.perf_counter()
        retriever.retrieve(query_tokens, k=10, show_progress=False)
        total_query_time += (time.perf_counter() - query_start) * 1000

    avg_query_time = total_query_time / runs
    avg_query_time_per_query = avg_query_time / num_queries
    qps = (num_queries / avg_query_time) * 1000
    tokens_per_sec = (total_tokens / index_time) * 1000

    return {
        "corpus_size": corpus_size,
        "index_time_ms": index_time,
        "avg_query_time_ms": avg_query_time_per_query,
        "queries_per_second": qps,
        "tokens_per_second": tokens_per_sec,
        "backend": backend,
    }


def main():
    # Set random seed for reproducibility
    random.seed(42)

    print("Running Python bm25s benchmark...", file=sys.stderr)

    # Get system info
    system_info = get_system_info()

    # Warm-up JIT/caches
    warmup_corpus = generate_corpus(1000)
    warmup_tokens = bm25s.tokenize(warmup_corpus, stopwords=None, show_progress=False)
    warmup_retriever = bm25s.BM25()
    warmup_retriever.index(warmup_tokens, show_progress=False)
    warmup_queries = bm25s.tokenize(
        generate_queries(100), stopwords=None, show_progress=False
    )
    warmup_retriever.retrieve(warmup_queries, k=10, show_progress=False)

    # Run benchmarks with numpy backend
    corpus_sizes = [1000, 5000, 10000, 50000, 100000]
    numpy_results = []

    for size in corpus_sizes:
        print(f"  [numpy] Benchmarking {size:,} documents...", file=sys.stderr)
        random.seed(42)  # Reset seed for each size
        result = run_benchmark(size, 1000, use_numba=False)
        numpy_results.append(result)

    # Run benchmarks with numba backend if available
    numba_results = []
    if HAS_NUMBA:
        # Warm-up numba JIT
        print("  Warming up numba JIT...", file=sys.stderr)
        random.seed(42)
        warmup_corpus = generate_corpus(1000)
        warmup_tokens = bm25s.tokenize(
            warmup_corpus, stopwords=None, show_progress=False
        )
        warmup_retriever = bm25s.BM25(backend="numba")
        warmup_retriever.index(warmup_tokens, show_progress=False)
        warmup_queries = bm25s.tokenize(
            generate_queries(100), stopwords=None, show_progress=False
        )
        warmup_retriever.retrieve(warmup_queries, k=10, show_progress=False)

        for size in corpus_sizes:
            print(f"  [numba] Benchmarking {size:,} documents...", file=sys.stderr)
            random.seed(42)  # Reset seed for each size
            result = run_benchmark(size, 1000, use_numba=True)
            numba_results.append(result)

    # Output as JSON for parsing by the comparison script
    output = {
        "system_info": system_info,
        "numpy_results": numpy_results,
        "numba_results": numba_results,
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
