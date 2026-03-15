/**
 * Sparse Matrix Utilities for CSC (Compressed Sparse Column) Format
 * 
 * CSC format stores:
 * - data: non-zero values (column-major order)
 * - indices: row indices for each value
 * - indptr: index pointers for column boundaries
 * 
 * For BM25, columns represent vocabulary tokens and rows represent documents.
 * This allows efficient retrieval of all documents containing a given token.
 */

/**
 * CSC Matrix representation
 */
export interface CSCMatrix {
  /** Non-zero score values */
  data: Float64Array;
  /** Row indices (document IDs) for each value */
  indices: Uint32Array;
  /** Column pointers: indptr[col] to indptr[col+1] gives range for column */
  indptr: Uint32Array;
  /** Number of rows (documents) */
  numRows: number;
  /** Number of columns (vocabulary size) */
  numCols: number;
}

/**
 * Build CSC matrix from COO (Coordinate) format data
 * 
 * Uses counting sort for O(n) complexity instead of comparison-based O(n log n)
 * This is the same optimization used in the Python bm25s library
 * 
 * @param data - Score values
 * @param rows - Row indices (document IDs)
 * @param cols - Column indices (token IDs)
 * @param numRows - Number of rows (documents)
 * @param numCols - Number of columns (vocabulary size)
 */
export function buildCSCMatrix(
  data: Float64Array,
  rows: Uint32Array,
  cols: Uint32Array,
  numRows: number,
  numCols: number
): CSCMatrix {
  const numItems = data.length;

  // Step 1: Count entries per column
  const colCounts = new Uint32Array(numCols);
  for (let i = 0; i < numItems; i++) {
    colCounts[cols[i]]++;
  }

  // Step 2: Build indptr using cumulative sum
  const indptr = new Uint32Array(numCols + 1);
  let cumSum = 0;
  for (let i = 0; i < numCols; i++) {
    indptr[i] = cumSum;
    cumSum += colCounts[i];
  }
  indptr[numCols] = cumSum;

  // Step 3: Create write position trackers (heads)
  const heads = new Uint32Array(indptr.slice(0, numCols));

  // Step 4: Scatter data into sorted arrays using counting sort
  const sortedData = new Float64Array(numItems);
  const sortedIndices = new Uint32Array(numItems);

  for (let i = 0; i < numItems; i++) {
    const col = cols[i];
    const pos = heads[col];
    sortedData[pos] = data[i];
    sortedIndices[pos] = rows[i];
    heads[col]++;
  }

  return {
    data: sortedData,
    indices: sortedIndices,
    indptr,
    numRows,
    numCols,
  };
}

/**
 * Alternative CSC builder using packed indices for stable sort
 * This method is used when row ordering within columns matters
 */
export function buildCSCMatrixStable(
  data: Float64Array,
  rows: Uint32Array,
  cols: Uint32Array,
  numRows: number,
  numCols: number
): CSCMatrix {
  const numItems = data.length;

  // Step 1: Build indptr
  const colCounts = new Uint32Array(numCols);
  for (let i = 0; i < numItems; i++) {
    colCounts[cols[i]]++;
  }

  const indptr = new Uint32Array(numCols + 1);
  let cumSum = 0;
  for (let i = 0; i < numCols; i++) {
    indptr[i] = cumSum;
    cumSum += colCounts[i];
  }
  indptr[numCols] = cumSum;

  // Step 2: Pack (col, row) into single 64-bit values for stable sort
  // This ensures consistent ordering
  const packed = new BigUint64Array(numItems);
  for (let i = 0; i < numItems; i++) {
    // Pack: high 32 bits = col, low 32 bits = row
    packed[i] = (BigInt(cols[i]) << 32n) | BigInt(rows[i]);
  }

  // Step 3: Get sort indices
  const sortIndices = new Uint32Array(numItems);
  for (let i = 0; i < numItems; i++) {
    sortIndices[i] = i;
  }
  sortIndices.sort((a, b) => {
    if (packed[a] < packed[b]) return -1;
    if (packed[a] > packed[b]) return 1;
    return 0;
  });

  // Step 4: Reorder arrays
  const sortedData = new Float64Array(numItems);
  const sortedIndices = new Uint32Array(numItems);

  for (let i = 0; i < numItems; i++) {
    const srcIdx = sortIndices[i];
    sortedData[i] = data[srcIdx];
    sortedIndices[i] = rows[srcIdx];
  }

  return {
    data: sortedData,
    indices: sortedIndices,
    indptr,
    numRows,
    numCols,
  };
}

/**
 * Get column data from CSC matrix
 */
export function getColumn(
  matrix: CSCMatrix,
  col: number
): { data: Float64Array; indices: Uint32Array } {
  const start = matrix.indptr[col];
  const end = matrix.indptr[col + 1];

  return {
    data: matrix.data.subarray(start, end),
    indices: matrix.indices.subarray(start, end),
  };
}

/**
 * Get number of non-zeros in a column
 */
export function getColumnNnz(matrix: CSCMatrix, col: number): number {
  return matrix.indptr[col + 1] - matrix.indptr[col];
}

/**
 * Get total number of non-zeros
 */
export function getTotalNnz(matrix: CSCMatrix): number {
  return matrix.data.length;
}

/**
 * Serialize CSC matrix to binary format for efficient storage
 */
export function serializeCSC(matrix: CSCMatrix): ArrayBuffer {
  // Header: 4 uint32 values (numRows, numCols, dataLen, indicesLen)
  const headerSize = 4 * 4;
  const dataSize = matrix.data.byteLength;
  const indicesSize = matrix.indices.byteLength;
  const indptrSize = matrix.indptr.byteLength;
  
  const totalSize = headerSize + dataSize + indicesSize + indptrSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  
  // Write header
  let offset = 0;
  view.setUint32(offset, matrix.numRows, true); offset += 4;
  view.setUint32(offset, matrix.numCols, true); offset += 4;
  view.setUint32(offset, matrix.data.length, true); offset += 4;
  view.setUint32(offset, matrix.indices.length, true); offset += 4;
  
  // Write data arrays
  const dataView = new Float64Array(buffer, offset, matrix.data.length);
  dataView.set(matrix.data);
  offset += dataSize;
  
  const indicesView = new Uint32Array(buffer, offset, matrix.indices.length);
  indicesView.set(matrix.indices);
  offset += indicesSize;
  
  const indptrView = new Uint32Array(buffer, offset, matrix.indptr.length);
  indptrView.set(matrix.indptr);
  
  return buffer;
}

/**
 * Deserialize CSC matrix from binary format
 */
export function deserializeCSC(buffer: ArrayBuffer): CSCMatrix {
  const view = new DataView(buffer);
  
  // Read header
  let offset = 0;
  const numRows = view.getUint32(offset, true); offset += 4;
  const numCols = view.getUint32(offset, true); offset += 4;
  const dataLen = view.getUint32(offset, true); offset += 4;
  const indicesLen = view.getUint32(offset, true); offset += 4;
  
  // Read data arrays
  const data = new Float64Array(buffer, offset, dataLen);
  offset += dataLen * 8;
  
  const indices = new Uint32Array(buffer, offset, indicesLen);
  offset += indicesLen * 4;
  
  const indptr = new Uint32Array(buffer, offset, numCols + 1);
  
  return {
    data,
    indices,
    indptr,
    numRows,
    numCols,
  };
}
