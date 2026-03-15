# Contributing to bun-bm25s

Thank you for your interest in contributing to bun-bm25s! This document provides guidelines and information for contributors.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/oakoliver/bun-bm25s.git
   cd bun-bm25s
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Run tests:**
   ```bash
   bun test
   ```

4. **Run benchmarks:**
   ```bash
   bun run benchmark
   ```

## Project Structure

```
bun-bm25s/
├── src/
│   ├── index.ts        # Main exports
│   ├── bm25.ts         # BM25 class implementation
│   ├── tokenizer.ts    # Tokenizer class and tokenize function
│   ├── stopwords.ts    # Stopwords for 12 languages
│   ├── scoring.ts      # BM25 scoring algorithms (TFC/IDF)
│   ├── sparse.ts       # CSC sparse matrix utilities
│   └── selection.ts    # Top-k selection algorithms
├── tests/
│   └── bm25.test.ts    # Test suite
├── benchmarks/
│   ├── benchmark.ts    # Performance benchmarks
│   ├── compare.ts      # Python comparison benchmarks
│   └── compare_python.py
└── dist/               # Built output (generated)
```

## How to Contribute

### Reporting Bugs

- Check existing issues first to avoid duplicates
- Include a minimal reproduction case
- Specify your Bun version (`bun --version`)
- Include relevant error messages and stack traces

### Suggesting Features

- Open an issue describing the feature
- Explain the use case and why it would be valuable
- Consider whether it aligns with the project's goals (performance, zero dependencies)

### Submitting Pull Requests

1. **Fork the repository** and create a new branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** following the code style guidelines below

3. **Add tests** for new functionality

4. **Run the test suite:**
   ```bash
   bun test
   ```

5. **Run type checking:**
   ```bash
   bun run typecheck
   ```

6. **Commit your changes** with a clear message:
   ```bash
   git commit -m "Add feature: description of the feature"
   ```

7. **Push and open a PR:**
   ```bash
   git push origin feature/my-feature
   ```

## Code Style Guidelines

- **TypeScript**: Use strict TypeScript with proper types
- **Zero dependencies**: Do not add external runtime dependencies
- **Performance**: Consider performance implications of changes
- **Documentation**: Add JSDoc comments for public APIs
- **Tests**: Include tests for new functionality

### Naming Conventions

- Use `camelCase` for variables and functions
- Use `PascalCase` for classes and types
- Use `UPPER_SNAKE_CASE` for constants

### Example Code Style

```typescript
/**
 * Calculate the BM25 score for a term in a document.
 * @param tf - Term frequency in the document
 * @param docLen - Document length
 * @param avgDocLen - Average document length
 * @returns The BM25 score
 */
export function calculateScore(tf: number, docLen: number, avgDocLen: number): number {
  // Implementation
}
```

## Performance Considerations

This library prioritizes performance. When contributing:

- Avoid unnecessary allocations in hot paths
- Prefer typed arrays (`Float64Array`, `Uint32Array`) over regular arrays for numeric data
- Use efficient algorithms (partial sorting for top-k, sparse matrices for storage)
- Benchmark changes with `bun run benchmark`

## Testing Guidelines

- Write tests for all new functionality
- Include edge cases (empty inputs, single documents, etc.)
- Test different BM25 variants when applicable
- Run the full test suite before submitting PRs

## Questions?

Feel free to open an issue for any questions about contributing.

## License

By contributing to bun-bm25s, you agree that your contributions will be licensed under the MIT License.
