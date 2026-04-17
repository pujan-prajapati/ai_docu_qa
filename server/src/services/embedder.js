import { pipeline } from "@xenova/transformers";

// Cache the model so it only loads once
let embedder = null;

const getEmbedder = async () => {
  if (!embedder) {
    console.log("Loading embedding model... (first time only)");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("Embedding model loaded");
  }

  return embedder;
};

export const embedderService = {
  // convert a single string to a vector (array of numbers)
  async embed(text) {
    const model = await getEmbedder();
    const output = await model(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  },

  // Embed multiple texts at once
  async embedBatch(texts) {
    const model = await getEmbedder();
    const results = [];

    // process one by one (batching can cause memory issues with large docs)
    for (const text of texts) {
      const output = await model(text, { pooling: "mean", normalize: true });
      results.push(Array.from(output.data));
    }

    return results;
  },
};
