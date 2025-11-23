import { GoogleGenAI } from "@google/genai";

export async function fetchCitationCount(paperTitle: string): Promise<number | null> {
  if (!process.env.API_KEY) {
    console.error("API_KEY is not set");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We use gemini-2.5-flash because it supports the googleSearch tool efficiently.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Search for the paper "${paperTitle}" on Google Scholar or academic databases. 
                 Find the approximate number of citations. 
                 Return ONLY the number (integer). If you cannot find it, return -1.`,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster simple queries
      }
    });

    const text = response.text?.trim();
    if (!text) return null;

    const count = parseInt(text.replace(/[^0-9-]/g, ''), 10);
    
    if (isNaN(count) || count === -1) return null;
    
    return count;
  } catch (error) {
    console.error("Error fetching citations:", error);
    return null;
  }
}