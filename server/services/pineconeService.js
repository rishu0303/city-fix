import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.index((process.env.PINECONE_INDEX || 'cityfix-complaints').trim());

// Generate Embeddings
const getEmbedding = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2' });
    const result = await model.embedContent(text);
    return Array.from(result.embedding.values).slice(0, 768);
  } catch (err) {
    console.log("⚠️ Gemini API blocked. Using deterministic local fallback...");
    const safeText = String(text || "empty");
    let vectorArray = new Array(768).fill(0.01);
    for (let i = 0; i < safeText.length; i++) {
      vectorArray[i % 768] += safeText.charCodeAt(i) / 1000;
    }
    const magnitude = Math.sqrt(vectorArray.reduce((sum, val) => sum + val * val, 0));
    return vectorArray.map(val => Number((val / magnitude).toFixed(6)) || 0);
  }
};

export const saveToPinecone = async (complaintId, text) => {
  try {
    const vector = await getEmbedding(text);

    if (!vector || vector.length !== 768) {
      throw new Error("Invalid embedding vector generated.");
    }

    console.log(`📤 Upserting record ID: ${String(complaintId)}`);
    console.log("Vector preview:", vector.length);

    // ✅ v8 syntax: object-shaped args with `records` key
    await index.upsert({
      records: [
        {
          id: String(complaintId),
          values: vector,
          metadata: { text: String(text) },
        },
      ],
    });

    console.log("✅ Successfully saved to Pinecone!");
  } catch (error) {
    console.error("❌ Pinecone SDK Upsert Error:", error.message);
  }
};

export const findDuplicate = async (text) => {
  try {
    const vector = await getEmbedding(text);

    // ✅ v8 syntax: object-shaped args for query too
    const searchResults = await index.query({
      vector: vector,
      topK: 1,
      includeMetadata: true,
    });

    if (searchResults.matches && searchResults.matches.length > 0) {
      const bestMatch = searchResults.matches[0];
      if (bestMatch.score > 0.85) {
        return bestMatch.id;
      }
    }
    return null;
  } catch (error) {
    console.error("❌ Pinecone Search Error:", error.message);
    return null;
  }
};