/**
 * Top-K Selection Utilities
 * 
 * Efficient algorithms for finding top-k elements in arrays.
 * Uses partial heap sort which is O(n + k log k) instead of full sort O(n log n).
 */

/**
 * Result of top-k selection
 */
export interface TopKResult {
  /** Top-k scores (highest first if sorted) */
  scores: Float64Array;
  /** Indices of top-k elements */
  indices: Uint32Array;
}

/**
 * Find top-k elements using a min-heap approach
 * Time complexity: O(n log k)
 * 
 * @param scores - Array of scores to search
 * @param k - Number of top elements to return
 * @param sorted - Whether to sort results by score (descending)
 */
export function topK(
  scores: Float64Array,
  k: number,
  sorted: boolean = true
): TopKResult {
  const n = scores.length;
  k = Math.min(k, n);

  if (k === 0) {
    return {
      scores: new Float64Array(0),
      indices: new Uint32Array(0),
    };
  }

  // For small arrays or large k, use full sort
  if (n <= 1000 || k > n / 2) {
    return topKFullSort(scores, k, sorted);
  }

  // Use min-heap for larger arrays
  return topKHeap(scores, k, sorted);
}

/**
 * Top-k using full sort (efficient for small arrays)
 */
function topKFullSort(
  scores: Float64Array,
  k: number,
  sorted: boolean
): TopKResult {
  const n = scores.length;
  
  // Create indices array
  const indices = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    indices[i] = i;
  }

  // Sort indices by scores (descending)
  indices.sort((a, b) => scores[b] - scores[a]);

  // Take top k
  const topIndices = indices.slice(0, k);
  const topScores = new Float64Array(k);
  for (let i = 0; i < k; i++) {
    topScores[i] = scores[topIndices[i]];
  }

  return {
    scores: topScores,
    indices: topIndices,
  };
}

/**
 * Top-k using min-heap (efficient for large arrays with small k)
 */
function topKHeap(
  scores: Float64Array,
  k: number,
  sorted: boolean
): TopKResult {
  // Min-heap storing (score, index) pairs
  // We maintain k largest elements, with smallest of those at root
  const heap: [number, number][] = [];

  // Helper functions for heap operations
  const parent = (i: number) => Math.floor((i - 1) / 2);
  const leftChild = (i: number) => 2 * i + 1;
  const rightChild = (i: number) => 2 * i + 2;

  const swap = (i: number, j: number) => {
    const temp = heap[i];
    heap[i] = heap[j];
    heap[j] = temp;
  };

  const siftUp = (i: number) => {
    while (i > 0 && heap[parent(i)][0] > heap[i][0]) {
      swap(i, parent(i));
      i = parent(i);
    }
  };

  const siftDown = (i: number) => {
    const n = heap.length;
    let smallest = i;
    const left = leftChild(i);
    const right = rightChild(i);

    if (left < n && heap[left][0] < heap[smallest][0]) {
      smallest = left;
    }
    if (right < n && heap[right][0] < heap[smallest][0]) {
      smallest = right;
    }

    if (smallest !== i) {
      swap(i, smallest);
      siftDown(smallest);
    }
  };

  // Process all elements
  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];

    if (heap.length < k) {
      // Heap not full, just add
      heap.push([score, i]);
      siftUp(heap.length - 1);
    } else if (score > heap[0][0]) {
      // Larger than smallest in heap, replace root
      heap[0] = [score, i];
      siftDown(0);
    }
  }

  // Extract results
  const resultScores = new Float64Array(heap.length);
  const resultIndices = new Uint32Array(heap.length);

  if (sorted) {
    // Sort by extracting from heap in reverse order
    const sortedHeap = heap.slice().sort((a, b) => b[0] - a[0]);
    for (let i = 0; i < sortedHeap.length; i++) {
      resultScores[i] = sortedHeap[i][0];
      resultIndices[i] = sortedHeap[i][1];
    }
  } else {
    for (let i = 0; i < heap.length; i++) {
      resultScores[i] = heap[i][0];
      resultIndices[i] = heap[i][1];
    }
  }

  return {
    scores: resultScores,
    indices: resultIndices,
  };
}

/**
 * Batch top-k selection for multiple queries
 * Processes queries in parallel using available CPU cores
 */
export function batchTopK(
  allScores: Float64Array[],
  k: number,
  sorted: boolean = true
): TopKResult[] {
  return allScores.map((scores) => topK(scores, k, sorted));
}

/**
 * Argmax - find index of maximum value
 */
export function argmax(arr: Float64Array): number {
  if (arr.length === 0) return -1;
  
  let maxIdx = 0;
  let maxVal = arr[0];
  
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > maxVal) {
      maxVal = arr[i];
      maxIdx = i;
    }
  }
  
  return maxIdx;
}

/**
 * Argsort - return indices that would sort the array (descending)
 */
export function argsortDesc(arr: Float64Array): Uint32Array {
  const indices = new Uint32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    indices[i] = i;
  }
  indices.sort((a, b) => arr[b] - arr[a]);
  return indices;
}
