/**
 * BM25 — Best Match 25
 * The gold standard keyword search algorithm
 * Built completely from scratch — no libraries
 *
 * Two tuning constants (these are industry standard values):
 * k1 = 1.5 — controls term frequency saturation
 *            (stops one word appearing 100x from dominating)
 * b  = 0.75 — controls length normalization
 *            (0 = ignore length, 1 = fully normalize)
 */

class BM25 {
  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.corpus = []; // array of tokenized chunks
    this.idf = {}; // word → IDF score
    this.avgDocLength = 0;
  }

  // ── Tokenizer ──────────────────────────────────────────
  // Convert raw text into an array of clean lowercase words
  // Like splitting a MongoDB document into indexable fields
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "") // remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 1); // remove single chars
  }

  // ── IDF Calculation ────────────────────────────────────
  // IDF = how rare is a word across ALL chunks?
  // Rare words (like "photosynthesis") score high
  // Common words (like "the", "is") score low
  //
  // Formula: log((N - df + 0.5) / (df + 0.5) + 1)
  // N  = total number of chunks
  // df = how many chunks contain this word
  computeIDF(corpus) {
    const N = corpus.length;
    const docFreq = {}; // word → how many docs contain it

    // Count which words appear in which docs
    for (const tokens of corpus) {
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFreq[token] = (docFreq[token] || 0) + 1;
      }
    }

    // Calculate IDF for each word
    const idf = {};
    for (const [word, df] of Object.entries(docFreq)) {
      idf[word] = Math.log((N - df + 0.5) / (df + 0.5) + 1);
    }

    return idf;
  }

  // ── Index Builder ──────────────────────────────────────
  // Call this once when document is uploaded
  // Like building a MongoDB index — expensive once, fast forever
  index(chunks) {
    // Tokenize every chunk
    this.corpus = chunks.map((chunk) => this.tokenize(chunk));

    // Calculate average chunk length (used in scoring)
    const totalWords = this.corpus.reduce((sum, c) => sum + c.length, 0);
    this.avgDocLength = totalWords / this.corpus.length;

    // Pre-compute IDF for all words
    this.idf = this.computeIDF(this.corpus);

    return this; // allow chaining
  }

  // ── BM25 Score ─────────────────────────────────────────
  // Score a single chunk against a query
  //
  // Formula for each query term:
  // IDF(term) * (TF * (k1 + 1)) / (TF + k1 * (1 - b + b * (docLen / avgLen)))
  scoreChunk(queryTokens, chunkTokens) {
    const docLength = chunkTokens.length;
    let score = 0;

    for (const term of queryTokens) {
      // How many times does this term appear in the chunk?
      const tf = chunkTokens.filter((t) => t === term).length;

      if (tf === 0) continue; // word not in chunk — skip

      const idf = this.idf[term] || 0;

      // BM25 formula — length-normalized TF
      const numerator = tf * (this.k1 + 1);
      const denominator =
        tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));

      score += idf * (numerator / denominator);
    }

    return score;
  }

  // ── Search ─────────────────────────────────────────────
  // Score all chunks and return ranked results
  search(query, topK = 10) {
    const queryTokens = this.tokenize(query);

    const scores = this.corpus.map((chunkTokens, index) => ({
      index,
      score: this.scoreChunk(queryTokens, chunkTokens),
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK);
  }
}

export default BM25;
