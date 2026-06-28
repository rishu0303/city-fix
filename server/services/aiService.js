import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeComplaint = async (description, imageBuffer, mimeType) => {
  try {
    console.log("🧠 Sending data to Gemini AI for analysis...");
    
    // We use gemini-1.5-flash as it is blazing fast and supports multimodal (text + image)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    const prompt = `
      You are an expert AI assistant for a city municipal corporation.
      Analyze this civic complaint based on the provided image and description.
      Description provided by citizen: "${description || 'No description provided.'}"

      Determine the category, severity rating (1-5), and a confidence score.
      Return ONLY a valid JSON object matching this schema exactly. Do not include markdown formatting or backticks.
      {
        "category": "Roads" | "Electrical" | "Sanitation" | "Water" | "General",
        "severityRating": number (1 to 5, where 5 is extremely severe/dangerous),
        "aiConfidenceScore": number (0 to 100),
        "title": "A short, descriptive, professional title (max 6 words)"
      }
    `;

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: mimeType
      }
    };

    // Call the AI
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text();

    // Clean up the string in case Gemini wraps it in ```json ... ```
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Parse the string into a real JavaScript object
    const aiData = JSON.parse(text);
    console.log("✅ AI Analysis Complete:", aiData);
    
    return aiData;

  } catch (error) {
    console.error("❌ Gemini AI Error:", error.message);
    return null; // Return null if AI fails, so the app doesn't crash
  }
};