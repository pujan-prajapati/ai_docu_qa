// splits a large document into overlapping chunks
// Like pagination, but for AI context windows

export const chunker = {
  // split text into chunks of 500 words with 50 word overlap

  splitIntoChunks(text, chunkSize = 500, overlap = 50) {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks = [];

    let start = 0;

    while (start < words.length) {
      const end = start + chunkSize;

      // Grap chunkSize words
      const chunkWords = words.slice(start, end);
      const chunkText = chunkWords.join(" ");

      chunks.push({
        text: chunkText,
        wordCount: chunkWords.length,
        startIndex: start,
        endIndex: Math.min(end, words.length),
      });

      // Move forward by chunkSize MINUS overlap
      // This creates the overlapping window
      start += chunkSize - overlap;
    }

    return chunks;
  },
};
