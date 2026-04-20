/**
 * Cosine Similarity — from scratch
 * Measures the angle between two vectors
 *
 * Result: 1 = same direction (same meaning)
 *         0 = perpendicular  (unrelated)
 *        -1 = opposite       (opposite meaning)
 *
 * Formula: (A · B) / (|A| * |B|)
 * A · B  = dot product  (multiply element by element, then sum)
 * |A|    = magnitude of A (square root of sum of squares)
 */

const vectorSearch = {
  // Dot product: A · B
  // Like multiplying two arrays element by element then summing
  dotProduct(vecA, vecB) {
    return vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  },

  // Magnitude: |A| = √(a1² + a2² + ... + an²)
  magnitude(vec) {
    return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  },

  // Cosine similarity: (A · B) / (|A| * |B|)
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error(
        `Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`,
      );
    }

    const dot = this.dotProduct(vecA, vecB);
    const magA = this.magnitude(vecA);
    const magB = this.magnitude(vecB);

    // Guard against division by zero
    if (magA === 0 || magB === 0) return 0;

    return dot / (magA * magB);
  },

  // Score all chunks against a query vector
  // Returns ranked list with index + score
  search(queryVector, chunkVectors, topK = 10) {
    const scores = chunkVectors.map((vec, index) => ({
      index,
      score: this.cosineSimilarity(queryVector, vec),
    }));

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK);
  },
};

export default vectorSearch;
