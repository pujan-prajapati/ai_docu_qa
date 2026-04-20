import { Chunk } from "../models/chunk.model.js";
import { embedderService } from "./embedder.js";

export const retriever = {
  /**
   * Cosine similarity — measures how "close" two vectors are
   * Returns a value between -1 and 1
   * 1 = identical meaning, 0 = unrelated, -1 = opposite
   *
   * Think of it like: how much do two arrows point in the same direction?
   */
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magA * magB);
  },

  /**
   * Find the top K most relevant chunks for a query
   *
   * 1. Embed the query into a vector
   * 2. Compare against all stored chunk vectors
   * 3. Return the top K by similarity score
   */
  async findRelevantChunks(query, sessionId, topK = 4) {
    // 1. Embed the user's question
    const queryVector = await embedderService.embed(query);

    // 2. Load all chunks for this session from MongoDB
    const chunks = await Chunk.find({ sessionId });

    if (chunks.length === 0) return [];

    // 3. Score each chunk by similarity to query
    const scored = chunks.map((chunk) => ({
      text: chunk.text,
      score: this.cosineSimilarity(queryVector, chunk.embedding),
    }));

    // 4. Sort by score descending, take top K
    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, topK);

    console.log(
      "Top chunk scores:",
      topChunks.map((c) => c.score.toFixed(3)),
    );

    return topChunks;
  },
};
