import { Chunk } from "../models/chunk.model.js";
import { embedderService } from "./embedder.js";
import BM25 from "./bm25.js";
import vectorSearch from "./vectorSearch.js";

/**
 * Reciprocal Rank Fusion
 * Merges two ranked lists into one fair combined ranking
 *
 * Works on RANKS not scores — so scale differences don't matter
 * Formula: sum of 1/(rank + k) for each list
 * k = 60 (standard constant that prevents top ranks from dominating)
 */
const reciprocalRankFusion = (bm25Results, vectorResults, k = 60) => {
  const scores = {}; // chunkIndex → combined RRF score

  // Add BM25 ranks
  bm25Results.forEach(({ index }, rank) => {
    scores[index] = (scores[index] || 0) + 1 / (rank + 1 + k);
  });

  // Add vector ranks
  vectorResults.forEach(({ index }, rank) => {
    scores[index] = (scores[index] || 0) + 1 / (rank + 1 + k);
  });

  // Sort by combined score
  return Object.entries(scores)
    .map(([index, score]) => ({ index: parseInt(index), score }))
    .sort((a, b) => b.score - a.score);
};

const hybridRetriever = {
  async findRelevantChunks(query, sessionId, topK = 4) {
    // 1. Load all chunks from MongoDB for this session
    const chunks = await Chunk.find({ sessionId });
    if (chunks.length === 0) return [];

    const chunkTexts = chunks.map((c) => c.text);
    const chunkEmbeddings = chunks.map((c) => c.embedding);

    // ── BM25 Search ──────────────────────────────────────
    // 2. Build BM25 index from chunk texts
    const bm25 = new BM25();
    bm25.index(chunkTexts);

    // 3. Search with BM25 — get top 10 candidates
    const bm25Results = bm25.search(query, 10);

    console.log(
      "BM25 top 3:",
      bm25Results
        .slice(0, 3)
        .map((r) => `chunk_${r.index} (score: ${r.score.toFixed(3)})`),
    );

    // ── Vector Search ────────────────────────────────────
    // 4. Embed the query
    const queryVector = await embedderService.embed(query);

    // 5. Search with cosine similarity — get top 10 candidates
    const vectorResults = vectorSearch.search(queryVector, chunkEmbeddings, 10);

    console.log(
      "Vector top 3:",
      vectorResults
        .slice(0, 3)
        .map((r) => `chunk_${r.index} (score: ${r.score.toFixed(3)})`),
    );

    // ── Hybrid Fusion ─────────────────────────────────────
    // 6. Fuse both result lists with RRF
    const fusedResults = reciprocalRankFusion(bm25Results, vectorResults);

    console.log(
      "Hybrid top 3:",
      fusedResults
        .slice(0, 3)
        .map((r) => `chunk_${r.index} (rrf: ${r.score.toFixed(4)})`),
    );

    // 7. Return top K chunk texts
    return fusedResults.slice(0, topK).map((result) => ({
      text: chunks[result.index].text,
      score: result.score,
    }));
  },
};

export default hybridRetriever;
